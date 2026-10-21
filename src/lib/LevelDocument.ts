import { z } from 'zod';
import {
    cellPositionSchema, cellTypeSchema, DEFAULT_COLS, GROUND_ROW, MAX_CELLS,
    MAX_COLS, MIN_COLS, ROWS, getLevelWarnings, levelCellSchema, parseLevelFile,
    type LevelCell, type LevelFile,
} from './LevelSchema';

const regionShape = {
    fromRow: z.number().int().min(0).max(ROWS - 1),
    toRow: z.number().int().min(0).max(ROWS - 1),
    fromCol: z.number().int().min(0).max(MAX_COLS - 1),
    toCol: z.number().int().min(0).max(MAX_COLS - 1),
};

export const editOperationSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('set_cells'), cells: z.array(cellPositionSchema.extend({ type: cellTypeSchema })).max(MAX_CELLS) }).strict(),
    z.object({ op: z.literal('erase_cells'), cells: z.array(cellPositionSchema).max(MAX_CELLS) }).strict(),
    z.object({ op: z.literal('fill_region'), ...regionShape, type: cellTypeSchema.exclude(['finish']) }).strict(),
    z.object({ op: z.literal('erase_region'), ...regionShape }).strict(),
    z.object({ op: z.literal('set_finish'), col: z.number().int().min(0).max(MAX_COLS - 1) }).strict(),
    z.object({ op: z.literal('set_metadata'), name: z.string().optional(), number: z.number().int().min(1).optional() }).strict(),
    z.object({ op: z.literal('resize'), cols: z.number().int().min(MIN_COLS).max(MAX_COLS), crop: z.boolean().default(false) }).strict(),
    z.object({ op: z.literal('clear_cells') }).strict(),
]);
export const editBatchSchema = z.array(editOperationSchema).min(1).max(100);
export type EditOperation = z.input<typeof editOperationSchema>;

export interface EditorSnapshot {
    level: LevelFile;
    revision: number;
    canUndo: boolean;
    canRedo: boolean;
}

export interface EditResult {
    revision: number;
    changedCells: number;
    bounds: { fromRow: number; toRow: number; fromCol: number; toCol: number } | null;
    warnings: string[];
}

function cellKey(cell: { row: number; col: number }): string {
    return `${cell.row},${cell.col}`;
}

function freezeLevel(value: unknown): LevelFile {
    const level = parseLevelFile(value);
    level.cells.sort((a, b) => a.row - b.row || a.col - b.col);
    level.cells.forEach(Object.freeze);
    Object.freeze(level.cells);
    return Object.freeze(level);
}

export class LevelDocument {
    private snapshot: EditorSnapshot;
    private readonly listeners = new Set<() => void>();
    private readonly past: LevelFile[] = [];
    private readonly future: LevelFile[] = [];
    private strokeStart: LevelFile | null = null;

    constructor(level: unknown = { version: 1, number: 1, name: '', cols: DEFAULT_COLS, cells: [] }) {
        this.snapshot = { level: freezeLevel(level), revision: 0, canUndo: false, canRedo: false };
    }

    getSnapshot = (): EditorSnapshot => this.snapshot;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    beginStroke(): void {
        this.strokeStart ??= this.snapshot.level;
    }

    endStroke(): void {
        this.strokeStart = null;
    }

    assertRevision(expectedRevision: number): void {
        if (expectedRevision !== this.snapshot.revision) {
            throw new Error(`Revision conflict: expected ${expectedRevision}, current ${this.snapshot.revision}. Read the draft again.`);
        }
    }

