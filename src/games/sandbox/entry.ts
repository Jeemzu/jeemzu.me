import type { GameEntry } from "../../game-player/contract";

/** Dev-only harness for checking Player sizing, DPR sharpness, audio and overlay flow. */
export const sandboxEntry: GameEntry<Record<string, never>> = {
  id: "sandbox",
  title: "Sandbox",
  logicalSize: { width: 800, height: 600 },
  defaultOptions: {},
  load: () => import("./index"),
  leaderboardId: () => "sandbox",
  noLeaderboard: true,
};
