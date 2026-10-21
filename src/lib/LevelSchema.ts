import { z } from 'zod';

// Keep dimensions in sync with cpp/platformer/main.cpp.
export const TILE = 32;
export const GROUND_Y = 640;
export const SW = 960;
export const SH = 720;
export const ROWS = Math.ceil(SH / TILE);
export const GROUND_ROW = GROUND_Y / TILE;
export const MIN_COLS = Math.ceil(SW / TILE);
export const MAX_COLS = 400;
export const DEFAULT_COLS = 100;
export const MAX_CELLS = GROUND_ROW * MAX_COLS;

export const cellTypeSchema = z.enum(['platform', 'spike', 'pit', 'finish']);
export type CellType = z.infer<typeof cellTypeSchema>;
export type EditorTool = CellType | 'eraser';

export function isValidPlacement(tool: EditorTool, row: number): boolean {
    if (!Number.isInteger(row) || row < 0 || row >= ROWS) return false;
    if (tool === 'eraser') return true;
    if (tool === 'platform') return row >= 1 && row < GROUND_ROW;
    if (tool === 'spike') return row >= 1 && row <= GROUND_ROW;
    return row === GROUND_ROW;
}

export const cellPositionSchema = z.object({
    row: z.number().int().min(0).max(ROWS - 1),
    col: z.number().int().min(0).max(MAX_COLS - 1),
}).strict();

export const levelCellSchema = cellPositionSchema.extend({
    type: cellTypeSchema,
}).refine(cell => isValidPlacement(cell.type, cell.row), {
    message: 'Platforms require rows 1-19; spikes 1-20; pits and finish row 20.',
    path: ['row'],
});

export const levelFileSchema = z.object({
    version: z.literal(1),
    number: z.number().int().min(0),
    name: z.string(),
    cols: z.number().int().min(MIN_COLS).max(MAX_COLS),
    cells: z.array(levelCellSchema).max(MAX_CELLS),
}).strict().superRefine((level, ctx) => {
    const occupied = new Set<string>();
    let finishes = 0;
    level.cells.forEach((cell, index) => {
        if (cell.col >= level.cols) {
            ctx.addIssue({ code: 'custom', path: ['cells', index, 'col'], message: 'Cell is outside the level width.' });
        }
        const key = `${cell.row},${cell.col}`;
        if (occupied.has(key)) {
            ctx.addIssue({ code: 'custom', path: ['cells', index], message: 'Duplicate cell coordinate.' });
        }
        occupied.add(key);
        if (cell.type === 'finish' && ++finishes > 1) {
            ctx.addIssue({ code: 'custom', path: ['cells', index], message: 'Only one finish is allowed.' });
        }
    });
});

export type LevelCell = z.infer<typeof levelCellSchema>;
export type LevelFile = z.infer<typeof levelFileSchema>;

export function parseLevelFile(value: unknown): LevelFile {
    const result = levelFileSchema.safeParse(value);
    if (!result.success) throw new Error(formatLevelIssues(result.error));
    return result.data;
}

export function formatLevelIssues(error: z.ZodError): string {
    return error.issues.slice(0, 8).map(issue =>
        `${issue.path.join('.') || 'level'}: ${issue.message}`,
    ).join('\n');
}

export function getLevelWarnings(level: LevelFile): string[] {
    return level.cells.some(cell => cell.type === 'finish')
        ? []
        : ['No finish tile: the game uses its fallback finish, not the level width.'];
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

export const manifestEntrySchema = z.object({
    number: z.number().int().min(1),
    name: z.string(),
    /** File name under /levels/, e.g. "2.json" */
    file: z.string().regex(/^[A-Za-z0-9_-]+\.json$/),
}).strict();

export const levelManifestSchema = z.object({
    levels: z.array(manifestEntrySchema),
}).strict();

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type LevelManifest = z.infer<typeof levelManifestSchema>;
