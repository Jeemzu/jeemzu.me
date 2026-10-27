import type { LevelFile, ManifestEntry } from "../../lib/LevelSchema";
import { customLevelToLevelFile, loadCustomLevels } from "../../utils/customLevels";
import { fetchLevelFile, fetchManifest } from "../../utils/levelLoader";

export type LevelChoice =
  | { kind: "official"; number: number }
  | { kind: "custom"; id: string }
  /** Unsaved level handed over by the editor for play-testing. */
  | { kind: "draft"; file: LevelFile };

export interface ImpossibleOptions {
  level: LevelChoice;
}

export interface ResolvedLevel {
  file: LevelFile;
  /** Official level number, or null for custom/draft levels. */
  official: number | null;
  /** Next official level, when one exists and this is an official level. */
  next: number | null;
}

const STORAGE_KEY = "platformer_highest_completed";

export function highestCompleted(): number {
  const value = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function markCompleted(level: number): void {
  if (level > highestCompleted()) localStorage.setItem(STORAGE_KEY, String(level));
}

export const isUnlocked = (level: number, highest: number) => level === 1 || highest >= level - 1;

export const sortedEntries = (entries: ManifestEntry[]) => [...entries].sort((a, b) => a.number - b.number);

export function nextOfficial(entries: ManifestEntry[], current: number): number | null {
  return sortedEntries(entries).find((e) => e.number > current)?.number ?? null;
}

export async function resolveLevel(choice: LevelChoice): Promise<ResolvedLevel> {
  switch (choice.kind) {
    case "draft":
      return { file: choice.file, official: null, next: null };
    case "custom": {
      const saved = loadCustomLevels().find((l) => l.id === choice.id);
      if (!saved) throw new Error("Saved level not found.");
      return { file: customLevelToLevelFile(saved), official: null, next: null };
    }
    case "official": {
      const entries = (await fetchManifest()).levels;
      const entry = entries.find((e) => e.number === choice.number);
      if (!entry) throw new Error(`Level ${choice.number} is not in the manifest.`);
      if (!isUnlocked(entry.number, highestCompleted())) throw new Error(`Level ${entry.number} is locked.`);
      return { file: await fetchLevelFile(entry.file), official: entry.number, next: nextOfficial(entries, entry.number) };
    }
  }
}

export const levelLabel = (level: ResolvedLevel) =>
  level.official !== null ? `${level.official}. ${level.file.name}` : level.file.name || "Custom";
