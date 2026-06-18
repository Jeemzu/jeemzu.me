import Phaser from 'phaser';
import { LEVELS, TOTAL_LEVELS, BRICK_COLS, getBrickType, type BrickType } from './brickbreak/levels';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 720;

const PADDLE_WIDTH = 110;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = CANVAS_HEIGHT - 48;
const PADDLE_SPEED = 760;

const BALL_RADIUS = 7;
const BASE_BALL_SPEED = 450;
const MAX_BALLS = 6;

const BRICK_GAP = 6;
const BRICK_HEIGHT = 24;
const BRICK_TOP = 72;
const BRICK_SIDE_MARGIN = 54;
const BRICK_WIDTH = (CANVAS_WIDTH - BRICK_SIDE_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;

const SERVE_DELAY = 1200;
const START_LIVES = 3;
const MAX_LIVES = 5;
const START_AMMO = 3;
const MAX_AMMO = 6;

const DROP_SPEED = 200;
const DROP_WIDTH = 30;
const DROP_RADIUS = DROP_WIDTH / 2;  // 15 px — circle drops
const DROP_CHANCE = 0.16;

const UNLOCK_KEY = 'brickbreak_highest_completed';
const HIGHSCORE_KEY = 'highScore_Brick Break';

// ─── unlock storage helpers ────────────────────────────────────────────────

function getHighestCompleted(): number {
    return parseInt(localStorage.getItem(UNLOCK_KEY) ?? '0', 10);
}

function markCompleted(level: number): void {
    if (level > getHighestCompleted()) {
        localStorage.setItem(UNLOCK_KEY, String(level));
    }
}

function isUnlocked(level: number): boolean {
    return level === 1 || getHighestCompleted() >= level - 1;
}

// ─── powerups / debuffs ────────────────────────────────────────────────────

type EffectKind = 'expand' | 'multi' | 'slow' | 'life' | 'shrink' | 'fast' | 'ammo';

interface PowerDef {
    color: number;
    good: boolean;
    weight: number;
}

const POWER_DEFS: Record<EffectKind, PowerDef> = {
    expand: { color: 0x5ad65a, good: true,  weight: 3 },
    multi:  { color: 0x4dd6d6, good: true,  weight: 2 },
    slow:   { color: 0x4d8cff, good: true,  weight: 2 },
    life:   { color: 0xff6fae, good: true,  weight: 1 },
    ammo:   { color: 0xffd700, good: true,  weight: 2 },
    shrink: { color: 0xff5252, good: false, weight: 2 },
    fast:   { color: 0xff9d2e, good: false, weight: 2 },
};

// ─── internal types ────────────────────────────────────────────────────────

const BBState = {
    LevelSelect: 'levelSelect',
    Serving: 'serving',
    Playing: 'playing',
    LevelComplete: 'levelComplete',
    GameOver: 'gameOver',
} as const;
type BBState = (typeof BBState)[keyof typeof BBState];

interface Ball {
    obj: Phaser.GameObjects.Arc;
    vx: number;
    vy: number;
    stuck: boolean;       // true while held on paddle awaiting release
    stickOffset: number;  // x offset from paddle centre when stuck
}

interface BrickObj {
    rect: Phaser.GameObjects.Rectangle;
    type: BrickType;
    hp: number;
    alive: boolean;
}

interface Drop {
    gfx: Phaser.GameObjects.Graphics;
    kind: EffectKind;
}

function darken(color: number, factor: number): number {
    const r = Math.round(((color >> 16) & 0xff) * factor);
    const g = Math.round(((color >> 8) & 0xff) * factor);
    const b = Math.round((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
}

function hexStr(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
}

// Draws a filled circle with a white vector icon, all relative to (0, 0).
// Attach to a Graphics object whose x/y is the drop centre.
function drawDropIcon(g: Phaser.GameObjects.Graphics, kind: EffectKind, bgColor: number): void {
    // Background circle
    g.fillStyle(bgColor, 0.92);
    g.fillCircle(0, 0, DROP_RADIUS);
    g.lineStyle(1.5, 0xffffff, 0.45);
    g.strokeCircle(0, 0, DROP_RADIUS);

    g.fillStyle(0xffffff, 0.95);

    switch (kind) {
        case 'expand':
            // ← · → outward arrows
            g.fillTriangle(-9, 0, -4, -4, -4, 4);   // left arrow (tip left)
            g.fillTriangle(9, 0, 4, -4, 4, 4);       // right arrow (tip right)
            g.fillRect(-4, -1.5, 8, 3);              // centre bar
            break;
        case 'shrink':
            // → · ← inward arrows (no bar — gap shows compression)
            g.fillTriangle(-2, 0, -8, -4, -8, 4);   // left side, tip toward centre
            g.fillTriangle(2, 0, 8, -4, 8, 4);       // right side, tip toward centre
            break;
        case 'multi':
            // Three balls arranged in a triangle
            g.fillCircle(-5, 4, 3.5);
            g.fillCircle(5, 4, 3.5);
            g.fillCircle(0, -4, 3.5);
            break;
        case 'slow':
            // ↓ downward arrow
            g.fillRect(-2, -7, 4, 8);                // shaft (y -7 → 1)
            g.fillTriangle(0, 8, -6, 1, 6, 1);      // arrowhead
            break;
        case 'fast':
            // ⚡ lightning bolt — two triangles forming a Z
            g.fillTriangle(5, -8, -3, 0, 5, 0);     // upper half
            g.fillTriangle(-5, 0, 3, 0, -5, 8);     // lower half
            break;
        case 'life':
            // ♥ heart
            g.fillCircle(-3.5, -1.5, 4.5);          // left lobe
            g.fillCircle(3.5, -1.5, 4.5);           // right lobe
            g.fillTriangle(0, 8, -7, 0, 7, 0);      // bottom point
            break;
        case 'ammo':
            // ⊕ crosshair reticle
            g.fillCircle(0, 0, 2);                   // centre dot
            g.fillRect(-10, -1.5, 6, 3);             // left bar
            g.fillRect(4, -1.5, 6, 3);               // right bar
            g.fillRect(-1.5, -10, 3, 6);             // top bar
            g.fillRect(-1.5, 4, 3, 6);               // bottom bar
            break;
    }
}

export class BrickBreakScene extends Phaser.Scene {
    private state: BBState = BBState.LevelSelect;

    private paddle?: Phaser.GameObjects.Rectangle;
    private balls: Ball[] = [];
    private bricks: BrickObj[] = [];
    private drops: Drop[] = [];

    private level = 1;
    private score = 0;
    private lives = START_LIVES;
    private highScore = 0;

    private ballSpeed = BASE_BALL_SPEED;
    private speedMultiplier = 1;
    private speedEffectTimer = 0;
    private paddleWidth = PADDLE_WIDTH;
    private paddleEffectTimer = 0;
    private serveTimer = 0;
    private ammo = START_AMMO;

    private primaryColor = 0xa8d67e;

    private keysHeld = new Set<string>();
    private onKeyDown = (e: KeyboardEvent) => {
        this.keysHeld.add(e.code);
        // One-shot release — only in Playing state, ignore key-repeat
        if (!e.repeat && e.code === 'Space' && this.state === BBState.Playing) {
            this.releaseStuckBalls();
        }
    };
    private onKeyUp = (e: KeyboardEvent) => this.keysHeld.delete(e.code);

    private hudText?: Phaser.GameObjects.Text;
    private centerText?: Phaser.GameObjects.Text;
    private transient: Phaser.GameObjects.GameObject[] = [];

    private breakSounds: Phaser.Sound.BaseSound[] = [];
    private wallHitSound?: Phaser.Sound.BaseSound;
    private loseSound?: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'BrickBreakScene' });
    }

    preload() {
        for (let i = 1; i <= 5; i++) {
            this.load.audio(`brickbreakBreak${i}`, `/sounds/brickbreak_break_${i}.mp3`);
        }
        this.load.audio('brickbreakWallHit', '/sounds/brickbreak_wall_hit.mp3');
        this.load.audio('brickbreakLose', '/sounds/brickbreak_lose.mp3');
    }

    create() {
        const primaryColorHex = this.registry.get('primaryColor') || '#a8d67e';
        this.primaryColor = parseInt(primaryColorHex.replace('#', ''), 16);

        const volume = this.registry.get('volume') ?? 0.5;
        this.initSounds(volume);

        this.cameras.main.setBackgroundColor('#16161f');

        // Boundary frame
        const frame = this.add.graphics();
        frame.lineStyle(2, 0x444455, 0.4);
        frame.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

        // Input — use window listeners so key state is never stuck when the
        // canvas loses focus inside the MUI Dialog.
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('keyup', this.onKeyUp);
        });

        this.input.on('pointerdown', () => {
            if (this.state === BBState.Serving) this.launchBalls();
            else if (this.state === BBState.Playing) this.releaseStuckBalls();
        });

        // Volume reactivity
        this.events.on('volumeChange', (newVolume: number) => this.applyVolume(newVolume));

        // Reset session state
        this.score = 0;
        this.lives = START_LIVES;
        this.highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY) ?? '0', 10);
        this.game.events.emit('scoreUpdate', this.score);

        this.showLevelSelect();
    }

    // ─── sounds ─────────────────────────────────────────────────────────────

    private initSounds(volume: number) {
        if (this.breakSounds.length === 0) {
            for (let i = 1; i <= 5; i++) {
                const key = `brickbreakBreak${i}`;
                if (this.cache.audio.exists(key)) {
                    this.breakSounds.push(this.sound.add(key, { volume: volume * 0.5 }));
                }
            }
        }
        if (!this.wallHitSound && this.cache.audio.exists('brickbreakWallHit')) {
            this.wallHitSound = this.sound.add('brickbreakWallHit', { volume: volume * 0.35 });
        }
        if (!this.loseSound && this.cache.audio.exists('brickbreakLose')) {
            this.loseSound = this.sound.add('brickbreakLose', { volume: volume * 0.6 });
        }
    }

    private applyVolume(v: number) {
        this.breakSounds.forEach(s =>
            (s as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(v * 0.5));
        (this.wallHitSound as Phaser.Sound.WebAudioSound | undefined)?.setVolume(v * 0.35);
        (this.loseSound as Phaser.Sound.WebAudioSound | undefined)?.setVolume(v * 0.6);
    }

    private playBreak() {
        if (this.breakSounds.length > 0) {
            this.breakSounds[Phaser.Math.Between(0, this.breakSounds.length - 1)].play();
        }
    }

    // ─── cleanup helpers ────────────────────────────────────────────────────

    private clearTransient() {
        this.transient.forEach(o => o.destroy());
        this.transient = [];
    }

    private clearGameplay() {
        this.balls.forEach(b => b.obj.destroy());
        this.balls = [];
        this.bricks.forEach(b => b.rect.destroy());
        this.bricks = [];
        this.drops.forEach(d => d.gfx.destroy());
        this.drops = [];
        this.paddle?.destroy();
        this.paddle = undefined;
        this.hudText?.destroy();
        this.hudText = undefined;
        this.centerText?.destroy();
        this.centerText = undefined;
    }

    // ─── level select ───────────────────────────────────────────────────────

    private showLevelSelect() {
        this.state = BBState.LevelSelect;
        this.clearGameplay();
        this.clearTransient();

        const title = this.add.text(CANVAS_WIDTH / 2, 70, 'SELECT LEVEL', {
            fontFamily: 'NectoMono-Regular', fontSize: '40px', color: hexStr(this.primaryColor),
        }).setOrigin(0.5);
        const hint = this.add.text(CANVAS_WIDTH / 2, 112, 'Clear a level to unlock the next', {
            fontFamily: 'NectoMono-Regular', fontSize: '15px', color: '#7a7a88',
        }).setOrigin(0.5);
        this.transient.push(title, hint);

        const cols = 5;
        const cellW = 150;
        const cellH = 90;
        const gapX = 20;
        const gapY = 22;
        const gridW = cols * cellW + (cols - 1) * gapX;
        const offsetX = (CANVAS_WIDTH - gridW) / 2;
        const offsetY = 160;
        const highest = getHighestCompleted();

        for (let i = 0; i < TOTAL_LEVELS; i++) {
            const n = i + 1;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = offsetX + col * (cellW + gapX) + cellW / 2;
            const cy = offsetY + row * (cellH + gapY) + cellH / 2;
            const unlocked = isUnlocked(n);
            const completed = highest >= n;

            const borderColor = completed ? this.primaryColor : unlocked ? 0xffffff : 0x333344;
            const borderAlpha = completed ? 0.8 : unlocked ? 0.2 : 0.15;
            const cell = this.add.rectangle(cx, cy, cellW, cellH, unlocked ? 0x1f1f2b : 0x14141c)
                .setStrokeStyle(2, borderColor, borderAlpha);
            this.transient.push(cell);

            if (unlocked) {
                const numText = this.add.text(cx, cy + (completed ? 4 : 0), String(n), {
                    fontFamily: 'NectoMono-Regular', fontSize: '34px',
                    color: completed ? hexStr(this.primaryColor) : '#dddddd',
                }).setOrigin(0.5);
                this.transient.push(numText);

                if (completed) {
                    const check = this.add.graphics();
                    check.lineStyle(2.5, this.primaryColor, 1);
                    check.beginPath();
                    check.moveTo(cx + cellW / 2 - 22, cy - cellH / 2 + 16);
                    check.lineTo(cx + cellW / 2 - 16, cy - cellH / 2 + 22);
                    check.lineTo(cx + cellW / 2 - 8, cy - cellH / 2 + 10);
                    check.strokePath();
                    this.transient.push(check);
                }

                cell.setInteractive({ useHandCursor: true });
                cell.on('pointerover', () => cell.setFillStyle(0x2a2a3a));
                cell.on('pointerout', () => cell.setFillStyle(0x1f1f2b));
                cell.on('pointerdown', () => this.startLevel(n, true));
            } else {
                // padlock
                const lock = this.add.graphics();
                lock.lineStyle(2.5, 0x555566, 1);
                lock.strokeRoundedRect(cx - 11, cy - 2, 22, 18, 3);
                lock.beginPath();
                lock.arc(cx, cy - 2, 7, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
                lock.strokePath();
                this.transient.push(lock);
            }
        }
    }

    // ─── level setup ────────────────────────────────────────────────────────

    private startLevel(level: number, resetScore: boolean) {
        this.clearTransient();
        this.clearGameplay();

        this.level = level;
        if (resetScore) {
            this.score = 0;
            this.lives = START_LIVES;
            this.game.events.emit('scoreUpdate', this.score);
        }

        this.ballSpeed = BASE_BALL_SPEED + (level - 1) * 8;
        this.speedMultiplier = 1;
        this.speedEffectTimer = 0;
        this.paddleWidth = PADDLE_WIDTH;
        this.paddleEffectTimer = 0;
        this.ammo = START_AMMO;

        this.buildLevel(level);
        this.applyPaddleWidth();
        this.spawnBallOnPaddle();

        this.hudText = this.add.text(14, 12, '', {
            fontFamily: 'NectoMono-Regular', fontSize: '16px', color: '#9aa0a6',
        }).setOrigin(0, 0);
        this.updateHud();

        this.centerText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60, 'Get Ready...', {
            fontFamily: 'NectoMono-Regular', fontSize: '24px', color: '#aaaaaa',
        }).setOrigin(0.5);

        this.state = BBState.Serving;
        this.serveTimer = 0;
    }

    private buildLevel(level: number) {
        const layout = LEVELS[level - 1] ?? [];
        for (let r = 0; r < layout.length; r++) {
            const rowStr = layout[r];
            for (let c = 0; c < Math.min(rowStr.length, BRICK_COLS); c++) {
                const ch = rowStr[c];
                if (ch === '.' || ch === ' ') continue;
                const type = getBrickType(ch);
                if (!type) continue;

                const x = BRICK_SIDE_MARGIN + c * (BRICK_WIDTH + BRICK_GAP) + BRICK_WIDTH / 2;
                const y = BRICK_TOP + r * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2;
                const rect = this.add.rectangle(x, y, BRICK_WIDTH, BRICK_HEIGHT, type.color)
                    .setStrokeStyle(1, 0xffffff, 0.15);
                this.bricks.push({ rect, type, hp: type.hits, alive: true });
            }
        }
    }

    private applyPaddleWidth() {
        const x = this.paddle ? this.paddle.x : CANVAS_WIDTH / 2;
        this.paddle?.destroy();
        this.paddle = this.add.rectangle(x, PADDLE_Y, this.paddleWidth, PADDLE_HEIGHT, this.primaryColor);
    }

    private spawnBallOnPaddle() {
        const px = this.paddle?.x ?? CANVAS_WIDTH / 2;
        const obj = this.add.circle(px, PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_RADIUS, BALL_RADIUS, 0xffffff);
        this.balls.push({ obj, vx: 0, vy: 0, stuck: false, stickOffset: 0 });
    }

    private launchBalls() {
        if (this.state !== BBState.Serving) return;
        this.state = BBState.Playing;
        this.centerText?.setVisible(false);
        const angle = Phaser.Math.Between(-25, 25) * (Math.PI / 180);
        const speed = this.currentSpeed();
        for (const b of this.balls) {
            b.vx = Math.sin(angle) * speed;
            b.vy = -Math.cos(angle) * speed;
            b.stuck = false;
        }
    }

    // Release all stuck balls with an aiming angle derived from their position
    // on the paddle. Costs 1 ammo. No-ops when no stuck balls or ammo = 0.
    private releaseStuckBalls() {
        const stuck = this.balls.filter(b => b.stuck);
        if (stuck.length === 0 || this.ammo <= 0) return;
        this.ammo = Math.max(0, this.ammo - 1);
        this.updateHud();
        const speed = this.currentSpeed();
        const half = this.paddleWidth / 2;
        for (const b of stuck) {
            const t = Phaser.Math.Clamp(b.stickOffset / half, -1, 1);
            const angle = t * Phaser.Math.DegToRad(60);
            b.vx = Math.sin(angle) * speed;
            b.vy = -Math.cos(angle) * speed;
            b.stuck = false;
        }
    }

    private currentSpeed(): number {
        return this.ballSpeed * this.speedMultiplier;
    }

    private updateHud() {
        const ammoPips = '●'.repeat(this.ammo) + '○'.repeat(Math.max(0, MAX_AMMO - this.ammo));
        this.hudText?.setText(`LEVEL ${this.level}    LIVES ${this.lives}    ${ammoPips}`);
    }

    // ─── main loop ──────────────────────────────────────────────────────────

    update(_time: number, delta: number) {
        if (this.state === BBState.Serving) {
            this.movePaddle(delta);
            const top = PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_RADIUS;
            for (const b of this.balls) {
                b.obj.x = this.paddle?.x ?? b.obj.x;
                b.obj.y = top;
            }
            this.serveTimer += delta;
            if (this.keysHeld.has('Space') || this.serveTimer >= SERVE_DELAY) {
                this.launchBalls();
            }
            return;
        }

        if (this.state !== BBState.Playing) return;

        this.movePaddle(delta);
        this.updateEffects(delta);
        this.updateBalls(delta);
        this.updateDrops(delta);

        if (this.balls.length === 0) {
            this.loseLife();
            return;
        }

        const remaining = this.bricks.some(b => b.alive && b.type.breakable);
        if (!remaining) this.onLevelComplete();
    }

    private movePaddle(delta: number) {
        if (!this.paddle) return;
        const half = this.paddleWidth / 2;
        const step = PADDLE_SPEED * (delta / 1000);
        const left = this.keysHeld.has('ArrowLeft') || this.keysHeld.has('KeyA');
        const right = this.keysHeld.has('ArrowRight') || this.keysHeld.has('KeyD');

        if (left) {
            this.paddle.x = Math.max(half, this.paddle.x - step);
        } else if (right) {
            this.paddle.x = Math.min(CANVAS_WIDTH - half, this.paddle.x + step);
        }
    }

    private updateEffects(delta: number) {
        if (this.paddleEffectTimer > 0) {
            this.paddleEffectTimer -= delta;
            if (this.paddleEffectTimer <= 0) {
                this.paddleWidth = PADDLE_WIDTH;
                this.applyPaddleWidth();
            }
        }
        if (this.speedEffectTimer > 0) {
            this.speedEffectTimer -= delta;
            if (this.speedEffectTimer <= 0) this.speedMultiplier = 1;
        }
    }

    private updateBalls(delta: number) {
        const dt = delta / 1000;
        const speed = this.currentSpeed();
        const survivors: Ball[] = [];

        for (const b of this.balls) {
            // Stuck balls sit on the paddle and wait for releaseStuckBalls()
            if (b.stuck) {
                if (this.paddle) {
                    b.obj.x = this.paddle.x + b.stickOffset;
                    b.obj.y = this.paddle.y - PADDLE_HEIGHT / 2 - BALL_RADIUS;
                }
                survivors.push(b);
                continue;
            }

            b.obj.x += b.vx * dt;
            b.obj.y += b.vy * dt;

            // Side walls
            if (b.obj.x - BALL_RADIUS <= 0) {
                b.obj.x = BALL_RADIUS;
                b.vx = Math.abs(b.vx);
                this.wallHitSound?.play();
            } else if (b.obj.x + BALL_RADIUS >= CANVAS_WIDTH) {
                b.obj.x = CANVAS_WIDTH - BALL_RADIUS;
                b.vx = -Math.abs(b.vx);
                this.wallHitSound?.play();
            }
            // Top wall
            if (b.obj.y - BALL_RADIUS <= 0) {
                b.obj.y = BALL_RADIUS;
                b.vy = Math.abs(b.vy);
                this.wallHitSound?.play();
            }

            this.reflectOffPaddle(b);
            this.checkBrickCollisions(b);

            // Lost ball
            if (b.obj.y > CANVAS_HEIGHT + BALL_RADIUS * 2) {
                b.obj.destroy();
                continue;
            }

            // Enforce constant speed (keeps direction from reflections)
            const mag = Math.hypot(b.vx, b.vy);
            if (mag > 0) {
                b.vx = (b.vx / mag) * speed;
                b.vy = (b.vy / mag) * speed;
            }
            survivors.push(b);
        }
        this.balls = survivors;
    }

    // Physics-based reflection: treat the paddle as a gently curved surface.
    // The contact normal tilts with the hit position, and the incoming
    // velocity is reflected about that normal (v' = v - 2(v·n)n), which
    // preserves the ball's speed.
    private reflectOffPaddle(b: Ball) {
        if (!this.paddle || b.vy <= 0) return;
        const half = this.paddleWidth / 2;
        const top = this.paddle.y - PADDLE_HEIGHT / 2;
        const within =
            b.obj.y + BALL_RADIUS >= top &&
            b.obj.y - BALL_RADIUS <= this.paddle.y + PADDLE_HEIGHT / 2 &&
            b.obj.x >= this.paddle.x - half &&
            b.obj.x <= this.paddle.x + half;
        if (!within) return;

        // Stick the ball to the paddle when ammo is available.
        // When ammo = 0 balls bounce freely — preserves playability and
        // prevents any softlock from balls being stuck with no way to release.
        if (this.ammo > 0) {
            b.stuck = true;
            b.stickOffset = Phaser.Math.Clamp(
                b.obj.x - this.paddle.x,
                -(half - BALL_RADIUS),
                half - BALL_RADIUS,
            );
            b.obj.y = top - BALL_RADIUS;
            b.vx = 0;
            b.vy = 0;
            this.wallHitSound?.play();
            return;
        }

        const t = Phaser.Math.Clamp((b.obj.x - this.paddle.x) / half, -1, 1);
        const tilt = t * Phaser.Math.DegToRad(60);
        const nx = Math.sin(tilt);
        const ny = -Math.cos(tilt);

        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
        }

        // Guarantee a sensible upward trajectory (avoid near-horizontal stalls)
        const mag = Math.hypot(b.vx, b.vy) || 1;
        const minUp = mag * 0.4;
        if (b.vy > -minUp) {
            b.vy = -minUp;
            const signX = b.vx >= 0 ? 1 : -1;
            b.vx = signX * Math.sqrt(Math.max(0, mag * mag - minUp * minUp));
        }
        b.obj.y = top - BALL_RADIUS;
        this.wallHitSound?.play();
    }

    private checkBrickCollisions(b: Ball) {
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            const bl = brick.rect.x - BRICK_WIDTH / 2;
            const br = brick.rect.x + BRICK_WIDTH / 2;
            const bt = brick.rect.y - BRICK_HEIGHT / 2;
            const bb = brick.rect.y + BRICK_HEIGHT / 2;

            if (
                b.obj.x + BALL_RADIUS >= bl &&
                b.obj.x - BALL_RADIUS <= br &&
                b.obj.y + BALL_RADIUS >= bt &&
                b.obj.y - BALL_RADIUS <= bb
            ) {
                const overlapLeft = (b.obj.x + BALL_RADIUS) - bl;
                const overlapRight = br - (b.obj.x - BALL_RADIUS);
                const overlapTop = (b.obj.y + BALL_RADIUS) - bt;
                const overlapBottom = bb - (b.obj.y - BALL_RADIUS);
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    b.vx = -b.vx;
                } else {
                    b.vy = -b.vy;
                }

                this.hitBrick(brick);
                break; // one brick per ball per frame
            }
        }
    }

    private hitBrick(brick: BrickObj) {
        if (!brick.type.breakable) {
            this.wallHitSound?.play();
            return;
        }

        brick.hp -= 1;
        if (brick.hp <= 0) {
            brick.alive = false;
            brick.rect.destroy();
            this.score += brick.type.points;
            this.game.events.emit('scoreUpdate', this.score);
            this.playBreak();
            if (Math.random() < DROP_CHANCE) {
                this.spawnDrop(brick.rect.x, brick.rect.y);
            }
        } else {
            // Damage feedback: darken remaining brick
            const factor = 0.6 + 0.4 * (brick.hp / brick.type.hits);
            brick.rect.setFillStyle(darken(brick.type.color, factor));
            this.wallHitSound?.play();
        }
    }

    // ─── powerups ───────────────────────────────────────────────────────────

    private pickPower(): EffectKind {
        const entries = Object.entries(POWER_DEFS) as [EffectKind, PowerDef][];
        const total = entries.reduce((s, [, d]) => s + d.weight, 0);
        let r = Math.random() * total;
        for (const [k, d] of entries) {
            r -= d.weight;
            if (r <= 0) return k;
        }
        return 'expand';
    }

    private spawnDrop(x: number, y: number) {
        const kind = this.pickPower();
        const def = POWER_DEFS[kind];
        const gfx = this.add.graphics();
        drawDropIcon(gfx, kind, def.color);
        gfx.x = x;
        gfx.y = y;
        this.drops.push({ gfx, kind });
    }

    private updateDrops(delta: number) {
        if (!this.paddle) return;
        const dt = delta / 1000;
        const half = this.paddleWidth / 2;
        const survivors: Drop[] = [];

        for (const d of this.drops) {
            d.gfx.y += DROP_SPEED * dt;

            const cx = d.gfx.x;
            const cy = d.gfx.y;
            const caught =
                cy + DROP_RADIUS >= this.paddle.y - PADDLE_HEIGHT / 2 &&
                cy - DROP_RADIUS <= this.paddle.y + PADDLE_HEIGHT / 2 &&
                cx >= this.paddle.x - half - DROP_RADIUS &&
                cx <= this.paddle.x + half + DROP_RADIUS;

            if (caught) {
                this.applyEffect(d.kind);
                d.gfx.destroy();
                continue;
            }
            if (cy > CANVAS_HEIGHT + DROP_RADIUS) {
                d.gfx.destroy();
                continue;
            }
            survivors.push(d);
        }
        this.drops = survivors;
    }

    private applyEffect(kind: EffectKind) {
        switch (kind) {
            case 'expand':
                this.paddleWidth = Math.min(PADDLE_WIDTH * 1.6, CANVAS_WIDTH * 0.5);
                this.applyPaddleWidth();
                this.paddleEffectTimer = 12000;
                break;
            case 'shrink':
                this.paddleWidth = PADDLE_WIDTH * 0.6;
                this.applyPaddleWidth();
                this.paddleEffectTimer = 10000;
                break;
            case 'slow':
                this.speedMultiplier = 0.6;
                this.speedEffectTimer = 9000;
                break;
            case 'fast':
                this.speedMultiplier = 1.5;
                this.speedEffectTimer = 8000;
                break;
            case 'life':
                this.lives = Math.min(MAX_LIVES, this.lives + 1);
                this.updateHud();
                break;
            case 'multi':
                this.spawnMultiball();
                break;
            case 'ammo':
                this.ammo = Math.min(MAX_AMMO, this.ammo + 2);
                this.updateHud();
                break;
        }
        this.playBreak();
    }

    private spawnMultiball() {
        const source = this.balls[0];
        if (!source) return;
        const speed = this.currentSpeed();
        const offsets = [Phaser.Math.DegToRad(-22), Phaser.Math.DegToRad(22)];
        for (const off of offsets) {
            if (this.balls.length >= MAX_BALLS) break;
            const baseAngle = Math.atan2(source.vy, source.vx) + off;
            const obj = this.add.circle(source.obj.x, source.obj.y, BALL_RADIUS, 0xffffff);
            this.balls.push({
                obj,
                vx: Math.cos(baseAngle) * speed,
                vy: Math.sin(baseAngle) * speed,
                stuck: false,
                stickOffset: 0,
            });
        }
    }

    // ─── life / win / lose ──────────────────────────────────────────────────

    private loseLife() {
        this.lives--;
        this.loseSound?.play();
        this.updateHud();

        if (this.lives <= 0) {
            this.onGameOver();
            return;
        }

        // Clear drops + active effects, re-serve a single ball
        this.drops.forEach(d => d.gfx.destroy());
        this.drops = [];
        this.paddleWidth = PADDLE_WIDTH;
        this.paddleEffectTimer = 0;
        this.speedMultiplier = 1;
        this.speedEffectTimer = 0;
        this.applyPaddleWidth();
        this.spawnBallOnPaddle();

        this.state = BBState.Serving;
        this.serveTimer = 0;
        this.centerText?.setVisible(true);
        this.centerText?.setText('Get Ready...');
    }

    private saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(HIGHSCORE_KEY, String(this.highScore));
        }
    }

    private onLevelComplete() {
        this.state = BBState.LevelComplete;
        this.balls.forEach(b => b.obj.destroy());
        this.balls = [];
        this.drops.forEach(d => d.gfx.destroy());
        this.drops = [];

        markCompleted(this.level);
        const bonus = this.lives * 100;
        this.score += bonus;
        this.game.events.emit('scoreUpdate', this.score);
        this.saveHighScore();
        this.playBreak();

        const hasNext = this.level < TOTAL_LEVELS;
        const lines = [
            `LEVEL ${this.level} COMPLETE`,
            `Score: ${this.score}   (+${bonus} bonus)`,
        ];
        const buttons: { label: string; onClick: () => void }[] = [];
        if (hasNext) buttons.push({ label: 'Next Level', onClick: () => this.startLevel(this.level + 1, false) });
        buttons.push({ label: 'Replay', onClick: () => this.startLevel(this.level, true) });
        buttons.push({ label: 'Level Select', onClick: () => this.showLevelSelect() });
        this.showOverlay(lines, buttons);
    }

    private onGameOver() {
        this.state = BBState.GameOver;
        this.balls.forEach(b => b.obj.destroy());
        this.balls = [];
        this.drops.forEach(d => d.gfx.destroy());
        this.drops = [];

        this.saveHighScore();
        this.showOverlay(
            ['GAME OVER', `Level ${this.level}`, `Score: ${this.score}`, `High Score: ${this.highScore}`],
            [
                { label: 'Retry', onClick: () => this.startLevel(this.level, true) },
                { label: 'Level Select', onClick: () => this.showLevelSelect() },
            ],
        );
    }

    // ─── overlay UI ─────────────────────────────────────────────────────────

    private showOverlay(lines: string[], buttons: { label: string; onClick: () => void }[]) {
        // Full-screen dim
        this.transient.push(
            this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.86)
        );

        const panelW = 460;
        const px = CANVAS_WIDTH / 2;
        const py = CANVAS_HEIGHT / 2;

        // Compute panel height from content
        let estimatedH = 82; // title row
        for (let i = 1; i < lines.length; i++) {
            estimatedH += lines[i].startsWith('High Score') ? 78 : 46;
        }
        estimatedH += 86; // button row + bottom padding
        const panelH = Math.max(280, estimatedH);
        const panelLeft = px - panelW / 2;
        const panelTop = py - panelH / 2;

        // Card background
        const g = this.add.graphics();
        g.fillStyle(0x0c0c1a, 0.98);
        g.fillRoundedRect(panelLeft, panelTop, panelW, panelH, 6);
        g.lineStyle(1, 0xffffff, 0.1);
        g.strokeRoundedRect(panelLeft, panelTop, panelW, panelH, 6);
        // Thin accent bar across the top
        g.fillStyle(this.primaryColor, 1);
        g.fillRect(panelLeft, panelTop, panelW, 3);
        this.transient.push(g);

        let y = panelTop + 40;

        // Title
        this.transient.push(
            this.add.text(px, y, lines[0], {
                fontFamily: 'NectoMono-Regular',
                fontSize: '38px',
                color: hexStr(this.primaryColor),
                letterSpacing: 3,
            }).setOrigin(0.5, 0)
        );
        y += 74;

        // Stat rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const isHighScore = line.startsWith('High Score');
            const isLevelLine = line.startsWith('Level ');

            if (isHighScore) {
                // Separator + extra breathing room
                const sep = this.add.graphics();
                sep.lineStyle(1, 0xffffff, 0.08);
                sep.beginPath();
                sep.moveTo(panelLeft + 28, y + 10);
                sep.lineTo(panelLeft + panelW - 28, y + 10);
                sep.strokePath();
                this.transient.push(sep);
                y += 30;
            }

            this.transient.push(
                this.add.text(px, y, line, {
                    fontFamily: 'NectoMono-Regular',
                    fontSize: isLevelLine ? '22px' : '19px',
                    color: isHighScore ? '#6a6a80' : isLevelLine ? '#c8c8e0' : '#ddddef',
                    letterSpacing: isLevelLine ? 2 : 0,
                }).setOrigin(0.5, 0)
            );
            y += isHighScore ? 48 : 44;
        }

        // Buttons anchored to panel bottom.
        // Width is derived from available panel space so any number of buttons fits.
        const gap = 14;
        const sideMargin = 28;
        const btnH = 38;
        const btnW = Math.min(148, (panelW - sideMargin * 2 - gap * (buttons.length - 1)) / buttons.length);
        const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
        let bx = px - totalW / 2 + btnW / 2;
        const by = panelTop + panelH - 36;
        buttons.forEach(b => {
            this.makeButton(bx, by, btnW, btnH, b.label, b.onClick);
            bx += btnW + gap;
        });
    }

    private makeButton(cx: number, cy: number, w: number, h: number, label: string, onClick: () => void) {
        const rect = this.add.rectangle(cx, cy, w, h, 0x000000, 0)
            .setStrokeStyle(1, 0xffffff, 0.2)
            .setInteractive({ useHandCursor: true });
        const txt = this.add.text(cx, cy, label, {
            fontFamily: 'NectoMono-Regular',
            fontSize: '14px',
            color: '#bbbbcc',
            letterSpacing: 1,
        }).setOrigin(0.5);
        rect.on('pointerover', () => {
            rect.setFillStyle(this.primaryColor, 0.12);
            rect.setStrokeStyle(1.5, this.primaryColor, 0.85);
            txt.setColor(hexStr(this.primaryColor));
        });
        rect.on('pointerout', () => {
            rect.setFillStyle(0x000000, 0);
            rect.setStrokeStyle(1, 0xffffff, 0.2);
            txt.setColor('#bbbbcc');
        });
        rect.on('pointerdown', onClick);
        this.transient.push(rect, txt);
    }
}

export const createBrickBreakGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#16161f',
        scene: BrickBreakScene,
    };
};
