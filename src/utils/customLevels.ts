import { z } from 'zod';
import { parseLevelFile, type LevelCell, type LevelFile } from '../lib/LevelSchema';

const CUSTOM_LEVELS_KEY = 'platformer_custom_levels';

export interface CustomLevel {
    id: string;
    name: string;
    cols: number;
    cells: LevelCell[];
    savedAt: number;  // Date.now() at save time
}

export function loadCustomLevels(): CustomLevel[] {
    const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
    if (raw === null) return [];
    const records = z.array(z.object({
        id: z.string().min(1),
        name: z.string(),
        cols: z.number(),
        cells: z.array(z.unknown()),
        savedAt: z.number().int().nonnegative(),
    })).parse(JSON.parse(raw));
    return records.map(record => ({
        ...record,
        cells: parseLevelFile({ version: 1, number: 0, name: record.name, cols: record.cols, cells: record.cells }).cells,
    }));
}

export function saveCustomLevel(name: string, cols: number, cells: LevelCell[]): CustomLevel {
    const level = parseLevelFile({ version: 1, number: 0, name, cols, cells });
    const levels = loadCustomLevels();
    const savedAt = Date.now();
    const saved = { id: crypto.randomUUID(), name: level.name, cols: level.cols, cells: level.cells, savedAt };
    levels.push(saved);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels));
    return saved;
}

export function deleteCustomLevel(id: string): void {
    const levels = loadCustomLevels();
    if (!levels.some(level => level.id === id)) throw new Error('Saved level not found.');
    const updated = levels.filter(l => l.id !== id);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(updated));
}

/** Convert a CustomLevel into the LevelFile shape the game expects. number=0 signals a custom level. */
export function customLevelToLevelFile(level: CustomLevel): LevelFile {
    return parseLevelFile({ version: 1, number: 0, name: level.name, cols: level.cols, cells: level.cells });
}
