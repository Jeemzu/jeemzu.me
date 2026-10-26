import { describe, expect, it } from "vitest";
import { pickVariant } from "./AudioEngine";

describe("audio variants", () => {
  it("handles a single variant", () => {
    expect(pickVariant(1, 0)).toBe(0);
  });
  it("allows every variant on the first play", () => {
    expect([0, 0.21, 0.41, 0.61, 0.81].map((r) => pickVariant(5, -1, () => r))).toEqual([0, 1, 2, 3, 4]);
  });
  it.each([0, 1, 2, 3, 4])("never repeats previous index %s", (last) => {
    const picks = [0, 0.26, 0.51, 0.76].map((r) => pickVariant(5, last, () => r));
    expect(picks).not.toContain(last);
    expect(new Set(picks).size).toBe(4);
    expect(picks.every((index) => index >= 0 && index < 5)).toBe(true);
  });
});
