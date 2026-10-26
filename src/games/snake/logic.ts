import { FOOD_SCORE, GRID_SIZE, INITIAL_DELAY, MIN_DELAY, SPEED_INCREMENT } from "./config";

export interface Cell {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";
export type SnakeStatus = "playing" | "lost" | "won";

export interface SnakeState {
  snake: Cell[];
  food: Cell | null;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  moveDelay: number;
  status: SnakeStatus;
}

const VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function placeFood(snake: readonly Cell[], random: () => number = Math.random): Cell | null {
  const occupied = new Set(snake.map(({ x, y }) => y * GRID_SIZE + x));
  const empty: Cell[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(y * GRID_SIZE + x)) empty.push({ x, y });
    }
  }
  return empty.length ? empty[Math.floor(random() * empty.length)] : null;
}

export function createState(random: () => number = Math.random): SnakeState {
  const center = Math.floor(GRID_SIZE / 2);
  const snake = [0, 1, 2].map((offset) => ({ x: center - offset, y: center }));
  return {
    snake,
    food: placeFood(snake, random),
    direction: "right",
    nextDirection: "right",
    score: 0,
    moveDelay: INITIAL_DELAY,
    status: "playing",
  };
}

export function turn(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== "playing") return state;
  const current = VECTORS[state.direction];
  const next = VECTORS[direction];
  if (current.x + next.x === 0 && current.y + next.y === 0) return state;
  return { ...state, nextDirection: direction };
}

export function step(state: SnakeState, random: () => number = Math.random): SnakeState {
  if (state.status !== "playing") return state;
  const vector = VECTORS[state.nextDirection];
  const head = { x: state.snake[0].x + vector.x, y: state.snake[0].y + vector.y };
  const eating = state.food !== null && sameCell(head, state.food);
  // The tail vacates its cell on a non-growing move.
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (
    head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE ||
    body.some((cell) => sameCell(cell, head))
  ) return { ...state, direction: state.nextDirection, status: "lost" };

  const snake = [head, ...state.snake];
  if (!eating) snake.pop();
  const food = eating ? placeFood(snake, random) : state.food;
  return {
    snake,
    food,
    direction: state.nextDirection,
    nextDirection: state.nextDirection,
    score: state.score + (eating ? FOOD_SCORE : 0),
    moveDelay: eating ? Math.max(MIN_DELAY, state.moveDelay - SPEED_INCREMENT) : state.moveDelay,
    status: food === null ? "won" : "playing",
  };
}
