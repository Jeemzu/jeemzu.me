import Phaser from 'phaser';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const GRID_PADDING_X = 240;
const GRID_PADDING_TOP = 120;
const GRID_PADDING_BOTTOM = 20;
const CELL_SPACING = 0;
const INACTIVE_FILL = 0x2d2d2d;
const INACTIVE_STROKE = 0x1a1a1a;

const END_INITIAL_TIME = 12000; // 12s timer
const END_BASE_THRESHOLD = 40; // clicks needed for each time bonus
const END_TIME_BONUS = 10000; // +10s on threshold clear

const REFLEX_ROUNDS = 5;
const REFLEX_MIN_DELAY = 1000;
const REFLEX_MAX_DELAY = 3000;
const SPEED_DURATION = 10000;

export type GameMode = 'endurance' | 'reflex' | 'speed';

interface GridCell {
    rect: Phaser.GameObjects.Rectangle;
    row: number;
    col: number;
    isTarget: boolean;
}

export class ZAimScene extends Phaser.Scene {
    private gameMode: GameMode = 'endurance';
    private gridCells: GridCell[] = [];
    private isGameOver = false;
    private cellWidth = 0;
    private cellHeight = 0;
    private targetColor = 0xa8d67e;
    private hitSound?: Phaser.Sound.BaseSound;

    private crosshair!: Phaser.GameObjects.Arc;
    private crosshairGraphics!: Phaser.GameObjects.Graphics;
    private cameraZoom = 1;

    private endScore = 0;
    private endStage = 1;
    private endStageClicks = 0;
    private endTimeRemaining = 0;
    private endCountdownActive = true;
    private endTimerText!: Phaser.GameObjects.Text;
    private endTimerBar!: Phaser.GameObjects.Rectangle;
    private endStageText!: Phaser.GameObjects.Text;
    private endProgressText!: Phaser.GameObjects.Text;
    private endProgressBar!: Phaser.GameObjects.Rectangle;

    private reflexPhase: 'countdown' | 'waiting' | 'active' | 'between' | 'done' = 'countdown';
    private reflexRound = 1;
    private reflexTimes: number[] = [];
    private reflexRoundStart = 0;
    private reflexActiveCell: GridCell | null = null;
    private reflexRoundText!: Phaser.GameObjects.Text;
    private reflexCenterText!: Phaser.GameObjects.Text;

    private speedTimeRemaining = 0;
    private speedClicks = 0;
    private speedTimerBar!: Phaser.GameObjects.Rectangle;
    private speedTimerText!: Phaser.GameObjects.Text;
    private speedClicksText!: Phaser.GameObjects.Text;

    constructor() { super({ key: 'zAimScene' }); }

    preload() {
        this.load.audio('zaimHit', '/sounds/zaim_hit.mp3');
    }

    init(data: { gameMode?: GameMode; primaryColor?: string }) {
        if (data.gameMode) this.gameMode = data.gameMode;
        if (data.primaryColor) this.registry.set('primaryColor', data.primaryColor);
    }

