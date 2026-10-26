import { HEIGHT, WIDTH, type GameMode } from "./config";

export function gridLayout(mode: GameMode) {
  const columns = mode === "reflex" ? 2 : 4;
  const size = Math.min((WIDTH - (mode === "reflex" ? 300 : 480)) / columns, (HEIGHT - 140) / columns);
  return { columns, size, x: (WIDTH - columns * size) / 2, y: 120 + (HEIGHT - 140 - columns * size) / 2 };
}
export function cellAt(mode: GameMode, x: number, y: number): number | null {
  const grid = gridLayout(mode);
  const col = Math.floor((x - grid.x) / grid.size), row = Math.floor((y - grid.y) / grid.size);
  return col >= 0 && row >= 0 && col < grid.columns && row < grid.columns ? row * grid.columns + col : null;
}
