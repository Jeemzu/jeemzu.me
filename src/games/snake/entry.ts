import type { GameEntry } from "../../game-player/contract";
import { BOARD_SIZE } from "./config";

export const snakeEntry: GameEntry<Record<string, never>> = {
  id: "snake",
  title: "Snake",
  logicalSize: { width: BOARD_SIZE, height: BOARD_SIZE },
  defaultOptions: {},
  load: () => import("./index"),
  leaderboardId: () => "snake",
};
