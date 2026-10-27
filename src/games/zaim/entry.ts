import type { GameEntry } from "../../game-player/contract";
import { HEIGHT, WIDTH, type AimOptions } from "./config";
import { decodeReflex } from "./logic";
import { AimOptionsMenu } from "./Options";

export const aimEntry: GameEntry<AimOptions> = {
  id: "zaim", title: "zAim", logicalSize: { width: WIDTH, height: HEIGHT },
  defaultOptions: { mode: "endurance" }, Options: AimOptionsMenu, immersive: true,
  leaderboardId: options => `zaim_${options.mode}`,
  displayScore: (score, options) => options.mode === "reflex" ? { value: decodeReflex(score), suffix: "ms" } : { value: score },
  load: () => import("./index"),
};
