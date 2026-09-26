import Phaser from "phaser";

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
  private npcObjects = new Map<string, Phaser.GameObjects.Container>();
  private fadeOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "Exploration" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#2a2a2a");

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

    // Location is displayed by the React status bar above the canvas, not in-scene.

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
    this.events.emit("scene-ready");
  }

  /** Runs a batch of visual_commands sequentially. Unrecognized types are no-ops. */
  async runVisualCommands(
    commands: { type: string; data: Record<string, unknown> }[],
  ): Promise<void> {
    for (const command of commands) {
      switch (command.type) {
        case "load_map":
        case "transition_map":
          await this.transitionToMap(
            command.data as unknown as MapTransitionData,
          );
          break;
        case "show_npc":
          this.showNpc(command.data as unknown as ShowNpcData);
          break;
        case "combat_attack":
          await this.showDamageEffect(command.data);
          break;
        case "combat_spell":
          await this.showSpellEffect(command.data);
          break;
        case "combat_miss":
          await this.showMissEffect();
          break;
        case "enemy_death":
          await this.showDeathEffect();
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

    const spawn = data.spawn ?? { x: 5, y: 5 };
    this.partyMarker.setPosition(spawn.x * TILE_SIZE, spawn.y * TILE_SIZE);

    await this.fade(false);
  }

  private showNpc(data: ShowNpcData): void {
    if (!data.npc_id || this.npcObjects.has(data.npc_id)) return;

    const position = data.position ?? { x: 0, y: 0 };
    const box = this.add
      .rectangle(0, 0, 20, 20, 0xe0a458)
      .setStrokeStyle(2, 0x121212);
    const label = this.add
      .text(0, 14, data.sprite_key ?? data.npc_id, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#e0e0e0",
      })
      .setOrigin(0.5, 0);

    const container = this.add.container(
      position.x * TILE_SIZE,
      position.y * TILE_SIZE,
      [box, label],
    );
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

  /** Show damage number animation */
  private async showDamageEffect(data: Record<string, unknown>): Promise<void> {
    const damage = data.damage as number;
    const damageType = (data.damage_type as string) || "physical";

    // Damage type colors
    const damageColors: Record<string, number> = {
      physical: 0xffffff,
      fire: 0xff6b6b,
      ice: 0x4fc3f7,
      lightning: 0xfff59d,
      poison: 0x66bb6a,
      holy: 0xffd700,
      dark: 0x7e57c2,
    };

    const color = damageColors[damageType] || 0xffffff;

    // Position at center of screen (placeholder for target position)
    const x = SCENE_WIDTH / 2 + (Math.random() - 0.5) * 40;
    const y = SCENE_HEIGHT / 2;

    const damageText = this.add
      .text(x, y, `-${damage}`, {
        fontFamily: "monospace",
        fontSize: "32px",
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(999);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: damageText,
        y: y - 80,
        alpha: 0,
        duration: 1000,
        ease: "Power2",
        onComplete: () => {
          damageText.destroy();
          resolve();
        },
      });
    });
  }

  /** Show spell effect animation */
  private async showSpellEffect(data: Record<string, unknown>): Promise<void> {
    const damageType = (data.damage_type as string) || "fire";

    // Show particles for spell
    const x = SCENE_WIDTH / 2;
    const y = SCENE_HEIGHT / 2;

    const spellColors: Record<string, number> = {
      fire: 0xff6b6b,
      ice: 0x4fc3f7,
      lightning: 0xfff59d,
      poison: 0x66bb6a,
      holy: 0xffd700,
      dark: 0x7e57c2,
    };

    const color = spellColors[damageType] || 0xff6b6b;

    // Create particle burst
    const particles: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.add.circle(x, y, 4, color).setDepth(998);
      particles.push(particle);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60,
        alpha: 0,
        duration: 600,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }

    // Show damage number
    await this.showDamageEffect(data);
  }

  /** Show miss effect */
  private async showMissEffect(): Promise<void> {
    const x = SCENE_WIDTH / 2 + (Math.random() - 0.5) * 40;
    const y = SCENE_HEIGHT / 2;

    const missText = this.add
      .text(x, y, "MISS", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#9e9e9e",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(999);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: missText,
        y: y - 50,
        alpha: 0,
        duration: 800,
        ease: "Power2",
        onComplete: () => {
          missText.destroy();
          resolve();
        },
      });
    });
  }

  /** Show death effect */
  private async showDeathEffect(): Promise<void> {
    const x = SCENE_WIDTH / 2;
    const y = SCENE_HEIGHT / 2;

    // Flash effect
    const flash = this.add
      .rectangle(x, y, SCENE_WIDTH, SCENE_HEIGHT, 0xff0000, 0.3)
      .setDepth(997);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        ease: "Power2",
        onComplete: () => {
          flash.destroy();
          resolve();
        },
      });
    });
  }
}
