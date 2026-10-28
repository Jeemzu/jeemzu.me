import type { GameEntry } from "../../game-player/contract";
import { HowToPlayButton } from "./ui/HowToPlay";

export const puttPartyEntry: GameEntry<null> = {
  id: "puttparty",
  title: "Better Putt Party",
  logicalSize: { width: 1280, height: 720 },
  defaultOptions: null,
  Options: HowToPlayButton,
  immersive: true,
  noLeaderboard: true,
  realtime: true,
  leaderboardId: () => "puttparty",
  load: () => import("./index"),
};
