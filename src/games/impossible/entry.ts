import type { GameEntry } from "../../game-player/contract";
import { HEIGHT, WIDTH } from "./config";
import type { ImpossibleOptions } from "./levels";
import { ImpossibleOptionsMenu } from "./Options";

export const impossibleEntry: GameEntry<ImpossibleOptions> = {
  id: "impossible", title: "The (Im)Possible Game", logicalSize: { width: WIDTH, height: HEIGHT },
  defaultOptions: { level: { kind: "official", number: 1 } }, Options: ImpossibleOptionsMenu,
  leaderboardId: () => "impossible", noLeaderboard: true,
  load: () => import("./index"),
};
