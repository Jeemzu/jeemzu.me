import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LevelFile } from "../../lib/LevelSchema";

const manifest = {
  levels: [
    { number: 2, file: "2.json", name: "Two" },
    { number: 1, file: "1.json", name: "One" },
  ],
};
const file = (number: number, name: string): LevelFile => ({ version: 1, number, name, cols: 40, cells: [] });

vi.mock("../../utils/levelLoader", () => ({
  fetchManifest: vi.fn(async () => manifest),
  fetchLevelFile: vi.fn(async (name: string) => file(parseInt(name, 10), `L${name}`)),
}));
vi.mock("../../utils/customLevels", () => ({
  loadCustomLevels: () => [{ id: "abc", name: "Mine", cols: 40, cells: [], createdAt: 0 }],
  customLevelToLevelFile: (l: { name: string; cols: number }) => ({ version: 1, number: 0, name: l.name, cols: l.cols, cells: [] }),
}));

const { highestCompleted, markCompleted, isUnlocked, nextOfficial, resolveLevel, levelLabel } = await import("./levels");

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});

describe("impossible levels", () => {
  it("tracks the highest completed level without regressing", () => {
    expect(highestCompleted()).toBe(0);
    markCompleted(2);
    markCompleted(1);
    expect(highestCompleted()).toBe(2);
  });

  it("unlocks level 1 and each level after its predecessor", () => {
    expect(isUnlocked(1, 0)).toBe(true);
    expect(isUnlocked(2, 0)).toBe(false);
    expect(isUnlocked(2, 1)).toBe(true);
  });

  it("finds the next official level by number", () => {
    expect(nextOfficial(manifest.levels, 1)).toBe(2);
    expect(nextOfficial(manifest.levels, 2)).toBeNull();
  });

  it("resolves official levels and rejects locked ones", async () => {
    const one = await resolveLevel({ kind: "official", number: 1 });
    expect(one).toMatchObject({ official: 1, next: 2 });
    expect(levelLabel(one)).toBe("1. L1.json");
    await expect(resolveLevel({ kind: "official", number: 2 })).rejects.toThrow(/locked/);
    await expect(resolveLevel({ kind: "official", number: 9 })).rejects.toThrow(/manifest/);
    markCompleted(1);
    await expect(resolveLevel({ kind: "official", number: 2 })).resolves.toMatchObject({ official: 2, next: null });
  });

  it("resolves draft and custom levels without progression", async () => {
    const draft = file(5, "Draft");
    await expect(resolveLevel({ kind: "draft", file: draft })).resolves.toEqual({ file: draft, official: null, next: null });
    const custom = await resolveLevel({ kind: "custom", id: "abc" });
    expect(levelLabel(custom)).toBe("Mine");
    await expect(resolveLevel({ kind: "custom", id: "missing" })).rejects.toThrow(/not found/);
  });
});
