import type { CueDef } from "../../game-player/audio/types";

export const TETRIS_CUES: CueDef[] = [
  { id: "tetris.move", src: "/sounds/tetris_move.mp3", gain: 0.35, maxVoices: 2, cooldownMs: 40 },
  { id: "tetris.rotate", src: "/sounds/tetris_rotate.mp3", gain: 0.45, maxVoices: 2 },
  { id: "tetris.soft-drop", src: "/sounds/tetris_soft_drop.mp3", gain: 0.25, maxVoices: 2, cooldownMs: 45 },
  { id: "tetris.hard-drop", src: "/sounds/tetris_hard_drop.mp3", gain: 0.65, maxVoices: 2 },
  { id: "tetris.lock", src: "/sounds/tetris_lock.mp3", gain: 0.45, maxVoices: 2 },
  { id: "tetris.line-1", src: "/sounds/tetris_line_clear_1.mp3", gain: 0.65, maxVoices: 2 },
  { id: "tetris.line-2", src: "/sounds/tetris_line_clear_2.mp3", gain: 0.65, maxVoices: 2 },
  { id: "tetris.line-3", src: "/sounds/tetris_line_clear_3.mp3", gain: 0.65, maxVoices: 2 },
  { id: "tetris.tetris", src: "/sounds/tetris_tetris.mp3", gain: 0.75, maxVoices: 2 },
  { id: "tetris.level-up", src: "/sounds/tetris_level_up.mp3", gain: 0.7, maxVoices: 1 },
  { id: "tetris.game-over", src: "/sounds/tetris_game_over.mp3", gain: 0.65, maxVoices: 1 },
];
