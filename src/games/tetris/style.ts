import type { PieceType } from "./pieces";

export const PIECE_COLORS: Record<PieceType, number> = {
  I: 0x6edfff, O: 0xffd875, T: 0xcb95ff, S: 0x7ae6b9,
  Z: 0xff7da6, J: 0x839aff, L: 0xffb57f,
};
export const STYLE = {
  background: 0x090612,
  grid: 0x36294f,
  border: 0x81739b,
  clear: 0xcbbfff,
  bloom: { strength: 0.25, radius: 0.08, threshold: 0.72 },
} as const;
