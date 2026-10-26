export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 30;
export const BOARD_WIDTH = COLS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;
export const LINES_PER_LEVEL = 15;
export const LINE_SCORES = [0, 40, 100, 300, 1200] as const;
const LEVEL_INTERVALS = [
  900, 817, 750, 683, 617, 550, 483, 417, 350, 300,
  250, 217, 183, 150, 133, 117, 100, 83, 67, 50,
  50, 50, 50, 33, 33, 33, 33, 33, 33, 17,
];

export const gravityInterval = (level: number): number =>
  LEVEL_INTERVALS[Math.min(Math.max(0, level - 1), LEVEL_INTERVALS.length - 1)] / 1000;