    create() {
        const colorHex: string = this.registry.get('primaryColor') || '#a8d67e';
        this.targetColor = parseInt(colorHex.replace('#', ''), 16);
        const volume: number = this.registry.get('volume') ?? 0.5;

        if (!this.hitSound) {
            this.hitSound = this.sound.add('zaimHit', { volume: volume * 0.6 });
        } else {
            (this.hitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(volume * 0.6);
        }

        this.gridCells = [];
        this.isGameOver = false;

        this.cameras.main.setBackgroundColor('#1a1a1a');
        const zoom = Math.min(this.scale.width / CANVAS_WIDTH, this.scale.height / CANVAS_HEIGHT);
        this.cameraZoom = zoom;
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        // Reflex uses a 2x2 grid with wider tiles; all other modes use 4x4.
        const gridCols = this.gameMode === 'reflex' ? 2 : GRID_COLS;
        const gridRows = this.gameMode === 'reflex' ? 2 : GRID_ROWS;
        const gridPadX = this.gameMode === 'reflex' ? 150 : GRID_PADDING_X;
        const availW = CANVAS_WIDTH - gridPadX * 2;
        const availH = CANVAS_HEIGHT - GRID_PADDING_TOP - GRID_PADDING_BOTTOM;
        const rawCellW = (availW - CELL_SPACING * (gridCols - 1)) / gridCols;
        const rawCellH = (availH - CELL_SPACING * (gridRows - 1)) / gridRows;
        const cellSize = Math.min(rawCellW, rawCellH);
        this.cellWidth = cellSize;
        this.cellHeight = cellSize;
        const gridW = gridCols * cellSize + CELL_SPACING * (gridCols - 1);
        const gridH = gridRows * cellSize + CELL_SPACING * (gridRows - 1);
        const offsetX = (CANVAS_WIDTH - gridW) / 2;
        const offsetY = GRID_PADDING_TOP + (availH - gridH) / 2;

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const x = offsetX + col * (cellSize + CELL_SPACING) + cellSize / 2;
                const y = offsetY + row * (cellSize + CELL_SPACING) + cellSize / 2;
                const rect = this.add.rectangle(x, y, this.cellWidth, this.cellHeight, INACTIVE_FILL, 1);
                rect.setStrokeStyle(2, INACTIVE_STROKE, 1);
                rect.setInteractive({ useHandCursor: false });
                const cell: GridCell = { rect, row, col, isTarget: false };
                this.gridCells.push(cell);
                rect.on('pointerdown', () => this.onCellClick(cell));
            }
        }

