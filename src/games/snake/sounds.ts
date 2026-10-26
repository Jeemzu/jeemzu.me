import type { CueDef } from "../../game-player/audio/types";

export const SNAKE_CUES: CueDef[] = [
  { id: "snake.eat", src: "/sounds/snake_eat.mp3", gain: 0.55, pitchJitter: 0.6, maxVoices: 3 },
  { id: "snake.lose", src: "/sounds/snake_lose.mp3", gain: 0.6, maxVoices: 1 },
  { id: "snake.music", src: "/sounds/snake_music.mp3", bus: "music", gain: 0.22, loop: true },
];
