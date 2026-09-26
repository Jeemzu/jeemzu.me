import Phaser from "phaser";
import {
  ExplorationScene,
  SCENE_WIDTH,
  SCENE_HEIGHT,
} from "./scenes/ExplorationScene";

/** Phaser game config for the RPG. `parent` is set by RPGContainer at instantiation. */
export function createRpgGameConfig(): Omit<
  Phaser.Types.Core.GameConfig,
  "parent"
> {
  return {
    type: Phaser.AUTO,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    backgroundColor: "#1a1a1a",
    scale: {
      // Scale the canvas to whatever box the React layer gives it (keeps 4:3),
      // so the game frame stays fixed and responsive instead of overflowing.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [ExplorationScene],
  };
}
