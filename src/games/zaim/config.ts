export const WIDTH = 800;
export const HEIGHT = 600;
export const MODES = ["endurance", "reflex", "speed"] as const;
export type GameMode = typeof MODES[number];
export interface AimOptions { mode: GameMode; color: string }
export const COLORS = [
  { name: "Gold", value: "#c8a24a" }, { name: "Green", value: "#a8d67e" },
  { name: "Blue", value: "#7ec8e3" }, { name: "Amber", value: "#f4a261" },
  { name: "Coral", value: "#e76f51" }, { name: "White", value: "#ffffff" },
];
export const REFLEX_ROUNDS = 5;
export const ENDURANCE_TIME = 12;
export const ENDURANCE_THRESHOLD = 40;
export const TIME_BONUS = 10;
export const SPEED_TIME = 10;
