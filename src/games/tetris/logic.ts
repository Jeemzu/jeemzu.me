import { COLS, LINE_SCORES, LINES_PER_LEVEL, ROWS } from "./config";
import { I_KICKS, KICKS, PIECE_TYPES, SHAPES, type PieceType } from "./pieces";

export interface ActivePiece {
  type: PieceType;
  rotation: number;
  row: number;
  col: number;
}
export type Board = (PieceType | null)[][];
export interface TetrisState {
  board: Board;
  active: ActivePiece | null;
  next: PieceType;
  score: number;
  level: number;
  lines: number;
  status: "playing" | "over";
}
export interface DropResult {
  state: TetrisState;
  locked: boolean;
  clearedRows: number[];
}

export const emptyRow = (): (PieceType | null)[] => Array.from({ length: COLS }, () => null);
const randomPiece = (random: () => number): PieceType => PIECE_TYPES[Math.floor(random() * PIECE_TYPES.length)];
export const cells = (piece: ActivePiece): { row: number; col: number }[] =>
  SHAPES[piece.type][piece.rotation].map(([row, col]) => ({ row: piece.row + row, col: piece.col + col }));

export function valid(board: Board, piece: ActivePiece): boolean {
  return cells(piece).every(({ row, col }) =>
    col >= 0 && col < COLS && row < ROWS && (row < 0 || board[row][col] === null));
}

function spawn(state: TetrisState, random: () => number): TetrisState {
  const active = { type: state.next, rotation: 0, row: state.next === "I" ? -1 : 0, col: 3 };
  const canSpawn = valid(state.board, active);
  return {
    ...state,
    active: canSpawn ? active : null,
    next: randomPiece(random),
    status: canSpawn ? "playing" : "over",
  };
}

export function createState(random: () => number = Math.random): TetrisState {
  return spawn({
    board: Array.from({ length: ROWS }, emptyRow), active: null, next: randomPiece(random),
    score: 0, level: 1, lines: 0, status: "playing",
  }, random);
}

export function move(state: TetrisState, row: number, col: number): TetrisState {
  if (!state.active || state.status !== "playing") return state;
  const active = { ...state.active, row: state.active.row + row, col: state.active.col + col };
  return valid(state.board, active) ? { ...state, active } : state;
}

export function rotate(state: TetrisState): TetrisState {
  if (!state.active || state.status !== "playing") return state;
  const piece = state.active;
  const kicks = piece.type === "O" ? [[0, 0]] : (piece.type === "I" ? I_KICKS : KICKS)[piece.rotation];
  for (const [x, y] of kicks) {
    const active = { ...piece, rotation: (piece.rotation + 1) % 4, col: piece.col + x, row: piece.row - y };
    if (valid(state.board, active)) return { ...state, active };
  }
  return state;
}

export function ghost(state: TetrisState): ActivePiece | null {
  if (!state.active) return null;
  let result = state.active;
  while (valid(state.board, { ...result, row: result.row + 1 })) result = { ...result, row: result.row + 1 };
  return result;
}

export function lock(state: TetrisState, random: () => number = Math.random): DropResult {
  if (!state.active || state.status !== "playing") return { state, locked: false, clearedRows: [] };
  const occupied = cells(state.active);
  if (occupied.some(({ row }) => row < 0)) {
    return { state: { ...state, active: null, status: "over" }, locked: true, clearedRows: [] };
  }
  const board = state.board.map((row) => [...row]);
  for (const { row, col } of occupied) board[row][col] = state.active.type;
  const clearedRows = board.flatMap((row, index) => row.every((cell) => cell !== null) ? [index] : []);
  const remaining = board.filter((_row, index) => !clearedRows.includes(index));
  const lines = state.lines + clearedRows.length;
  const next = spawn({
    ...state,
    board: [...Array.from({ length: clearedRows.length }, emptyRow), ...remaining],
    active: null,
    score: state.score + LINE_SCORES[Math.min(clearedRows.length, 4)] * state.level,
    lines,
    level: Math.floor(lines / LINES_PER_LEVEL) + 1,
  }, random);
  return { state: next, locked: true, clearedRows };
}

export function drop(state: TetrisState, random: () => number = Math.random): DropResult {
  const moved = move(state, 1, 0);
  return moved !== state ? { state: moved, locked: false, clearedRows: [] } : lock(state, random);
}

export function hardDrop(state: TetrisState, random: () => number = Math.random): DropResult {
  const target = ghost(state);
  if (!target || state.status !== "playing" || !state.active) return { state, locked: false, clearedRows: [] };
  return lock({ ...state, active: target, score: state.score + (target.row - state.active.row) * 2 }, random);
}
