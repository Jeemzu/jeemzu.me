import Phaser from 'phaser';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 12;
const PADDLE_SPEED = 400;
const PADDLE_OFFSET = 30;
const WINNING_SCORE = 7;

export class PongScene extends Phaser.Scene {
    private playerPaddle!: Phaser.GameObjects.Rectangle;
    private aiPaddle!: Phaser.GameObjects.Rectangle;
    private ball!: Phaser.GameObjects.Arc;
    private graphics!: Phaser.GameObjects.Graphics;
    private playerScore: number = 0;
    private aiScore: number = 0;
    private ballVelocity: { x: number; y: number } = { x: 0, y: 0 };
    private isGameOver: boolean = false;
    private isServing: boolean = true;
    private serveTimer: number = 0;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private primaryColor: number = 0xa8d67e;
    private playerHitSound?: Phaser.Sound.BaseSound;
    private aiHitSound?: Phaser.Sound.BaseSound;
    private scoreSound?: Phaser.Sound.BaseSound;
    private bgMusic?: Phaser.Sound.BaseSound;
    private playerScoreText!: Phaser.GameObjects.Text;
    private aiScoreText!: Phaser.GameObjects.Text;
    private serveText!: Phaser.GameObjects.Text;
    private aiSpeed: number = 3.5;
    private lastServeTo: 'player' | 'ai' = 'player';

    constructor() {
        super({ key: 'PongScene' });
    }

    preload() {
        this.load.audio('pongPlayerHit', '/sounds/pong_player_hit.mp3');
        this.load.audio('pongAiHit', '/sounds/pong_ai_hit.mp3');
        this.load.audio('pongScore', '/sounds/pong_score.mp3');
        this.load.audio('pongMusic', '/sounds/pong_music.mp3');
    }

    create() {
        const primaryColorHex = this.registry.get('primaryColor') || '#a8d67e';
        this.primaryColor = parseInt(primaryColorHex.replace('#', ''), 16);

        const volume = this.registry.get('volume') ?? 0.5;

        // Initialize sounds (gracefully handle missing audio files)
        try {
            if (!this.playerHitSound && this.cache.audio.exists('pongPlayerHit')) {
                this.playerHitSound = this.sound.add('pongPlayerHit', { volume: volume * 0.5 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.aiHitSound && this.cache.audio.exists('pongAiHit')) {
                this.aiHitSound = this.sound.add('pongAiHit', { volume: volume * 0.5 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.scoreSound && this.cache.audio.exists('pongScore')) {
                this.scoreSound = this.sound.add('pongScore', { volume: volume * 0.6 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.bgMusic && this.cache.audio.exists('pongMusic')) {
                this.bgMusic = this.sound.add('pongMusic', { volume: volume * 0.3, loop: true });
                this.bgMusic.play();
            }
        } catch { /* audio not available */ }

        // Reset state
        this.playerScore = 0;
        this.aiScore = 0;
        this.isGameOver = false;
        this.isServing = true;
        this.serveTimer = 0;
        this.lastServeTo = 'player';

        this.cameras.main.setBackgroundColor('#1a1a1a');

        this.graphics = this.add.graphics();

        // Draw center dashed line
        this.drawCenterLine();

        // Create paddles
        this.playerPaddle = this.add.rectangle(
            PADDLE_OFFSET,
            CANVAS_HEIGHT / 2,
            PADDLE_WIDTH,
            PADDLE_HEIGHT,
            this.primaryColor
        );

        this.aiPaddle = this.add.rectangle(
            CANVAS_WIDTH - PADDLE_OFFSET,
            CANVAS_HEIGHT / 2,
            PADDLE_WIDTH,
            PADDLE_HEIGHT,
            0xffffff
        );

        // Create ball
        this.ball = this.add.circle(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
            BALL_SIZE / 2,
            0xffffff
        );

        // Score texts
        this.playerScoreText = this.add.text(CANVAS_WIDTH / 4, 40, '0', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: `#${this.primaryColor.toString(16).padStart(6, '0')}`,
        });
        this.playerScoreText.setOrigin(0.5);
        this.playerScoreText.setAlpha(0.6);

        this.aiScoreText = this.add.text((CANVAS_WIDTH / 4) * 3, 40, '0', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        this.aiScoreText.setOrigin(0.5);
        this.aiScoreText.setAlpha(0.6);

        // Serve text
        this.serveText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60, 'Get Ready...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#888888',
        });
        this.serveText.setOrigin(0.5);

        // Keyboard
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            this.handleKeyPress(event.key);
        });

        // Emit score
        this.game.events.emit('scoreUpdate', this.playerScore);

        // Listen for volume changes
        this.events.on('volumeChange', (newVolume: number) => {
            if (this.playerHitSound) {
                (this.playerHitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.5);
            }
            if (this.aiHitSound) {
                (this.aiHitSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.5);
            }
            if (this.scoreSound) {
                (this.scoreSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.6);
            }
            if (this.bgMusic) {
                (this.bgMusic as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.3);
            }
        });

        this.resetBall();
    }

    update(_time: number, delta: number) {
        if (this.isGameOver) return;

        // Handle serve delay
        if (this.isServing) {
            this.serveTimer += delta;
            if (this.serveTimer >= 1500) {
                this.isServing = false;
                this.serveText.setVisible(false);
                this.launchBall();
            }
            return;
        }

        // Player paddle movement
        if (this.cursors.up.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('W'))) {
            this.playerPaddle.y = Math.max(PADDLE_HEIGHT / 2, this.playerPaddle.y - PADDLE_SPEED * (delta / 1000));
        } else if (this.cursors.down.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('S'))) {
            this.playerPaddle.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT / 2, this.playerPaddle.y + PADDLE_SPEED * (delta / 1000));
        }

