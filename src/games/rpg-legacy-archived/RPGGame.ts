import Phaser from 'phaser';
import { ExplorationScene, SCENE_WIDTH, SCENE_HEIGHT } from './scenes/ExplorationScene';

/** Phaser game config for the RPG. `parent` is set by RPGContainer at instantiation. */
export function createRpgGameConfig(): Omit<Phaser.Types.Core.GameConfig, 'parent'> {
    return {
        type: Phaser.AUTO,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
        backgroundColor: '#1a1a1a',
        scene: [ExplorationScene],
    };
}
