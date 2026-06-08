import { type LevelCell, type LevelFile } from '../lib/LevelSchema';

const CUSTOM_LEVELS_KEY = 'platformer_custom_levels';

export interface CustomLevel {
    id: string;       // unique key (timestamp string)
    name: string;
    cols: number;
    cells: LevelCell[];
    savedAt: number;  // Date.now() at save time
}

export function loadCustomLevels(): CustomLevel[] {
    try {
        const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
        return raw ? (JSON.parse(raw) as CustomLevel[]) : [];
    } catch {
        return [];
    }
}

export function saveCustomLevel(name: string, cols: number, cells: LevelCell[]): void {
    const levels = loadCustomLevels();
    const savedAt = Date.now();
    levels.push({ id: String(savedAt), name, cols, cells, savedAt });
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels));
}

export function deleteCustomLevel(id: string): void {
    const updated = loadCustomLevels().filter(l => l.id !== id);
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(updated));
}

/** Convert a CustomLevel into the LevelFile shape the game expects. number=0 signals a custom level. */
export function customLevelToLevelFile(level: CustomLevel): LevelFile {
    return { version: 1, number: 0, name: level.name, cols: level.cols, cells: level.cells };
}
