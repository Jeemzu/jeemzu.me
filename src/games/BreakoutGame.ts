import Phaser from 'phaser';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 15;
const PADDLE_Y = CANVAS_HEIGHT - 40;
const PADDLE_SPEED = 500;
const BALL_SIZE = 10;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_WIDTH = 68;
const BRICK_HEIGHT = 22;
const BRICK_PADDING = 6;
const BRICK_OFFSET_X = 30;
const BRICK_OFFSET_Y = 50;
const INITIAL_BALL_SPEED = 350;

interface Brick {
    rect: Phaser.GameObjects.Rectangle;
    row: number;
    col: number;
    alive: boolean;
    points: number;
}

const ROW_COLORS = [
    0xff4444, // red
    0xff8844, // orange
    0xffcc44, // yellow
    0x44cc44, // green
    0x4488ff, // blue
    0x8844ff, // purple
];

const ROW_POINTS = [70, 60, 50, 40, 30, 20];

export class BreakoutScene extends Phaser.Scene {
    private paddle!: Phaser.GameObjects.Rectangle;
    private ball!: Phaser.GameObjects.Arc;
    private bricks: Brick[] = [];
    private ballVelocity: { x: number; y: number } = { x: 0, y: 0 };
    private score: number = 0;
    private lives: number = 3;
    private isGameOver: boolean = false;
    private isServing: boolean = true;
    private serveTimer: number = 0;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private primaryColor: number = 0xa8d67e;
    private breakSounds: Phaser.Sound.BaseSound[] = [];
    private wallHitSound?: Phaser.Sound.BaseSound;
    private loseSound?: Phaser.Sound.BaseSound;
    private bgMusic?: Phaser.Sound.BaseSound;
    private livesText!: Phaser.GameObjects.Text;
    private serveText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'BreakoutScene' });
    }

    preload() {
        for (let i = 1; i <= 5; i++) {
            this.load.audio(`breakoutBreak${i}`, `/sounds/breakout_break_${i}.mp3`);
        }
        this.load.audio('breakoutWallHit', '/sounds/breakout_wall_hit.mp3');
        this.load.audio('breakoutLose', '/sounds/breakout_lose.mp3');
        this.load.audio('breakoutMusic', '/sounds/breakout_music.mp3');
    }

    create() {
        const primaryColorHex = this.registry.get('primaryColor') || '#a8d67e';
        this.primaryColor = parseInt(primaryColorHex.replace('#', ''), 16);

        const volume = this.registry.get('volume') ?? 0.5;

        // Initialize sounds (gracefully handle missing audio files)
        if (this.breakSounds.length === 0) {
            for (let i = 1; i <= 5; i++) {
                try {
                    const key = `breakoutBreak${i}`;
                    if (this.cache.audio.exists(key)) {
                        this.breakSounds.push(this.sound.add(key, { volume: volume * 0.5 }));
                    }
                } catch { /* audio not available */ }
            }
        } else {
            this.breakSounds.forEach(s => {
                (s as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(volume * 0.5);
            });
        }
        try {
            if (!this.wallHitSound && this.cache.audio.exists('breakoutWallHit')) {
                this.wallHitSound = this.sound.add('breakoutWallHit', { volume: volume * 0.4 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.loseSound && this.cache.audio.exists('breakoutLose')) {
                this.loseSound = this.sound.add('breakoutLose', { volume: volume * 0.6 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.bgMusic && this.cache.audio.exists('breakoutMusic')) {
                this.bgMusic = this.sound.add('breakoutMusic', { volume: volume * 0.3, loop: true });
                this.bgMusic.play();
            }
        } catch { /* audio not available */ }

        // Reset state
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.isServing = true;
        this.serveTimer = 0;
        this.bricks = [];

        this.cameras.main.setBackgroundColor('#1a1a1a');

        // Create bricks
        for (let row = 0; row < BRICK_ROWS; row++) {
            for (let col = 0; col < BRICK_COLS; col++) {
                const x = BRICK_OFFSET_X + col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_WIDTH / 2;
                const y = BRICK_OFFSET_Y + row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_HEIGHT / 2;

                const rect = this.add.rectangle(x, y, BRICK_WIDTH, BRICK_HEIGHT, ROW_COLORS[row]);
                rect.setStrokeStyle(1, 0xffffff, 0.2);

                this.bricks.push({
                    rect,
                    row,
                    col,
                    alive: true,
                    points: ROW_POINTS[row],
                });
            }
        }

        // Create paddle
        this.paddle = this.add.rectangle(
            CANVAS_WIDTH / 2,
            PADDLE_Y,
            PADDLE_WIDTH,
            PADDLE_HEIGHT,
            this.primaryColor
        );

        // Create ball
        this.ball = this.add.circle(
            CANVAS_WIDTH / 2,
            PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_SIZE,
            BALL_SIZE / 2,
            0xffffff
        );

        // Lives text
        this.livesText = this.add.text(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20, `Lives: ${this.lives}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888',
        });
        this.livesText.setOrigin(1, 1);

        // Serve text
        this.serveText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80, 'Get Ready...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#888888',
        });
        this.serveText.setOrigin(0.5);

        // Draw boundary lines
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x444444, 0.4);
        graphics.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Keyboard
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Emit score
        this.game.events.emit('scoreUpdate', this.score);

        // Listen for volume changes
        this.events.on('volumeChange', (newVolume: number) => {
            this.breakSounds.forEach(s => {
                (s as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.5);
            });
            if (this.wallHitSound) {
                (this.wallHitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.4);
            }
            if (this.loseSound) {
                (this.loseSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.6);
            }
            if (this.bgMusic) {
                (this.bgMusic as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.3);
            }
        });
    }

    update(_time: number, delta: number) {
        if (this.isGameOver) return;

        // Serve delay
        if (this.isServing) {
            this.serveTimer += delta;
            // Ball follows paddle while serving
            this.ball.x = this.paddle.x;
            this.ball.y = PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_SIZE;

            // Still allow paddle movement during serve
            this.movePaddle(delta);

            if (this.serveTimer >= 1500) {
                this.isServing = false;
                this.serveText.setVisible(false);
                this.launchBall();
            }
            return;
        }

        // Paddle movement
        this.movePaddle(delta);

        // Move ball
        this.ball.x += this.ballVelocity.x * (delta / 1000);
        this.ball.y += this.ballVelocity.y * (delta / 1000);

        // Wall collisions (left/right)
        if (this.ball.x - BALL_SIZE / 2 <= 0) {
            this.ball.x = BALL_SIZE / 2;
            this.ballVelocity.x = Math.abs(this.ballVelocity.x);
            this.wallHitSound?.play();
        } else if (this.ball.x + BALL_SIZE / 2 >= CANVAS_WIDTH) {
            this.ball.x = CANVAS_WIDTH - BALL_SIZE / 2;
            this.ballVelocity.x = -Math.abs(this.ballVelocity.x);
            this.wallHitSound?.play();
        }

        // Top wall collision
        if (this.ball.y - BALL_SIZE / 2 <= 0) {
            this.ball.y = BALL_SIZE / 2;
            this.ballVelocity.y = Math.abs(this.ballVelocity.y);
            this.wallHitSound?.play();
        }

        // Ball falls below paddle - lose life
        if (this.ball.y > CANVAS_HEIGHT + BALL_SIZE) {
            this.loseLife();
            return;
        }

        // Paddle collision
        if (
            this.ballVelocity.y > 0 &&
            this.ball.y + BALL_SIZE / 2 >= this.paddle.y - PADDLE_HEIGHT / 2 &&
            this.ball.y + BALL_SIZE / 2 <= this.paddle.y + PADDLE_HEIGHT / 2 + 5 &&
            this.ball.x >= this.paddle.x - PADDLE_WIDTH / 2 &&
            this.ball.x <= this.paddle.x + PADDLE_WIDTH / 2
        ) {
            this.ball.y = this.paddle.y - PADDLE_HEIGHT / 2 - BALL_SIZE / 2;
            // Angle based on where ball hits paddle
            const hitPos = (this.ball.x - this.paddle.x) / (PADDLE_WIDTH / 2);
            const angle = hitPos * 60 * (Math.PI / 180); // Max 60 degree angle
            const speed = Math.sqrt(this.ballVelocity.x ** 2 + this.ballVelocity.y ** 2);
            this.ballVelocity.x = Math.sin(angle) * speed;
            this.ballVelocity.y = -Math.abs(Math.cos(angle) * speed);
            this.wallHitSound?.play();
        }

        // Brick collisions
        this.checkBrickCollisions();

        // Check win
        if (this.bricks.every(b => !b.alive)) {
            this.isGameOver = true;
            this.game.events.emit('gameOver', this.score);
        }
    }

    private movePaddle(delta: number) {
        const left = this.cursors.left.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('A'));
        const right = this.cursors.right.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('D'));

        if (left) {
            this.paddle.x = Math.max(PADDLE_WIDTH / 2, this.paddle.x - PADDLE_SPEED * (delta / 1000));
        } else if (right) {
            this.paddle.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH / 2, this.paddle.x + PADDLE_SPEED * (delta / 1000));
        }
    }

    private launchBall() {
        const angle = Phaser.Math.Between(-30, 30) * (Math.PI / 180);
        this.ballVelocity = {
            x: Math.sin(angle) * INITIAL_BALL_SPEED,
            y: -INITIAL_BALL_SPEED,
        };
    }

    private checkBrickCollisions() {
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            const brickLeft = brick.rect.x - BRICK_WIDTH / 2;
            const brickRight = brick.rect.x + BRICK_WIDTH / 2;
            const brickTop = brick.rect.y - BRICK_HEIGHT / 2;
            const brickBottom = brick.rect.y + BRICK_HEIGHT / 2;

            // Check if ball overlaps brick
            if (
                this.ball.x + BALL_SIZE / 2 >= brickLeft &&
                this.ball.x - BALL_SIZE / 2 <= brickRight &&
                this.ball.y + BALL_SIZE / 2 >= brickTop &&
                this.ball.y - BALL_SIZE / 2 <= brickBottom
            ) {
                // Determine collision side
                const overlapLeft = (this.ball.x + BALL_SIZE / 2) - brickLeft;
                const overlapRight = brickRight - (this.ball.x - BALL_SIZE / 2);
                const overlapTop = (this.ball.y + BALL_SIZE / 2) - brickTop;
                const overlapBottom = brickBottom - (this.ball.y - BALL_SIZE / 2);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    this.ballVelocity.x = -this.ballVelocity.x;
                } else {
                    this.ballVelocity.y = -this.ballVelocity.y;
                }

                // Destroy brick
                brick.alive = false;
                brick.rect.setVisible(false);

                // Score
                this.score += brick.points;
                this.game.events.emit('scoreUpdate', this.score);

                // Play a random break sound
                if (this.breakSounds.length > 0) {
                    const randomIndex = Phaser.Math.Between(0, this.breakSounds.length - 1);
                    this.breakSounds[randomIndex].play();
                }

                // Only break one brick per frame
                break;
            }
        }
    }

    private loseLife() {
        this.lives--;
        this.livesText.setText(`Lives: ${this.lives}`);
        this.loseSound?.play();

        if (this.lives <= 0) {
            this.isGameOver = true;
            this.game.events.emit('gameOver', this.score);
        } else {
            // Reset ball position
            this.ball.x = this.paddle.x;
            this.ball.y = PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_SIZE;
            this.ballVelocity = { x: 0, y: 0 };
            this.isServing = true;
            this.serveTimer = 0;
            this.serveText.setVisible(true);
            this.serveText.setText(`Lives: ${this.lives} - Get Ready...`);
        }
    }
}

export const createBreakoutGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a1a',
        scene: BreakoutScene,
    };
};
