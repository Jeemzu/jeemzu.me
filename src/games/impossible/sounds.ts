import type { CueDef } from "../../game-player/audio/types";

export const IMPOSSIBLE_CUES: CueDef[] = [
  { id: "impossible.jump", src: "/sounds/impossible_jump.mp3", bus: "sfx", gain: 0.45, maxVoices: 2 },
  { id: "impossible.land", src: "/sounds/impossible_land.mp3", bus: "sfx", gain: 0.35, maxVoices: 2 },
  { id: "impossible.death", src: "/sounds/impossible_death.mp3", bus: "sfx", gain: 0.7, maxVoices: 1 },
  { id: "impossible.complete", src: "/sounds/impossible_complete.mp3", bus: "sfx", gain: 0.7, maxVoices: 1 },
];
