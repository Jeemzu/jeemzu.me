import { describe, expect, it } from "vitest";
import { advance, announcement, averageReaction, click, createState, decodeReflex, encodeReflex } from "./logic";
import { cellAt, gridLayout } from "./grid";
import { MODES } from "./config";

const first = () => 0;
describe("zAim rules", () => {
  it.each(MODES)("maps %s logical cell centers and excludes outside clicks", mode => {
    const grid = gridLayout(mode);
    for (let row = 0; row < grid.columns; row++) for (let col = 0; col < grid.columns; col++) {
      expect(cellAt(mode, grid.x + (col + 0.5) * grid.size, grid.y + (row + 0.5) * grid.size)).toBe(row * grid.columns + col);
    }
    expect(cellAt(mode, grid.x - 1, grid.y)).toBe(null);
    expect(cellAt(mode, grid.x + grid.size * grid.columns, grid.y)).toBe(null);
  });
  it("preserves the endurance countdown and starts three targets", () => {
    const state = createState("endurance");
    expect(announcement(state)).toBe("3");
    expect(click(state, 0)).toBe(null);
    advance(state, 0.7, first); expect(announcement(state)).toBe("2");
    advance(state, 0.7, first); expect(announcement(state)).toBe("1");
    advance(state, 0.7, first); expect(announcement(state)).toBe("GO!");
    advance(state, 0.5, first);
    expect(state.phase).toBe("active");
    expect(state.remaining).toBeCloseTo(12);
    expect(state.targets.filter(Boolean)).toHaveLength(3);
  });
  it("awards ten points, keeps three targets and never immediately reuses the hit cell", () => {
    const state = createState("endurance");
    advance(state, 2.6, first);
    expect(click(state, 0, first)).toBe("hit");
    expect(state.score).toBe(10);
    expect(state.targets[0]).toBe(false);
    expect(state.targets.filter(Boolean)).toHaveLength(3);
  });
  it("advances endurance stages every forty hits and adds ten seconds", () => {
    const state = createState("endurance");
    advance(state, 2.6, first);
    for (let i = 0; i < 40; i++) click(state, state.targets.findIndex(Boolean), first);
    expect(state.score).toBe(400); expect(state.stage).toBe(2);
    expect(state.stageClicks).toBe(0); expect(state.remaining).toBeCloseTo(22);
    expect(state.timeLimit).toBeCloseTo(22);
  });
  it("refills the timer bar to the remaining time at each checkpoint", () => {
    const state = createState("endurance");
    advance(state, 2.6, first);
    advance(state, 9, first);
    expect(state.remaining / state.timeLimit).toBeCloseTo(0.25);
    for (let i = 0; i < 40; i++) click(state, state.targets.findIndex(Boolean), first);
    expect(state.remaining).toBeCloseTo(13); expect(state.remaining / state.timeLimit).toBe(1);
  });
  it("handles long active frames without slowing down mode timers", () => {
    const state = createState("endurance");
    advance(state, 15, first);
    expect(state.phase).toBe("over"); expect(state.remaining).toBe(0);
  });
  it.each(["endurance", "speed"] as const)("locks %s input immediately after a miss and finishes after feedback", mode => {
    const state = createState(mode);
    if (mode === "endurance") advance(state, 2.6, first);
    else click(state, 0, first);
    const inactive = state.targets.findIndex(active => !active);
    expect(click(state, inactive)).toBe("miss");
    const score = state.score;
    expect(click(state, state.targets.findIndex(Boolean))).toBe(null);
    advance(state, 0.18, first);
    expect(state.phase).toBe("over"); expect(state.score).toBe(score);
    expect(state.targets.every(active => !active)).toBe(true);
  });
  it("runs speed immediately for ten seconds and refreshes cleared boards", () => {
    const state = createState("speed");
    expect(state.phase).toBe("active");
    for (let i = 0; i < 16; i++) expect(click(state, i)).toBe("hit");
    expect(state.score).toBe(16); expect(state.targets.every(Boolean)).toBe(true);
    advance(state, 9.99); expect(state.phase).toBe("active");
    advance(state, 0.02); expect(state.phase).toBe("over");
  });
  it("retains the reflex countdown, random delay and ignores early clicks", () => {
    const state = createState("reflex");
    advance(state, 2.9, () => 0.5);
    expect(state.phase).toBe("waiting"); expect(state.phaseTime).toBe(2);
    expect(click(state, 0)).toBe(null);
    advance(state, 2, first);
    expect(state.phase).toBe("active"); expect(state.targets[0]).toBe(true);
  });
  it("completes five reflex rounds with exact average encoding", () => {
    const state = createState("reflex");
    advance(state, 2.9, first);
    for (let round = 1; round <= 5; round++) {
      advance(state, 1, first);
      advance(state, round / 10, first);
      expect(click(state, 0, first)).toBe("hit");
      expect(announcement(state)).toBe(`${round * 100} ms`);
      advance(state, 0.9, first);
    }
    expect(state.phase).toBe("over"); expect(state.times).toEqual([100, 200, 300, 400, 500]);
    expect(state.score).toBe(9700); expect(decodeReflex(state.score)).toBe(300);
  });
  it("preserves reflex miss scores even before a completed round", () => {
    const state = createState("reflex");
    advance(state, 3.9, first);
    expect(click(state, 1)).toBe("miss");
    advance(state, 0.18);
    expect(state.phase).toBe("over"); expect(state.score).toBe(1);
    expect(decodeReflex(state.score)).toBe(9999);
  });
  it("rounds average reaction times and clamps encoded scores", () => {
    expect(averageReaction([100, 101])).toBe(101);
    expect(encodeReflex([100, 101])).toBe(9899);
    expect(encodeReflex([12000])).toBe(0);
    expect(decodeReflex(12000)).toBe(0);
  });
  it("rejects invalid cells rather than silently changing a run", () => {
    expect(() => click(createState("speed"), 16)).toThrow(RangeError);
  });
});