    edit(input: unknown, expectedRevision = this.snapshot.revision): EditResult {
        this.assertRevision(expectedRevision);
        const operations = editBatchSchema.parse(input);
        const draft = { ...this.snapshot.level };
        const cells = new Map(draft.cells.map(cell => [cellKey(cell), cell]));
        const setCell = (cell: LevelCell) => {
            levelCellSchema.parse(cell);
            if (cell.col >= draft.cols) throw new Error('Cell is outside the level width.');
            if (cell.type === 'finish') {
                for (const [key, existing] of cells) if (existing.type === 'finish') cells.delete(key);
            }
            cells.set(cellKey(cell), cell);
        };
        for (const operation of operations) {
            switch (operation.op) {
                case 'set_cells':
                    operation.cells.forEach(setCell);
                    break;
                case 'erase_cells':
                    for (const cell of operation.cells) {
                        if (cell.col >= draft.cols) throw new Error('Cell is outside the level width.');
                        cells.delete(cellKey(cell));
                    }
                    break;
                case 'fill_region':
                case 'erase_region':
                    if (operation.fromRow > operation.toRow || operation.fromCol > operation.toCol) {
                        throw new Error('Region start must not exceed its end.');
                    }
                    if (operation.toCol >= draft.cols) throw new Error('Region is outside the level width.');
                    for (let row = operation.fromRow; row <= operation.toRow; row++) {
                        for (let col = operation.fromCol; col <= operation.toCol; col++) {
                            if (operation.op === 'fill_region') setCell({ row, col, type: operation.type });
                            else cells.delete(cellKey({ row, col }));
                        }
                    }
                    break;
                case 'set_finish':
                    setCell({ row: GROUND_ROW, col: operation.col, type: 'finish' });
                    break;
                case 'set_metadata':
                    if (operation.name !== undefined) draft.name = operation.name;
                    if (operation.number !== undefined) draft.number = operation.number;
                    break;
                case 'resize': {
                    const outside = [...cells.values()].filter(cell => cell.col >= operation.cols);
                    if (outside.length && !operation.crop) {
                        throw new Error(`Resize would exclude ${outside.length} cells. Explicit cropping is required.`);
                    }
                    outside.forEach(cell => cells.delete(cellKey(cell)));
                    draft.cols = operation.cols;
                    break;
                }
                case 'clear_cells':
                    cells.clear();
                    break;
            }
        }
        return this.commit(freezeLevel({ ...draft, cells: [...cells.values()] }));
    }

    replace(input: unknown, expectedRevision = this.snapshot.revision): EditResult {
        this.assertRevision(expectedRevision);
        this.endStroke();
        return this.commit(freezeLevel(input));
    }

    undo(expectedRevision = this.snapshot.revision): EditResult {
        this.assertRevision(expectedRevision);
        this.endStroke();
        const previous = this.past.pop();
        if (!previous) throw new Error('Nothing to undo.');
        this.future.push(this.snapshot.level);
        return this.publish(previous);
    }

    redo(expectedRevision = this.snapshot.revision): EditResult {
        this.assertRevision(expectedRevision);
        this.endStroke();
        const next = this.future.pop();
        if (!next) throw new Error('Nothing to redo.');
        this.past.push(this.snapshot.level);
        return this.publish(next);
    }

    private commit(level: LevelFile): EditResult {
        if (JSON.stringify(level) === JSON.stringify(this.snapshot.level)) {
            return { revision: this.snapshot.revision, changedCells: 0, bounds: null, warnings: getLevelWarnings(level) };
        }
        if (!this.strokeStart || this.strokeStart === this.snapshot.level) {
            this.past.push(this.snapshot.level);
            if (this.past.length > 100) this.past.shift();
        }
        this.future.length = 0;
        return this.publish(level);
    }

    private publish(level: LevelFile): EditResult {
        const before = new Map(this.snapshot.level.cells.map(cell => [cellKey(cell), cell]));
        const after = new Map(level.cells.map(cell => [cellKey(cell), cell]));
        const changed = [...new Set([...before.keys(), ...after.keys()])]
            .filter(key => before.get(key)?.type !== after.get(key)?.type)
            .map(key => after.get(key) ?? before.get(key)!);
        const bounds = changed.length ? {
            fromRow: Math.min(...changed.map(cell => cell.row)),
            toRow: Math.max(...changed.map(cell => cell.row)),
            fromCol: Math.min(...changed.map(cell => cell.col)),
            toCol: Math.max(...changed.map(cell => cell.col)),
        } : null;
        this.snapshot = Object.freeze({
            level, revision: this.snapshot.revision + 1,
            canUndo: this.past.length > 0, canRedo: this.future.length > 0,
        });
        this.listeners.forEach(listener => listener());
        return { revision: this.snapshot.revision, changedCells: changed.length, bounds, warnings: getLevelWarnings(level) };
    }
}
