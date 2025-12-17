import Phaser from 'phaser';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 5;
const GRID_PADDING = 50;
const GREEN_COLOR = 0xa8d67e; // Site's primary green color
const WHITE_COLOR = 0xffffff;
const CELL_SPACING = 10;

interface GridCell {
    rect: Phaser.GameObjects.Rectangle;
    row: number;
    col: number;
}

interface ActiveTarget {
    cell: GridCell;
    spawnTime: number;
    duration: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_SETTINGS = {
    easy: {
        targetDuration: 3000,
        spawnInterval: 1500,
        maxTargets: 3,
    },
    medium: {
        targetDuration: 2000,
        spawnInterval: 1200,
        maxTargets: 4,
    },
    hard: {
        targetDuration: 1500,
        spawnInterval: 1000,
        maxTargets: 5,
    },
};

export class ZAimScene extends Phaser.Scene {
    private gridCells: GridCell[] = [];
    private activeTargets: ActiveTarget[] = [];
    private score: number = 0;
    private difficulty: Difficulty = 'medium';
    private lastSpawnTime: number = 0;
    private gameTime: number = 0;
    private gameDuration: number = 60000; // 60 seconds
    private isGameOver: boolean = false;
    private crosshair!: Phaser.GameObjects.Arc;
    private cellWidth: number = 0;
    private cellHeight: number = 0;
    private targetColor: number = GREEN_COLOR;
    private hitSound?: Phaser.Sound.BaseSound;
    private bgMusic?: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'ZAimScene' });
    }

    preload() {
        // Load the hit sound
        this.load.audio('zaimHit', '/sounds/zaim_hit.mp3');
        // Load the background music
        this.load.audio('zaimMusic', '/sounds/zaim_music.mp3');
    }

    init(data: { difficulty?: Difficulty }) {
        if (data.difficulty) {
            this.difficulty = data.difficulty;
        }
    }

    create() {
        // Get settings from registry
        const primaryColorHex = this.registry.get('primaryColor') || '#a8d67e';
        this.targetColor = parseInt(primaryColorHex.replace('#', '0x'));

        // Get volume setting
        const volume = this.registry.get('volume') || 0.5;

        // Initialize sounds only if they don't exist
        if (!this.hitSound) {
            this.hitSound = this.sound.add('zaimHit', { volume: volume * 0.6 });
        } else {
            (this.hitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(volume * 0.6);
        }
        if (!this.bgMusic) {
            this.bgMusic = this.sound.add('zaimMusic', { volume: volume * 0.3, loop: true });
            // Start background music only on first create
            this.bgMusic.play();
        } else {
            (this.bgMusic as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(volume * 0.3);
        }

        // Reset game state
        this.gridCells = [];
        this.activeTargets = [];
        this.score = 0;
        this.gameTime = 0;
        this.lastSpawnTime = 0;
        this.isGameOver = false;

        // Set background color
        this.cameras.main.setBackgroundColor('#1a1a1a');

        // Calculate grid dimensions
        const availableWidth = CANVAS_WIDTH - (GRID_PADDING * 2);
        const availableHeight = CANVAS_HEIGHT - (GRID_PADDING * 2);
        const totalSpacingWidth = CELL_SPACING * (GRID_SIZE - 1);
        const totalSpacingHeight = CELL_SPACING * (GRID_SIZE - 1);

        this.cellWidth = (availableWidth - totalSpacingWidth) / GRID_SIZE;
        this.cellHeight = (availableHeight - totalSpacingHeight) / GRID_SIZE;

        // Create 5x5 grid of rectangles
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const x = GRID_PADDING + col * (this.cellWidth + CELL_SPACING) + this.cellWidth / 2;
                const y = GRID_PADDING + row * (this.cellHeight + CELL_SPACING) + this.cellHeight / 2;

                const rect = this.add.rectangle(x, y, this.cellWidth, this.cellHeight, WHITE_COLOR, 0.3);
                rect.setStrokeStyle(2, WHITE_COLOR, 0.5);
                rect.setInteractive({ useHandCursor: false });

                const cell: GridCell = { rect, row, col };
                this.gridCells.push(cell);

                // Handle cell click
                rect.on('pointerdown', () => {
                    this.onCellClick(cell);
                });
            }
        }

        // Hide default cursor and create custom crosshair
        this.input.setDefaultCursor('none');
        this.crosshair = this.add.circle(0, 0, 5, 0xff0000, 0.8); // Red center
        this.crosshair.setStrokeStyle(2, 0xffffff, 1); // White stroke
        this.crosshair.setDepth(1000);

        // Add crosshair lines
        const crosshairGraphics = this.add.graphics();
        crosshairGraphics.lineStyle(2, 0xffffff, 0.8); // White lines
        crosshairGraphics.setDepth(1000);

        // Update crosshair position on pointer move
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.crosshair.setPosition(pointer.x, pointer.y);
            crosshairGraphics.clear();
            crosshairGraphics.lineStyle(2, 0xffffff, 0.8);
            // Draw cross lines
            crosshairGraphics.beginPath();
            crosshairGraphics.moveTo(pointer.x - 15, pointer.y);
            crosshairGraphics.lineTo(pointer.x - 5, pointer.y);
            crosshairGraphics.moveTo(pointer.x + 5, pointer.y);
            crosshairGraphics.lineTo(pointer.x + 15, pointer.y);
            crosshairGraphics.moveTo(pointer.x, pointer.y - 15);
            crosshairGraphics.lineTo(pointer.x, pointer.y - 5);
            crosshairGraphics.moveTo(pointer.x, pointer.y + 5);
            crosshairGraphics.lineTo(pointer.x, pointer.y + 15);
            crosshairGraphics.strokePath();
        });

        // Emit initial score
        this.game.events.emit('scoreUpdate', this.score);
    }

    update(time: number, delta: number) {
        if (this.isGameOver) return;

        this.gameTime += delta;

        // Check if game time is up
        if (this.gameTime >= this.gameDuration) {
            this.gameOver();
            return;
        }

        const settings = DIFFICULTY_SETTINGS[this.difficulty];

        // Spawn new targets
        if (time - this.lastSpawnTime >= settings.spawnInterval && this.activeTargets.length < settings.maxTargets) {
            this.spawnTarget(time);
            this.lastSpawnTime = time;
        }

        // Update active targets - check for expiration
        this.activeTargets = this.activeTargets.filter(target => {
            const elapsed = time - target.spawnTime;

            if (elapsed >= target.duration) {
                // Target expired - instantly reset to white
                target.cell.rect.setFillStyle(WHITE_COLOR, 0.3);
                target.cell.rect.setStrokeStyle(2, WHITE_COLOR, 0.5);
                return false;
            }

            return true;
        });

        // Emit time update
        const timeLeft = Math.max(0, this.gameDuration - this.gameTime);
        this.game.events.emit('timeUpdate', Math.ceil(timeLeft / 1000));
    }

    private spawnTarget(time: number) {
        const settings = DIFFICULTY_SETTINGS[this.difficulty];

        // Get cells that aren't already active
        const activeCellIndices = this.activeTargets.map(t =>
            this.gridCells.indexOf(t.cell)
        );
        const availableCells = this.gridCells.filter((_, index) =>
            !activeCellIndices.includes(index)
        );

        if (availableCells.length === 0) return;

        // Pick a random available cell
        const cell = Phaser.Utils.Array.GetRandom(availableCells);

        // Set cell to target color
        cell.rect.setFillStyle(this.targetColor, 1);
        cell.rect.setStrokeStyle(2, WHITE_COLOR, 0.8);

        this.activeTargets.push({
            cell,
            spawnTime: time,
            duration: settings.targetDuration,
        });
    }

    private onCellClick(cell: GridCell) {
        // Check if this cell is an active target
        const targetIndex = this.activeTargets.findIndex(t => t.cell === cell);

        if (targetIndex !== -1) {
            // Hit! Remove from active targets FIRST to stop the update loop from changing the color
            this.activeTargets.splice(targetIndex, 1);

            // Stop any tweens that might be running on this rectangle
            this.tweens.killTweensOf(cell.rect);

            // Reset cell to base white state - alpha is part of fillStyle, don't set it twice
            cell.rect.setAlpha(1);
            cell.rect.setFillStyle(WHITE_COLOR, 0.3);
            cell.rect.setStrokeStyle(2, WHITE_COLOR, 0.5);

            // Play hit sound
            this.hitSound?.play();

            // Create +10 hit marker text
            const primaryColorHex = this.registry.get('primaryColor') || '#a8d67e';
            const hitMarker = this.add.text(cell.rect.x, cell.rect.y, '+10', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: primaryColorHex,
                fontStyle: 'bold'
            });
            hitMarker.setOrigin(0.5);
            hitMarker.setDepth(200);

            // Animate the hit marker - rise and fade out
            this.tweens.add({
                targets: hitMarker,
                y: cell.rect.y - 40,
                alpha: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => {
                    hitMarker.destroy();
                }
            });

            // Increase score
            this.score += 10;
            this.game.events.emit('scoreUpdate', this.score);
        }
    }

    private gameOver() {
        this.isGameOver = true;

        // Reset all active target cells to white
        this.activeTargets.forEach(target => {
            target.cell.rect.setFillStyle(WHITE_COLOR, 0.3);
            target.cell.rect.setStrokeStyle(2, WHITE_COLOR, 0.5);
        });
        this.activeTargets = [];

        this.game.events.emit('gameOver', this.score);
    }

    shutdown() {
        // Restore default cursor
        this.input.setDefaultCursor('default');
    }
}

export const createZAimGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a1a',
        scene: ZAimScene,
    };
};
