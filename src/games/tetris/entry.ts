import type { GameEntry } from "../../game-player/contract";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./config";

export const tetrisEntry: GameEntry<Record<string, never>> = {
  id: "tetris",
  title: "Tetris",
  logicalSize: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
  defaultOptions: {},
  load: () => import("./index"),
  leaderboardId: () => "tetris",
};
