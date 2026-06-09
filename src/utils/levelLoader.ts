// ─── Level file → C++ WASM bridge loader
//
// Converts a LevelFile (tile-grid format) into the sequence of C++ API calls
// expected by WasmGameContainer:
//   level_begin()
//   level_add_spike(worldX)
//   level_add_pit(worldX, width)
//   level_add_platform(worldX, worldY, width, height)
//   level_end()
//   level_set_finish(worldX)   ← called after level_end if a finish cell exists

import { type LevelFile, type CellType } from '../lib/LevelSchema';

export const TILE = 32;
export const GROUND_Y = 640;

// worldX / worldY helpers

export function colToWorldX(col: number): number {
    return col * TILE;
}

// Distance from GROUND_Y to the TOP surface of the platform tile.
export function rowToWorldY(row: number): number {
    return GROUND_Y - row * TILE;
}

// Merge contiguous columns at a given row into spans
interface ColSpan {
    startCol: number;
    endCol: number;
}

function colsAtRow(cells: LevelFile['cells'], type: CellType, targetRow: number): number[] {
    return cells
        .filter(c => c.row === targetRow && c.type === type)
        .map(c => c.col)
        .sort((a, b) => a - b);
}

function colsForType(cells: LevelFile['cells'], type: 'pit' | 'platform'): Map<number, number[]> {
    const byRow = new Map<number, number[]>();
    for (const c of cells) {
        if (c.type !== type) continue;
        const row = byRow.get(c.row) ?? [];
        row.push(c.col);
        byRow.set(c.row, row);
    }
    for (const [row, cols] of byRow) {
        byRow.set(row, cols.sort((a, b) => a - b));
    }
    return byRow;
}

function mergeContiguous(cols: number[]): ColSpan[] {
    if (cols.length === 0) return [];
    const spans: ColSpan[] = [];
    let start = cols[0];
    let prev = cols[0];
    for (let i = 1; i < cols.length; i++) {
        if (cols[i] === prev + 1) {
            prev = cols[i];
        } else {
            spans.push({ startCol: start, endCol: prev });
            start = cols[i];
            prev = cols[i];
        }
    }
    spans.push({ startCol: start, endCol: prev });
    return spans;
}

// Public API 

/**
 * Returned by buildLevelCommands — a plain description of what to call
 * so that WasmGameContainer (or tests) can apply the calls.
 */
export type LevelCommand =
    | { cmd: 'begin' }
    | { cmd: 'spike'; worldX: number; worldY: number }
    | { cmd: 'pit'; worldX: number; width: number }
    | { cmd: 'platform'; worldX: number; worldY: number; width: number; height: number }
    | { cmd: 'end' }
    | { cmd: 'set_finish'; worldX: number };

/**
 * Convert a LevelFile into an ordered sequence of C++ bridge commands.
 * The caller (WasmGameContainer) maps each command to its cwrap call.
 */
export function buildLevelCommands(level: LevelFile): LevelCommand[] {
    const cmds: LevelCommand[] = [];
    cmds.push({ cmd: 'begin' });

    // colsForType only handles 'pit' | 'platform', so collect spikes manually
    const spikeRowMap = new Map<number, number[]>();
    for (const c of level.cells) {
        if (c.type !== 'spike') continue;
        const cols = spikeRowMap.get(c.row) ?? [];
        cols.push(c.col);
        spikeRowMap.set(c.row, cols);
    }
    for (const [row, cols] of spikeRowMap) {
        // worldY = distance above GROUND_Y to the TOP of the cell the spike sits on.
        // The spike base is at the bottom of that cell, i.e. one TILE lower.
        const worldY = rowToWorldY(row + 1); // base_y offset = GROUND_Y - worldY
        for (const col of cols.sort((a, b) => a - b)) {
            cmds.push({ cmd: 'spike', worldX: colToWorldX(col), worldY });
        }
    }

    // ── Pits (row 10 — contiguous cols merged into one pit each) 
    const pitCols = colsAtRow(level.cells, 'pit', 10);
    for (const span of mergeContiguous(pitCols)) {
        cmds.push({
            cmd: 'pit',
            worldX: colToWorldX(span.startCol),
            width: (span.endCol - span.startCol + 1) * TILE,
        });
    }

    // ── Platforms (rows 8–9 — merge per row) 
    const platformsByRow = colsForType(level.cells, 'platform');
    for (const [row, cols] of platformsByRow) {
        const worldY = rowToWorldY(row);     // distance from GROUND_Y to top surface
        const height = TILE;                 // always 1 tile thick
        for (const span of mergeContiguous(cols)) {
            cmds.push({
                cmd: 'platform',
                worldX: colToWorldX(span.startCol),
                worldY,
                width: (span.endCol - span.startCol + 1) * TILE,
                height,
            });
        }
    }

    cmds.push({ cmd: 'end' });

    // ── Finish line (any finish cell — only col matters for worldX) 
    const finishCell = level.cells.find(c => c.type === 'finish');
    if (finishCell) {
        // Place the finish threshold at the LEFT edge of the finish tile column
        cmds.push({ cmd: 'set_finish', worldX: colToWorldX(finishCell.col) });
    }

    return cmds;
}

// ─── Manifest fetcher 

import { type LevelManifest, type LevelFile as LF } from '../lib/LevelSchema';

export async function fetchManifest(): Promise<LevelManifest> {
    const res = await fetch('/levels/manifest.json');
    if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
    return res.json() as Promise<LevelManifest>;
}

export async function fetchLevelFile(filename: string): Promise<LF> {
    const res = await fetch(`/levels/${filename}`);
    if (!res.ok) throw new Error(`Failed to load level ${filename}: ${res.status}`);
    return res.json() as Promise<LF>;
}
