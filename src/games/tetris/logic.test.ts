import { describe, expect, it } from "vitest";
import { COLS, gravityInterval, ROWS } from "./config";
import { cells, createState, drop, emptyRow, ghost, hardDrop, lock, move, rotate, valid, type ActivePiece } from "./logic";
import { PIECE_TYPES } from "./pieces";

describe("Tetris rules", () => {
  it("starts with a 10x20 empty board and a fully visible I piece", () => {
    const state = createState(() => 0);
    expect(state.board).toHaveLength(ROWS);
    expect(state.board.every((row) => row.length === COLS && row.every((cell) => cell === null))).toBe(true);
    expect(cells(state.active!)).toEqual([3, 4, 5, 6].map((col) => ({ row: 0, col })));
    expect(state).toMatchObject({ score: 0, level: 1, lines: 0, next: "I", status: "playing" });
  });
  it.each(PIECE_TYPES)("has four cells in each %s rotation and returns to its start", (type) => {
    let state = { ...createState(), active: { type, rotation: 0, row: 5, col: 3 } };
    const original = cells(state.active);
    for (let i = 0; i < 4; i++) {
      expect(new Set(cells(state.active).map(({ row, col }) => `${row}-${col}`)).size).toBe(4);
      const next = rotate(state);
      expect(next.active).not.toBeNull();
      state = { ...next, active: next.active! };
    }
    expect(cells(state.active)).toEqual(original);
  });
  it("does not mutate a board or active piece during movement", () => {
    const state = createState(() => 0);
    const original = state.active;
    const next = move(state, 0, 1);
    expect(next.active?.col).toBe(4);
    expect(state.active).toBe(original);
    expect(state.active?.col).toBe(3);
    expect(next.board).toBe(state.board);
  });
  it("blocks walls, floor, and occupied cells", () => {
    const state = createState(() => 0);
    expect(valid(state.board, { ...state.active!, col: -1 })).toBe(false);
    expect(valid(state.board, { ...state.active!, col: 7 })).toBe(false);
    expect(valid(state.board, { ...state.active!, row: 19 })).toBe(false);
    const board = state.board.map((row) => [...row]);
    board[0][3] = "O";
    expect(valid(board, state.active!)).toBe(false);
  });
  it("uses SRS floor kicks for T", () => {
    const state = { ...createState(), active: { type: "T" as const, rotation: 0, row: 18, col: 3 } };
    const next = rotate(state);
    expect(next.active).toMatchObject({ rotation: 1, row: 17, col: 2 });
    expect(valid(next.board, next.active!)).toBe(true);
  });
  it("uses distinct SRS wall kicks for I", () => {
    const state = { ...createState(), active: { type: "I" as const, rotation: 1, row: 3, col: -2 } };
    expect(valid(state.board, state.active)).toBe(true);
    expect(rotate(state).active).toMatchObject({ rotation: 2, col: 0 });
  });
  it("kicks a T away from the left wall", () => {
    const state = { ...createState(), active: { type: "T" as const, rotation: 1, row: 3, col: -1 } };
    expect(valid(state.board, state.active)).toBe(true);
    expect(rotate(state).active).toMatchObject({ rotation: 2, col: 0 });
  });
  it("rejects rotation when all kick candidates are blocked", () => {
    const active: ActivePiece = { type: "T", rotation: 0, row: 5, col: 3 };
    const board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "O" as const));
    const open = board.map((row) => [...row] as ("O" | null)[]);
    for (const { row, col } of cells(active)) open[row][col] = null;
    const state = { ...createState(), active, board: open };
    expect(rotate(state)).toBe(state);
  });
  it("places the ghost at the floor and awards two points per hard-drop row", () => {
    const state = createState(() => 0);
    expect(ghost(state)?.row).toBe(18);
    const result = hardDrop(state, () => 0);
    expect(result).toMatchObject({ locked: true, clearedRows: [], state: { score: 38, status: "playing" } });
    expect(result.state.board[19].slice(3, 7)).toEqual(["I", "I", "I", "I"]);
    expect(state.board[19].every((cell) => cell === null)).toBe(true);
  });
  it("awards no points for a soft/gravity drop and locks on contact", () => {
    const state = createState(() => 0);
    expect(drop(state).state.score).toBe(0);
    const grounded = { ...state, active: ghost(state) };
    expect(drop(grounded).locked).toBe(true);
  });
  it.each([[1, 40], [2, 100], [3, 300], [4, 1200]])("clears %s rows for %s times the current level", (count, score) => {
    const state = createState();
    const board = state.board.map((row) => [...row]);
    for (let row = ROWS - count; row < ROWS; row++) {
      board[row] = Array.from({ length: COLS }, (_cell, col) => col === 5 ? null : "O");
    }
    const result = lock({
      ...state, board, level: 3, lines: 30,
      active: { type: "I", rotation: 1, row: 16, col: 3 },
    }, () => 0);
    expect(result.clearedRows).toHaveLength(count);
    expect(result.state.score).toBe(score * 3);
    expect(result.state.lines).toBe(30 + count);
    expect(result.state.board).toHaveLength(20);
    expect(result.state.board.slice(0, count)).toEqual(Array.from({ length: count }, emptyRow));
  });
  it("levels up every fifteen lines, scoring the clear at the old level", () => {
    const state = createState();
    state.board[19] = Array.from({ length: COLS }, (_cell, col) => col === 5 ? null : "O");
    const result = lock({
      ...state, lines: 14, active: { type: "I", rotation: 1, row: 16, col: 3 },
    }, () => 0);
    expect(result.state).toMatchObject({ level: 2, lines: 15, score: 40 });
  });
  it("ends when the next piece cannot spawn", () => {
    const state = createState();
    state.board[0][4] = "Z";
    const result = lock({ ...state, next: "O", active: { type: "O", rotation: 0, row: 18, col: 3 } });
    expect(result.state).toMatchObject({ status: "over", active: null });
  });
  it("ends when a piece locks above the board", () => {
    const state = createState();
    const result = lock({ ...state, active: { type: "T", rotation: 0, row: -1, col: 3 } });
    expect(result.state.status).toBe("over");
    expect(result.state.board).toBe(state.board);
  });
  it("does not move, rotate, or drop after game over", () => {
    const state = { ...createState(), status: "over" as const };
    expect(move(state, 1, 0)).toBe(state);
    expect(rotate(state)).toBe(state);
    expect(hardDrop(state).state).toBe(state);
  });
  it("keeps the existing gravity curve and caps its final level", () => {
    expect(gravityInterval(1)).toBe(0.9);
    expect(gravityInterval(15)).toBe(0.133);
    expect(gravityInterval(30)).toBe(0.017);
    expect(gravityInterval(100)).toBe(0.017);
  });
});
