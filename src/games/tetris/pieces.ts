export const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
export type PieceType = typeof PIECE_TYPES[number];
export type Offset = readonly [row: number, col: number];
type Kick = readonly [x: number, y: number];

function rotations(initial: readonly Offset[]): readonly (readonly Offset[])[] {
  const result: Offset[][] = [initial.map(([r, c]) => [r, c])];
  for (let i = 1; i < 4; i++) result.push(result[i - 1].map(([r, c]) => [c, 2 - r]));
  return result;
}

const square: readonly Offset[] = [[0, 1], [0, 2], [1, 1], [1, 2]];
export const SHAPES: Record<PieceType, readonly (readonly Offset[])[]> = {
  I: [
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  O: [square, square, square, square],
  T: rotations([[0, 1], [1, 0], [1, 1], [1, 2]]),
  S: rotations([[0, 1], [0, 2], [1, 0], [1, 1]]),
  Z: rotations([[0, 0], [0, 1], [1, 1], [1, 2]]),
  J: rotations([[0, 0], [1, 0], [1, 1], [1, 2]]),
  L: rotations([[0, 2], [1, 0], [1, 1], [1, 2]]),
};

// Clockwise SRS offsets in (x, y-up); the rules convert y to board rows.
export const KICKS: readonly (readonly Kick[])[] = [
  [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
];
export const I_KICKS: readonly (readonly Kick[])[] = [
  [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
];
