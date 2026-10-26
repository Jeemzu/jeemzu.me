import { describe, expect, it } from "vitest";
import { FOOD_SCORE, GRID_SIZE, INITIAL_DELAY, MIN_DELAY, SPEED_INCREMENT } from "./config";
import { createState, placeFood, step, turn, type Cell } from "./logic";
import { keyDirection } from "./input";

describe("Snake rules", () => {
  it("starts centered with three segments moving right", () => {
    const state = createState(() => 0);
    expect(state).toMatchObject({
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      direction: "right", nextDirection: "right", moveDelay: INITIAL_DELAY, score: 0, status: "playing",
    });
    expect(state.snake).not.toContainEqual(state.food);
  });
  it("moves without growing or mutating the previous state", () => {
    const state = createState(() => 0);
    const next = step(state);
    expect(next.snake).toEqual([{ x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 }]);
    expect(state.snake[0]).toEqual({ x: 10, y: 10 });
    expect(next.score).toBe(0);
  });
  it("rejects reversal even after a queued turn", () => {
    const state = createState();
    expect(turn(state, "left")).toBe(state);
    expect(turn(turn(state, "up"), "left").nextDirection).toBe("up");
    expect(step(turn(state, "up")).snake[0]).toEqual({ x: 10, y: 9 });
  });
  it("grows, scores ten, accelerates, and respawns food outside the body", () => {
    const state = { ...createState(), food: { x: 11, y: 10 } };
    const next = step(state, () => 0);
    expect(next.snake).toHaveLength(4);
    expect(next.score).toBe(FOOD_SCORE);
    expect(next.moveDelay).toBeCloseTo(INITIAL_DELAY - SPEED_INCREMENT);
    expect(next.snake).not.toContainEqual(next.food);
  });
  it("caps speed at 50 ms per move", () => {
    const state = { ...createState(), food: { x: 11, y: 10 }, moveDelay: MIN_DELAY };
    expect(step(state).moveDelay).toBe(MIN_DELAY);
  });
  it.each([
    { x: GRID_SIZE - 1, y: 3, direction: "right" as const },
    { x: 0, y: 3, direction: "left" as const },
    { x: 3, y: 0, direction: "up" as const },
    { x: 3, y: GRID_SIZE - 1, direction: "down" as const },
  ])("ends at the $direction wall", ({ x, y, direction }) => {
    const state = { ...createState(), snake: [{ x, y }], direction, nextDirection: direction };
    expect(step(state).status).toBe("lost");
  });
  it("ends on a body collision", () => {
    const state = { ...createState(), snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 2 }] };
    expect(step(state).status).toBe("lost");
  });
  it("allows entering the cell the tail vacates", () => {
    const state = { ...createState(), snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }] };
    const next = step(state);
    expect(next.status).toBe("playing");
    expect(next.snake[0]).toEqual({ x: 3, y: 2 });
  });
  it("does not advance or turn a finished game", () => {
    const state = { ...createState(), status: "lost" as const };
    expect(step(state)).toBe(state);
    expect(turn(state, "up")).toBe(state);
  });
  it("finds the last empty cell and finishes a full board without looping", () => {
    const all: Cell[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) all.push({ x, y });
    }
    expect(placeFood(all)).toBeNull();
    const snake = all.filter((cell) => cell.x !== 1 || cell.y !== 0);
    expect(placeFood(snake)).toEqual({ x: 1, y: 0 });
    const state = { ...createState(), snake, food: { x: 1, y: 0 } };
    const next = step(state);
    expect(next).toMatchObject({ status: "won", food: null, score: 10 });
    expect(next.snake).toHaveLength(GRID_SIZE * GRID_SIZE);
  });
  it("can choose the first and last free cells", () => {
    const snake = createState().snake;
    expect(placeFood(snake, () => 0)).toEqual({ x: 0, y: 0 });
    expect(placeFood(snake, () => 0.99999)).toEqual({ x: 19, y: 19 });
  });
});

describe("Snake keyboard mapping", () => {
  it.each([
    ["ArrowUp", "up"], ["KeyW", "up"], ["ArrowDown", "down"], ["KeyS", "down"],
    ["ArrowLeft", "left"], ["KeyA", "left"], ["ArrowRight", "right"], ["KeyD", "right"],
  ])("maps %s to %s", (code, direction) => {
    expect(keyDirection(code)).toBe(direction);
  });
  it("ignores unrelated keys", () => {
    expect(keyDirection("Space")).toBeUndefined();
  });
});
