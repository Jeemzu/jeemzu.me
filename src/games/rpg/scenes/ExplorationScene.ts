import Phaser from 'phaser';

/** Pixel size of one world tile. Matches the {x, y} tile coordinates the RPG service sends. */
export const TILE_SIZE = 32;
export const SCENE_WIDTH = 640;
export const SCENE_HEIGHT = 480;

interface MapTransitionData {
    map: string;
    spawn?: { x: number; y: number };
}

interface ShowNpcData {
    npc_id: string;
    sprite_key?: string;
    position?: { x: number; y: number };
}

/**
 * Placeholder exploration scene — renders the party and NPCs as simple colored
 * shapes rather than real sprites/tilemaps. This validates the visual_commands
 * contract and interaction feel; real pixel art is a reskin pass for later once
 * the gameplay loop is proven out (see session plan's "REORDERING DECISION").
 */
export class ExplorationScene extends Phaser.Scene {
    /** True once create() has finished — check this before relying on the 'scene-ready' event, which won't replay if missed. */
    public isReady = false;

    private partyMarker!: Phaser.GameObjects.Rectangle;
    private locationLabel!: Phaser.GameObjects.Text;
    private npcObjects = new Map<string, Phaser.GameObjects.Container>();
    private fadeOverlay!: Phaser.GameObjects.Rectangle;

    constructor() {
        super({ key: 'Exploration' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#2a2a2a');

        this.add.grid(
            SCENE_WIDTH / 2,
            SCENE_HEIGHT / 2,
            SCENE_WIDTH,
            SCENE_HEIGHT,
            TILE_SIZE,
            TILE_SIZE,
            0x2a2a2a,
            1,
            0x353535,
            1,
        );

        this.locationLabel = this.add.text(12, 10, 'village_square', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#c5e8a4',
        });

        this.partyMarker = this.add
            .rectangle(5 * TILE_SIZE, 8 * TILE_SIZE, 24, 24, 0xa8d67e)
            .setStrokeStyle(2, 0x121212);

        this.fadeOverlay = this.add
            .rectangle(0, 0, SCENE_WIDTH, SCENE_HEIGHT, 0x000000, 1)
            .setOrigin(0, 0)
            .setDepth(1000)
            .setAlpha(0);

        // Signals to the React layer that it's now safe to send visual commands —
        // game objects referenced below are only valid after create() has run.
        this.isReady = true;
        this.events.emit('scene-ready');
    }

    /** Runs a batch of visual_commands sequentially. Unrecognized types are no-ops. */
    async runVisualCommands(commands: { type: string; data: Record<string, unknown> }[]): Promise<void> {
        for (const command of commands) {
            switch (command.type) {
                case 'load_map':
                case 'transition_map':
                    await this.transitionToMap(command.data as unknown as MapTransitionData);
                    break;
                case 'show_npc':
                    this.showNpc(command.data as unknown as ShowNpcData);
                    break;
                default:
                    // show_dialogue, npc_speak, quest_accepted, rest_animation, use_item_animation, etc.
                    // are handled by the React/store layer (narrative panel, dialogue box, toasts) —
                    // nothing for the placeholder scene to render for these yet.
                    break;
            }
        }
    }

    private async transitionToMap(data: MapTransitionData): Promise<void> {
        await this.fade(true);

        this.npcObjects.forEach((obj) => obj.destroy());
        this.npcObjects.clear();

        this.locationLabel.setText(data.map);
        const spawn = data.spawn ?? { x: 5, y: 5 };
        this.partyMarker.setPosition(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);

        await this.fade(false);
    }

    private showNpc(data: ShowNpcData): void {
        if (!data.npc_id || this.npcObjects.has(data.npc_id)) return;

        const position = data.position ?? { x: 0, y: 0 };
        const box = this.add.rectangle(0, 0, 20, 20, 0xe0a458).setStrokeStyle(2, 0x121212);
        const label = this.add
            .text(0, 14, data.sprite_key ?? data.npc_id, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#e0e0e0',
            })
            .setOrigin(0.5, 0);

        const container = this.add.container(position.x * TILE_SIZE, position.y * TILE_SIZE, [box, label]);
        this.npcObjects.set(data.npc_id, container);
    }

    private fade(toOpaque: boolean): Promise<void> {
        return new Promise((resolve) => {
            this.tweens.add({
                targets: this.fadeOverlay,
                alpha: toOpaque ? 0.85 : 0,
                duration: 220,
                onComplete: () => resolve(),
            });
        });
    }
}
