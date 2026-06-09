// ─── Level file schema (v1) ───────────────────────────────────────────────────
//
// Grid coordinate system (must match C++ constants):
//   TILE = 32 px   GROUND_Y = 320   SW = 800   SH = 400
//
// Rows (0-indexed top-to-bottom):
//   0–7   unreachable (above max-jump altitude of 81 px)
//   8–9   platform zone  (row 8 → worldY = 64; row 9 → worldY = 32)
//   10    ground surface — where spikes, pits and the finish tile live
//   11–12 underground fill (always solid, not paintable)
//
// Cols (0-indexed left-to-right):
//   worldX = col * TILE
//
// Cell types:
//   'platform' — only valid in rows 8–9
//   'spike'    — only valid in row 10 (sits on ground, 32×40 px triangle)
//   'pit'      — only valid in row 10 (ground is absent at this column)
//   'finish'   — only valid in row 10 (triggers level completion)

export type CellType = 'platform' | 'spike' | 'pit' | 'finish';

export interface LevelCell {
    row: number;   // 0-indexed from top
    col: number;   // 0-indexed from left
    type: CellType;
}

export interface LevelFile {
    version: 1;
    number: number;
    name: string;
    /** Total level width in tiles (minimum 26 = one screen) */
    cols: number;
    cells: LevelCell[];
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

export interface ManifestEntry {
    number: number;
    name: string;
    /** Relative URL under /levels/, e.g. "level-001.json" */
    file: string;
}

export interface LevelManifest {
    levels: ManifestEntry[];
}
