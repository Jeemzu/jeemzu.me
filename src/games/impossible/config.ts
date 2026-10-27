import { SH, SW } from "../../lib/LevelSchema";

export const WIDTH = SW;
export const HEIGHT = SH;

/** Mirrors `enum class State` in cpp/platformer/main.cpp. */
export const STATE = { waiting: 0, playing: 1, dead: 2, completed: 3 } as const;

/** Mirrors the EV_* flags in cpp/platformer/main.cpp. */
export const EVENT = { jump: 1, land: 2, death: 4, complete: 8 } as const;

/** Pause after a death before the run restarts automatically. */
export const RETRY_DELAY_MS = 650;

export const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
