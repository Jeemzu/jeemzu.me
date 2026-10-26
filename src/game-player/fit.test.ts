import { afterEach, describe, expect, it, vi } from "vitest";
import { currentDpr, fitStage } from "./fit";

afterEach(() => vi.unstubAllGlobals());

describe("stage fitting", () => {
  const logical = { width: 800, height: 600 };
  it.each([
    [1600, 900, 0, { width: 1200, height: 900 }],
    [700, 500, 16, { width: 624, height: 468 }],
    [400, 900, 0, { width: 400, height: 300 }],
    [0, 900, 0, { width: 0, height: 0 }],
    [30, 30, 16, { width: 0, height: 0 }],
  ])("letterboxes %sx%s with %s padding", (width, height, padding, expected) => {
    expect(fitStage(width, height, logical, padding)).toEqual(expected);
  });
  it.each([[1366, 768], [1920, 1080], [700, 500], [320, 240]])("never clips at %sx%s", (width, height) => {
    const fitted = fitStage(width, height, logical, 16);
    expect(fitted.width + 32).toBeLessThanOrEqual(width);
    expect(fitted.height + 32).toBeLessThanOrEqual(height);
    expect(Math.abs(fitted.width - fitted.height * 4 / 3)).toBeLessThan(2);
  });
  it.each([1, 1.25, 1.5, 2, 3, 4])("uses the native pixel ratio %s without undersampling", (dpr) => {
    vi.stubGlobal("window", { devicePixelRatio: dpr });
    expect(currentDpr()).toBe(dpr);
  });
});