        this.input.setDefaultCursor('none');
        this.crosshair = this.add.circle(0, 0, 5, 0xff3333, 0.9);
        this.crosshair.setStrokeStyle(2, 0xffffff, 1);
        this.crosshair.setDepth(1000);
        this.crosshairGraphics = this.add.graphics().setDepth(1000);
        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
            const wx = ptr.worldX, wy = ptr.worldY;
            this.crosshair.setPosition(wx, wy);
            this.crosshairGraphics.clear();
            this.crosshairGraphics.lineStyle(2, 0xffffff, 0.8);
            this.crosshairGraphics.beginPath();
            this.crosshairGraphics.moveTo(wx - 15, wy); this.crosshairGraphics.lineTo(wx - 5, wy);
            this.crosshairGraphics.moveTo(wx + 5, wy); this.crosshairGraphics.lineTo(wx + 15, wy);
            this.crosshairGraphics.moveTo(wx, wy - 15); this.crosshairGraphics.lineTo(wx, wy - 5);
            this.crosshairGraphics.moveTo(wx, wy + 5); this.crosshairGraphics.lineTo(wx, wy + 15);
            this.crosshairGraphics.strokePath();
        });

        this.events.on('volumeChange', (v: number) => {
            if (this.hitSound) (this.hitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(v * 0.6);
        });

        if (this.gameMode === 'endurance') this.initEndurance();
        else if (this.gameMode === 'reflex') this.initReflex();
        else this.initSpeed();

        this.game.events.emit('scoreUpdate', 0);
    }

    update(_t: number, delta: number) {
        if (this.isGameOver) return;
        if (this.gameMode === 'endurance') this.updateEndurance(delta);
        else if (this.gameMode === 'speed') this.updateSpeed(delta);
    }

    private onCellClick(cell: GridCell) {
        if (this.isGameOver) return;
        if (this.gameMode === 'endurance') this.clickEndurance(cell);
        else if (this.gameMode === 'reflex') this.clickReflex(cell);
        else this.clickSpeed(cell);
    }

    // ── ENDURANCE ─────────────────────────────────────────────────────────────

    private initEndurance() {
        this.endScore = 0; this.endStage = 1; this.endStageClicks = 0;
        this.endTimeRemaining = END_INITIAL_TIME;

        const BAR_W = CANVAS_WIDTH - 40;
        this.add.rectangle(CANVAS_WIDTH / 2, 8, BAR_W, 6, 0x333333).setOrigin(0.5);
        this.endTimerBar = this.add.rectangle(20, 8, BAR_W, 6, this.targetColor).setOrigin(0, 0.5);
        this.endStageText = this.add.text(28, 24, 'STAGE 1', { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#888888', resolution: this.cameraZoom }).setOrigin(0, 0.5);
        this.add.text(CANVAS_WIDTH / 2, 24, 'TIME', { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#666666', resolution: this.cameraZoom }).setOrigin(0.5);
        this.endProgressText = this.add.text(CANVAS_WIDTH - 28, 24, '0/' + END_BASE_THRESHOLD, { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#888888', resolution: this.cameraZoom }).setOrigin(1, 0.5);
        this.endTimerText = this.add.text(CANVAS_WIDTH / 2, 60, (END_INITIAL_TIME / 1000).toFixed(1), { fontSize: '46px', fontFamily: 'NectoMono-Regular', color: '#ffffff', resolution: this.cameraZoom }).setOrigin(0.5);
        this.add.rectangle(CANVAS_WIDTH / 2, 90, BAR_W, 6, 0x333333).setOrigin(0.5);
        this.endProgressBar = this.add.rectangle(20, 90, 0, 6, this.targetColor, 0.7).setOrigin(0, 0.5);

        // Countdown then start
        this.endCountdownActive = true;
        const countdownText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '', { fontSize: '64px', fontFamily: 'NectoMono-Regular', color: '#ffffff', resolution: this.cameraZoom }).setOrigin(0.5).setDepth(700).setAlpha(0);
        const colorHex: string = this.registry.get('primaryColor') || '#a8d67e';
        const steps: [string, number, string][] = [['3', 700, '#ffffff'], ['2', 700, '#ffffff'], ['1', 700, '#ffffff'], ['GO!', 500, colorHex]];
        let t = 0;
        for (const [txt, dur, col] of steps) {
            this.time.delayedCall(t, () => {
                if (this.isGameOver) return;
                countdownText.setText(txt).setColor(col).setAlpha(0).setScale(1);
                this.tweens.add({ targets: countdownText, alpha: 1, duration: 120, ease: 'Power2' });
            });
            t += dur;
        }
        this.time.delayedCall(t, () => {
            if (this.isGameOver) return;
            this.tweens.add({ targets: countdownText, alpha: 0, duration: 200, onComplete: () => countdownText.destroy() });
            this.endCountdownActive = false;
            this.endSpawnGroup(3);
        });
    }

    private updateEndurance(delta: number) {
        if (this.endCountdownActive) return;
        this.endTimeRemaining -= delta;
        if (this.endTimeRemaining <= 0) { this.endTimeRemaining = 0; this.endGameOver(); return; }

        const secs = this.endTimeRemaining / 1000;
        this.endTimerText.setText(secs.toFixed(1));
        this.endTimerText.setStyle({ color: secs <= 3 ? '#ff4444' : secs <= 6 ? '#ffaa44' : '#ffffff' });
        const barColor = secs <= 3 ? 0xff4444 : secs <= 6 ? 0xffaa44 : this.targetColor;
        this.endTimerBar.setSize((CANVAS_WIDTH - 40) * Math.min(this.endTimeRemaining / END_INITIAL_TIME, 1), 6);
        this.endTimerBar.setFillStyle(barColor, 1);
    }

    private clickEndurance(cell: GridCell) {
        if (this.endCountdownActive) return;
        if (cell.isTarget) {
            cell.isTarget = false;
            this.tweens.killTweensOf(cell.rect);
            cell.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(1, INACTIVE_STROKE, 1);
            this.hitSound?.play();

            this.endScore += 10; this.endStageClicks++;
            this.game.events.emit('scoreUpdate', this.endScore);

            // Update progress bar
            const frac = Math.min(this.endStageClicks / END_BASE_THRESHOLD, 1);
            this.endProgressBar.setSize((CANVAS_WIDTH - 40) * frac, 6);
            this.endProgressText.setText(this.endStageClicks + '/' + END_BASE_THRESHOLD);

            // Check threshold: award +10s
            if (this.endStageClicks >= END_BASE_THRESHOLD) {
                this.endAdvanceStage();
            }

            // Spawn 1 new tile at a random inactive spot (never same cell)
            this.endSpawnGroup(1, cell);
        } else {
            this.tweens.killTweensOf(cell.rect);
            cell.rect.setScale(1).setFillStyle(0xff2222, 1);
            this.time.delayedCall(180, () => this.endGameOver());
        }
    }

    private endAdvanceStage() {
        this.endStage++; this.endStageClicks = 0;
        this.endTimeRemaining += END_TIME_BONUS;
        this.endStageText.setText('STAGE ' + this.endStage);
        this.endProgressText.setText('0/' + END_BASE_THRESHOLD);
        this.endProgressBar.setSize(0, 6);
        const colorHex: string = this.registry.get('primaryColor') || '#a8d67e';
        const popup = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '+10s', { fontSize: '48px', fontFamily: 'NectoMono-Regular', color: colorHex, fontStyle: 'bold', resolution: this.cameraZoom }).setOrigin(0.5).setDepth(600);
        this.tweens.add({ targets: popup, y: popup.y - 60, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => popup.destroy() });
        this.cameras.main.flash(200, 100, 255, 100, false);
    }

    private endSpawnGroup(count: number, exclude?: GridCell) {
        const inactive = this.gridCells.filter(c => !c.isTarget && c !== exclude);
        if (inactive.length === 0) return;
        const toActivate = Phaser.Utils.Array.Shuffle(inactive).slice(0, Math.min(count, inactive.length));
        for (const cell of toActivate) {
            cell.isTarget = true;
            cell.rect.setFillStyle(this.targetColor, 1).setStrokeStyle(1, INACTIVE_STROKE, 1).setScale(0.88);
            this.tweens.add({ targets: cell.rect, scaleX: 1, scaleY: 1, duration: 80, ease: 'Back.Out' });
        }
    }

    private endGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        for (const c of this.gridCells) {
            if (c.isTarget) { c.isTarget = false; this.tweens.killTweensOf(c.rect); c.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(2, INACTIVE_STROKE, 1); }
        }
        this.game.events.emit('gameOver', {
            score: this.endScore,
            stats: [
                { label: 'Tiles Hit', value: this.endScore / 10 },
                { label: 'Stage', value: this.endStage },
            ],
        });
    }

    // ── REFLEX ────────────────────────────────────────────────────────────────

    private initReflex() {
        this.reflexRound = 1; this.reflexTimes = []; this.reflexPhase = 'countdown'; this.reflexActiveCell = null;
        this.reflexRoundText = this.add.text(28, 24, 'ROUND 1 / ' + REFLEX_ROUNDS, { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#888888', resolution: this.cameraZoom }).setOrigin(0, 0.5);
        this.reflexCenterText = this.add.text(CANVAS_WIDTH / 2, 60, '', { fontSize: '46px', fontFamily: 'NectoMono-Regular', color: '#ffffff', resolution: this.cameraZoom }).setOrigin(0.5).setDepth(500).setAlpha(0);
        this.runCountdown(() => this.reflexWait());
    }

    private runCountdown(onDone: () => void) {
        const colorHex: string = this.registry.get('primaryColor') || '#a8d67e';
        const steps: [string, number, string][] = [['3', 700, '#ffffff'], ['2', 700, '#ffffff'], ['1', 700, '#ffffff'], ['GO!', 500, colorHex]];
        let t = 0;
        for (const [txt, dur, col] of steps) {
            this.time.delayedCall(t, () => {
                if (this.isGameOver) return;
                this.reflexCenterText.setText(txt).setColor(col).setAlpha(0).setScale(1);
                this.tweens.add({ targets: this.reflexCenterText, alpha: 1, duration: 150, ease: 'Power2' });
            });
            t += dur;
        }
        this.time.delayedCall(t, () => {
            if (this.isGameOver) return;
            this.tweens.add({ targets: this.reflexCenterText, alpha: 0, duration: 300, onComplete: () => { this.reflexCenterText.setText(''); onDone(); } });
        });
    }

    private reflexWait() {
        this.reflexPhase = 'waiting';
        const delay = REFLEX_MIN_DELAY + Math.random() * (REFLEX_MAX_DELAY - REFLEX_MIN_DELAY);
        this.time.delayedCall(delay, () => { if (!this.isGameOver && this.reflexPhase === 'waiting') this.reflexActivate(); });
    }

    private reflexActivate() {
        this.reflexPhase = 'active';
        const cell: GridCell = Phaser.Utils.Array.GetRandom(this.gridCells);
        this.reflexActiveCell = cell;
        cell.isTarget = true;
        cell.rect.setFillStyle(this.targetColor, 1).setStrokeStyle(1, INACTIVE_STROKE, 1).setScale(0.88);
        this.tweens.add({ targets: cell.rect, scaleX: 1, scaleY: 1, duration: 80, ease: 'Back.Out' });
        this.reflexRoundStart = this.time.now;
    }

    private clickReflex(cell: GridCell) {
        if (this.reflexPhase !== 'active') return;
        if (cell === this.reflexActiveCell) {
            const ms = Math.round(this.time.now - this.reflexRoundStart);
            this.reflexTimes.push(ms); this.hitSound?.play();
            cell.isTarget = false; this.tweens.killTweensOf(cell.rect);
            cell.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(1, INACTIVE_STROKE, 1);
            this.reflexActiveCell = null; this.reflexPhase = 'between';
            const colorHex: string = this.registry.get('primaryColor') || '#a8d67e';
            const fb = this.add.text(cell.rect.x, cell.rect.y - 10, ms + 'ms', { fontSize: '22px', fontFamily: 'NectoMono-Regular', color: colorHex, fontStyle: 'bold' }).setOrigin(0.5).setDepth(500);
            this.tweens.add({ targets: fb, y: fb.y - 55, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => fb.destroy() });
            this.game.events.emit('scoreUpdate', this.reflexTimes.length);
            if (this.reflexTimes.length >= REFLEX_ROUNDS) {
                this.time.delayedCall(900, () => this.reflexGameOver());
            } else {
                this.reflexRound++;
                this.reflexRoundText.setText('ROUND ' + this.reflexRound + ' / ' + REFLEX_ROUNDS);
                this.time.delayedCall(900, () => { if (!this.isGameOver) this.reflexWait(); });
            }
        } else {
            this.tweens.killTweensOf(cell.rect); cell.rect.setScale(1).setFillStyle(0xff2222, 1);
            this.time.delayedCall(180, () => this.reflexGameOver(true));
        }
    }

    private reflexGameOver(miss = false) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        for (const c of this.gridCells) {
            if (c.isTarget) { c.isTarget = false; this.tweens.killTweensOf(c.rect); c.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(2, INACTIVE_STROKE, 1); }
        }
        const completed = this.reflexTimes.length;
        const avg = completed > 0 ? Math.round(this.reflexTimes.reduce((a, b) => a + b, 0) / completed) : 9999;
        const storedScore = Math.max(0, 10000 - avg);
        const stats = this.reflexTimes.map((t, i) => ({ label: 'Round ' + (i + 1), value: t + 'ms' }));
        if (completed > 1) stats.push({ label: 'Average', value: avg + 'ms' });
        if (miss) stats.push({ label: 'Result', value: 'Missed!' });
        this.game.events.emit('gameOver', { score: storedScore, stats });
    }

    // ── SPEED ─────────────────────────────────────────────────────────────────

    private initSpeed() {
        this.speedTimeRemaining = SPEED_DURATION; this.speedClicks = 0;
        const BAR_W = CANVAS_WIDTH - 40;
        this.add.rectangle(CANVAS_WIDTH / 2, 8, BAR_W, 6, 0x333333).setOrigin(0.5);
        this.speedTimerBar = this.add.rectangle(20, 8, BAR_W, 6, this.targetColor).setOrigin(0, 0.5);
        this.add.text(CANVAS_WIDTH / 2, 24, 'TIME', { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#666666' }).setOrigin(0.5);
        this.speedTimerText = this.add.text(CANVAS_WIDTH / 2, 60, '10.0', { fontSize: '46px', fontFamily: 'NectoMono-Regular', color: '#ffffff' }).setOrigin(0.5);
        this.speedClicksText = this.add.text(CANVAS_WIDTH / 2, 95, 'TILES: 0', { fontSize: '13px', fontFamily: 'NectoMono-Regular', color: '#888888' }).setOrigin(0.5);
        this.speedActivateAll();
    }

    private speedActivateAll() {
        for (const cell of this.gridCells) {
            cell.isTarget = true; this.tweens.killTweensOf(cell.rect);
            cell.rect.setFillStyle(this.targetColor, 1).setStrokeStyle(1, INACTIVE_STROKE, 1).setScale(0.88);
            this.tweens.add({ targets: cell.rect, scaleX: 1, scaleY: 1, duration: 80, ease: 'Back.Out' });
        }
    }

    private updateSpeed(delta: number) {
        this.speedTimeRemaining -= delta;
        if (this.speedTimeRemaining <= 0) { this.speedTimeRemaining = 0; this.speedGameOver(); return; }
        const secs = this.speedTimeRemaining / 1000;
        this.speedTimerText.setText(secs.toFixed(1));
        this.speedTimerText.setStyle({ color: secs <= 3 ? '#ff4444' : secs <= 5 ? '#ffaa44' : '#ffffff' });
        const barColor = secs <= 3 ? 0xff4444 : secs <= 5 ? 0xffaa44 : this.targetColor;
        this.speedTimerBar.setSize(Math.max(0, (CANVAS_WIDTH - 40) * (this.speedTimeRemaining / SPEED_DURATION)), 6);
        this.speedTimerBar.setFillStyle(barColor, 1);
    }

    private clickSpeed(cell: GridCell) {
        if (cell.isTarget) {
            cell.isTarget = false; this.tweens.killTweensOf(cell.rect);
            cell.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(1, INACTIVE_STROKE, 1);
            this.hitSound?.play();
            this.speedClicks++; this.game.events.emit('scoreUpdate', this.speedClicks);
            this.speedClicksText.setText('TILES: ' + this.speedClicks);
            if (this.gridCells.every(c => !c.isTarget)) this.speedActivateAll();
        } else {
            this.tweens.killTweensOf(cell.rect); cell.rect.setScale(1).setFillStyle(0xff2222, 1);
            this.time.delayedCall(180, () => this.speedGameOver());
        }
    }

    private speedGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        for (const c of this.gridCells) {
            if (c.isTarget) { c.isTarget = false; this.tweens.killTweensOf(c.rect); c.rect.setScale(1).setFillStyle(INACTIVE_FILL, 1).setStrokeStyle(2, INACTIVE_STROKE, 1); }
        }
        this.game.events.emit('gameOver', { score: this.speedClicks, stats: [{ label: 'Tiles Clicked', value: this.speedClicks }] });
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    shutdown() {
        this.input.setDefaultCursor('default');
    }
}

export const createZAimGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => ({
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#1a1a1a',
    scene: ZAimScene,
});