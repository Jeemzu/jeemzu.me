import type { CueDef } from "../../game-player/audio/types";
export const BRICK_CUES: CueDef[] = [
  { id: "brickbreak.break", src: Array.from({ length: 5 }, (_, i) => `/sounds/brickbreak_break_${i + 1}.mp3`), bus: "sfx", gain: 0.5, maxVoices: 4, cooldownMs: 20 },
  { id: "brickbreak.wall", src: "/sounds/brickbreak_wall_hit.mp3", bus: "sfx", gain: 0.35, maxVoices: 3, cooldownMs: 25 },
  { id: "brickbreak.lose", src: "/sounds/brickbreak_lose.mp3", bus: "sfx", gain: 0.6, maxVoices: 1 },
];
