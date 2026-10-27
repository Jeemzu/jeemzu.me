export const WIDTH = 800;
export const HEIGHT = 600;
export const MODES = ["endurance", "reflex", "speed"] as const;
export type GameMode = typeof MODES[number];
export interface AimOptions { mode: GameMode }
export const REFLEX_ROUNDS = 5;
export const ENDURANCE_TIME = 12;
export const ENDURANCE_THRESHOLD = 40;
export const TIME_BONUS = 10;
export const SPEED_TIME = 10;
