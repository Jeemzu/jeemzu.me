import type { RPGSaveData } from '../types';
import { SAVE_VERSION } from '../types';

const SAVE_KEY = 'rpg_save';

function isValidSave(data: unknown): data is RPGSaveData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;

    if (typeof d.version !== 'number') return false;
    if (!d.character || typeof d.character !== 'object') return false;
    if (!d.inventory || !Array.isArray(d.inventory)) return false;
    if (!d.equipment || typeof d.equipment !== 'object') return false;
    if (typeof d.gold !== 'number') return false;
    if (!d.progress || typeof d.progress !== 'object') return false;

    const char = d.character as Record<string, unknown>;
    if (typeof char.name !== 'string' || !char.name) return false;
    if (typeof char.classId !== 'string') return false;
    if (typeof char.level !== 'number') return false;
    if (typeof char.currentHP !== 'number') return false;
    if (!char.stats || typeof char.stats !== 'object') return false;
    if (!char.statXP || typeof char.statXP !== 'object') return false;

    return true;
}

function migrateSave(data: RPGSaveData): RPGSaveData {
    // eslint-disable-next-line prefer-const
    let migrated = { ...data };

    // Future migrations: if (migrated.version === 1) { upgrade to v2... migrated.version = 2; }

    migrated.version = SAVE_VERSION;
    return migrated;
}

export function loadSave(): RPGSaveData | null {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (!isValidSave(parsed)) {
            console.warn('[The Progenitors] Save data failed validation — clearing corrupted save.');
            localStorage.removeItem(SAVE_KEY);
            return null;
        }

        if (parsed.version !== SAVE_VERSION) {
            return migrateSave(parsed);
        }

        return parsed;
    } catch (e) {
        console.warn('[The Progenitors] Failed to parse save data:', e);
        localStorage.removeItem(SAVE_KEY);
        return null;
    }
}

export function writeSave(data: RPGSaveData): void {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('[The Progenitors] Failed to write save data:', e);
    }
}

export function deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
}