        // AI paddle movement - tracks ball with slight delay/imprecision
        const aiTargetY = this.ball.y;
        const aiDiff = aiTargetY - this.aiPaddle.y;
        const aiMoveSpeed = this.aiSpeed * (delta / 1000) * 100;

        if (Math.abs(aiDiff) > 10) {
            const moveAmount = Math.sign(aiDiff) * Math.min(aiMoveSpeed, Math.abs(aiDiff));
            this.aiPaddle.y = Phaser.Math.Clamp(
                this.aiPaddle.y + moveAmount,
                PADDLE_HEIGHT / 2,
                CANVAS_HEIGHT - PADDLE_HEIGHT / 2
            );
        }

        // Move ball
        this.ball.x += this.ballVelocity.x * (delta / 1000);
        this.ball.y += this.ballVelocity.y * (delta / 1000);

        // Ball collision with top/bottom walls
        if (this.ball.y - BALL_SIZE / 2 <= 0) {
            this.ball.y = BALL_SIZE / 2;
            this.ballVelocity.y = Math.abs(this.ballVelocity.y);
        } else if (this.ball.y + BALL_SIZE / 2 >= CANVAS_HEIGHT) {
            this.ball.y = CANVAS_HEIGHT - BALL_SIZE / 2;
            this.ballVelocity.y = -Math.abs(this.ballVelocity.y);
        }

        // Ball collision with player paddle
        if (
            this.ballVelocity.x < 0 &&
            this.ball.x - BALL_SIZE / 2 <= this.playerPaddle.x + PADDLE_WIDTH / 2 &&
            this.ball.x - BALL_SIZE / 2 >= this.playerPaddle.x - PADDLE_WIDTH / 2 - 5 &&
            this.ball.y >= this.playerPaddle.y - PADDLE_HEIGHT / 2 &&
            this.ball.y <= this.playerPaddle.y + PADDLE_HEIGHT / 2
        ) {
            this.ball.x = this.playerPaddle.x + PADDLE_WIDTH / 2 + BALL_SIZE / 2;
            const hitPos = (this.ball.y - this.playerPaddle.y) / (PADDLE_HEIGHT / 2);
            this.ballVelocity.x = Math.abs(this.ballVelocity.x) * 1.05;
            this.ballVelocity.y = hitPos * 300;
            this.playerHitSound?.play();
        }

        // Ball collision with AI paddle
        if (
            this.ballVelocity.x > 0 &&
            this.ball.x + BALL_SIZE / 2 >= this.aiPaddle.x - PADDLE_WIDTH / 2 &&
            this.ball.x + BALL_SIZE / 2 <= this.aiPaddle.x + PADDLE_WIDTH / 2 + 5 &&
            this.ball.y >= this.aiPaddle.y - PADDLE_HEIGHT / 2 &&
            this.ball.y <= this.aiPaddle.y + PADDLE_HEIGHT / 2
        ) {
            this.ball.x = this.aiPaddle.x - PADDLE_WIDTH / 2 - BALL_SIZE / 2;
            const hitPos = (this.ball.y - this.aiPaddle.y) / (PADDLE_HEIGHT / 2);
            this.ballVelocity.x = -Math.abs(this.ballVelocity.x) * 1.05;
            this.ballVelocity.y = hitPos * 300;
            this.aiHitSound?.play();
        }

        // Ball out of bounds - scoring
        if (this.ball.x < -BALL_SIZE) {
            // AI scores
            this.aiScore++;
            this.aiScoreText.setText(this.aiScore.toString());
            this.scoreSound?.play();
            this.lastServeTo = 'player';
            this.checkWin();
            if (!this.isGameOver) this.resetBall();
        } else if (this.ball.x > CANVAS_WIDTH + BALL_SIZE) {
            // Player scores
            this.playerScore++;
            this.playerScoreText.setText(this.playerScore.toString());
            this.scoreSound?.play();
            this.game.events.emit('scoreUpdate', this.playerScore);
            this.lastServeTo = 'ai';
            this.checkWin();
            if (!this.isGameOver) this.resetBall();
        }
    }

    private handleKeyPress(_key: string) {
        // Reserved for future use (e.g., serve on keypress)
    }

    private drawCenterLine() {
        this.graphics.lineStyle(2, 0x444444, 0.6);
        const dashLength = 15;
        const gapLength = 10;
        for (let y = 0; y < CANVAS_HEIGHT; y += dashLength + gapLength) {
            this.graphics.beginPath();
            this.graphics.moveTo(CANVAS_WIDTH / 2, y);
            this.graphics.lineTo(CANVAS_WIDTH / 2, Math.min(y + dashLength, CANVAS_HEIGHT));
            this.graphics.strokePath();
        }
    }

    private resetBall() {
        this.ball.x = CANVAS_WIDTH / 2;
        this.ball.y = CANVAS_HEIGHT / 2;
        this.ballVelocity = { x: 0, y: 0 };
        this.isServing = true;
        this.serveTimer = 0;
        this.serveText.setVisible(true);
        this.serveText.setText('Get Ready...');
    }

    private launchBall() {
        const speed = 350;
        const angle = Phaser.Math.Between(-30, 30) * (Math.PI / 180);
        const direction = this.lastServeTo === 'player' ? -1 : 1;
        this.ballVelocity = {
            x: Math.cos(angle) * speed * direction,
            y: Math.sin(angle) * speed,
        };
    }

    private checkWin() {
        if (this.playerScore >= WINNING_SCORE || this.aiScore >= WINNING_SCORE) {
            this.isGameOver = true;
            this.game.events.emit('gameOver', this.playerScore);
        }
    }
}

export const createPongGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a1a',
        scene: PongScene,
    };
};
