import type { GameModule } from "../../game-player/contract";
import { PuttGame } from "./game";

const puttParty: GameModule<null> = {
  mount: (host) => new PuttGame(host),
};

export default puttParty;
