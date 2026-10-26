import type { GameEntry } from "../../game-player/contract";
import { HEIGHT, WIDTH } from "./config";
import { BrickOptionsMenu, type BrickOptions } from "./Options";

export const brickEntry: GameEntry<BrickOptions> = {
  id: "brickbreak", title: "Brick Break", logicalSize: { width: WIDTH, height: HEIGHT },
  defaultOptions: { level: 1 }, Options: BrickOptionsMenu,
  leaderboardId: () => "brickbreak", load: () => import("./index"),
};
