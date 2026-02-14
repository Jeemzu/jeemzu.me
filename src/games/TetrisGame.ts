import Phaser from 'phaser';

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const CANVAS_WIDTH = CELL_SIZE * (COLS + 7); // Extra space for next piece preview
const CANVAS_HEIGHT = CELL_SIZE * ROWS;
const BOARD_OFFSET_X = 0;
const BOARD_OFFSET_Y = 0;

// Standard Tetris piece definitions (SRS)
// Each piece is defined as a set of rotations, each rotation as [row, col] offsets
const TETROMINOES: Record<string, { shape: number[][][]; color: number }> = {
    I: {
        shape: [
            [[0, 0], [0, 1], [0, 2], [0, 3]],
            [[0, 0], [1, 0], [2, 0], [3, 0]],
            [[0, 0], [0, 1], [0, 2], [0, 3]],
            [[0, 0], [1, 0], [2, 0], [3, 0]],
        ],
        color: 0x00ccff,
    },
    O: {
        shape: [
            [[0, 0], [0, 1], [1, 0], [1, 1]],
            [[0, 0], [0, 1], [1, 0], [1, 1]],
            [[0, 0], [0, 1], [1, 0], [1, 1]],
            [[0, 0], [0, 1], [1, 0], [1, 1]],
        ],
        color: 0xffcc00,
    },
    T: {
        shape: [
            [[0, 0], [0, 1], [0, 2], [1, 1]],
            [[0, 0], [1, 0], [2, 0], [1, 1]],
            [[1, 0], [1, 1], [1, 2], [0, 1]],
            [[0, 0], [1, 0], [2, 0], [1, -1]],
        ],
        color: 0xaa00ff,
    },
    S: {
        shape: [
            [[0, 1], [0, 2], [1, 0], [1, 1]],
            [[0, 0], [1, 0], [1, 1], [2, 1]],
            [[0, 1], [0, 2], [1, 0], [1, 1]],
            [[0, 0], [1, 0], [1, 1], [2, 1]],
        ],
        color: 0x00ff44,
    },
    Z: {
        shape: [
            [[0, 0], [0, 1], [1, 1], [1, 2]],
            [[0, 1], [1, 0], [1, 1], [2, 0]],
            [[0, 0], [0, 1], [1, 1], [1, 2]],
            [[0, 1], [1, 0], [1, 1], [2, 0]],
        ],
        color: 0xff4444,
    },
    J: {
        shape: [
            [[0, 0], [1, 0], [1, 1], [1, 2]],
            [[0, 0], [0, 1], [1, 0], [2, 0]],
            [[0, 0], [0, 1], [0, 2], [1, 2]],
            [[0, 0], [1, 0], [2, 0], [2, -1]],
        ],
        color: 0x0044ff,
    },
    L: {
        shape: [
            [[0, 2], [1, 0], [1, 1], [1, 2]],
            [[0, 0], [1, 0], [2, 0], [2, 1]],
            [[0, 0], [0, 1], [0, 2], [1, 0]],
            [[0, 0], [0, 1], [1, 1], [2, 1]],
        ],
        color: 0xff8800,
    },
};

const PIECE_KEYS = Object.keys(TETROMINOES);

interface ActivePiece {
    type: string;
    rotation: number;
    row: number;
    col: number;
}

export class TetrisScene extends Phaser.Scene {
    private board: (number | null)[][] = [];
    private activePiece: ActivePiece | null = null;
    private nextPieceType: string = '';
    private score: number = 0;
    private level: number = 1;
    private linesCleared: number = 0;
    private isGameOver: boolean = false;
    private dropTimer: number = 0;
    private dropInterval: number = 800; // ms per drop
    private graphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private dasTimer: number = 0;
    private dasDirection: string = '';
    private dasDelay: number = 170; // ms before auto-repeat
    private dasRepeatRate: number = 50; // ms between repeats
    private dasActive: boolean = false;
    private softDropping: boolean = false;
    private bgMusic?: Phaser.Sound.BaseSound;
    private lineClearSound?: Phaser.Sound.BaseSound;
    private dropSound?: Phaser.Sound.BaseSound;
    private levelText!: Phaser.GameObjects.Text;
    private linesText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'TetrisScene' });
    }

    preload() {
        this.load.audio('tetrisMusic', '/sounds/tetris_music.mp3');
        this.load.audio('tetrisClear', '/sounds/tetris_clear.mp3');
        this.load.audio('tetrisDrop', '/sounds/tetris_drop.mp3');
    }

    create() {
        const volume = this.registry.get('volume') ?? 0.5;

        // Initialize sounds gracefully
        try {
            if (!this.bgMusic && this.cache.audio.exists('tetrisMusic')) {
                this.bgMusic = this.sound.add('tetrisMusic', { volume: volume * 0.3, loop: true });
                this.bgMusic.play();
            }
        } catch { /* audio not available */ }
        try {
            if (!this.lineClearSound && this.cache.audio.exists('tetrisClear')) {
                this.lineClearSound = this.sound.add('tetrisClear', { volume: volume * 0.5 });
            }
        } catch { /* audio not available */ }
        try {
            if (!this.dropSound && this.cache.audio.exists('tetrisDrop')) {
                this.dropSound = this.sound.add('tetrisDrop', { volume: volume * 0.4 });
            }
        } catch { /* audio not available */ }

        // Reset state
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.isGameOver = false;
        this.dropTimer = 0;
        this.dropInterval = 800;
        this.activePiece = null;
        this.softDropping = false;
        this.dasTimer = 0;
        this.dasDirection = '';
        this.dasActive = false;

        // Initialize empty board
        this.board = [];
        for (let r = 0; r < ROWS; r++) {
            this.board.push(new Array(COLS).fill(null));
        }

        this.cameras.main.setBackgroundColor('#1a1a1a');
        this.graphics = this.add.graphics();

        // Keyboard
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Hard drop on space
        this.input.keyboard!.on('keydown-SPACE', () => {
            if (!this.isGameOver && this.activePiece) {
                this.hardDrop();
            }
        });

        // Rotate on Up arrow or W
        this.input.keyboard!.on('keydown-UP', () => {
            if (!this.isGameOver && this.activePiece) {
                this.rotatePiece();
            }
        });
        this.input.keyboard!.on('keydown-W', () => {
            if (!this.isGameOver && this.activePiece) {
                this.rotatePiece();
            }
        });

        // Side panel text
        const panelX = CELL_SIZE * COLS + 20;

        this.add.text(panelX, 10, 'NEXT', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#888888',
            fontStyle: 'bold',
        });

        this.levelText = this.add.text(panelX, 160, `Level: ${this.level}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888',
        });

        this.linesText = this.add.text(panelX, 190, `Lines: ${this.linesCleared}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888',
        });

        // Emit initial score
        this.game.events.emit('scoreUpdate', this.score);

        // Volume change listener
        this.events.on('volumeChange', (newVolume: number) => {
            if (this.bgMusic) {
                (this.bgMusic as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.3);
            }
            if (this.lineClearSound) {
                (this.lineClearSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.5);
            }
            if (this.dropSound) {
                (this.dropSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(newVolume * 0.4);
            }
        });

        // Spawn first piece
        this.nextPieceType = this.randomPieceType();
        this.spawnPiece();
    }

    update(_time: number, delta: number) {
        if (this.isGameOver) return;

        // Handle DAS (Delayed Auto Shift) for left/right movement
        this.handleMovement(delta);

        // Soft drop
        this.softDropping = this.cursors.down.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('S'));

        // Drop timer
        const currentInterval = this.softDropping ? Math.min(this.dropInterval, 50) : this.dropInterval;
        this.dropTimer += delta;

        if (this.dropTimer >= currentInterval) {
            this.dropTimer = 0;
            if (this.activePiece) {
                if (!this.movePiece(1, 0)) {
                    // Can't move down - lock the piece
                    this.lockPiece();
                }
            }
        }

        this.drawGame();
    }

    private handleMovement(delta: number) {
        const leftDown = this.cursors.left.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('A'));
        const rightDown = this.cursors.right.isDown || this.input.keyboard!.checkDown(this.input.keyboard!.addKey('D'));

        const currentDir = leftDown ? 'left' : rightDown ? 'right' : '';

        if (currentDir === '') {
            this.dasTimer = 0;
            this.dasDirection = '';
            this.dasActive = false;
            return;
        }

        if (currentDir !== this.dasDirection) {
            // New direction pressed - move immediately
            this.dasDirection = currentDir;
            this.dasTimer = 0;
            this.dasActive = false;
            const colDelta = currentDir === 'left' ? -1 : 1;
            this.movePiece(0, colDelta);
        } else {
            // Same direction held
            this.dasTimer += delta;
            if (!this.dasActive && this.dasTimer >= this.dasDelay) {
                this.dasActive = true;
                this.dasTimer = this.dasDelay; // Reset to start of repeat
            }
            if (this.dasActive) {
                // Auto-repeat
                const repeats = Math.floor((this.dasTimer - this.dasDelay) / this.dasRepeatRate);
                const targetTime = this.dasDelay + (repeats + 1) * this.dasRepeatRate;
                if (this.dasTimer >= targetTime - delta) {
                    const colDelta = currentDir === 'left' ? -1 : 1;
                    this.movePiece(0, colDelta);
                }
            }
        }
    }

    private randomPieceType(): string {
        return PIECE_KEYS[Phaser.Math.Between(0, PIECE_KEYS.length - 1)];
    }

    private spawnPiece() {
        const type = this.nextPieceType;
        this.nextPieceType = this.randomPieceType();

        this.activePiece = {
            type,
            rotation: 0,
            row: 0,
            col: Math.floor(COLS / 2) - 1,
        };

        // Check if spawn position is valid
        if (!this.isValidPosition(this.activePiece)) {
            this.isGameOver = true;
            this.game.events.emit('gameOver', this.score);
        }
    }

    private getCells(piece: ActivePiece): { row: number; col: number }[] {
        const shape = TETROMINOES[piece.type].shape[piece.rotation];
        return shape.map(([dr, dc]) => ({
            row: piece.row + dr,
            col: piece.col + dc,
        }));
    }

    private isValidPosition(piece: ActivePiece): boolean {
        const cells = this.getCells(piece);
        for (const cell of cells) {
            if (cell.col < 0 || cell.col >= COLS || cell.row >= ROWS) {
                return false;
            }
            if (cell.row >= 0 && this.board[cell.row][cell.col] !== null) {
                return false;
            }
        }
        return true;
    }

    private movePiece(dRow: number, dCol: number): boolean {
        if (!this.activePiece) return false;

        const newPiece: ActivePiece = {
            ...this.activePiece,
            row: this.activePiece.row + dRow,
            col: this.activePiece.col + dCol,
        };

        if (this.isValidPosition(newPiece)) {
            this.activePiece = newPiece;
            return true;
        }
        return false;
    }

    private rotatePiece() {
        if (!this.activePiece) return;

        const newPiece: ActivePiece = {
            ...this.activePiece,
            rotation: (this.activePiece.rotation + 1) % 4,
        };

        // Try basic rotation
        if (this.isValidPosition(newPiece)) {
            this.activePiece = newPiece;
            return;
        }

        // Wall kick: try shifting left/right
        for (const kick of [1, -1, 2, -2]) {
            const kickedPiece = { ...newPiece, col: newPiece.col + kick };
            if (this.isValidPosition(kickedPiece)) {
                this.activePiece = kickedPiece;
                return;
            }
        }
    }

    private hardDrop() {
        if (!this.activePiece) return;

        let dropDistance = 0;
        while (this.movePiece(1, 0)) {
            dropDistance++;
        }
        // Award points for hard drop
        this.score += dropDistance * 2;
        this.game.events.emit('scoreUpdate', this.score);
        this.lockPiece();
    }

    private getGhostPiece(): ActivePiece | null {
        if (!this.activePiece) return null;

        const ghost: ActivePiece = { ...this.activePiece };
        while (true) {
            const next = { ...ghost, row: ghost.row + 1 };
            if (this.isValidPosition(next)) {
                ghost.row = next.row;
            } else {
                break;
            }
        }
        return ghost;
    }

    private lockPiece() {
        if (!this.activePiece) return;

        const cells = this.getCells(this.activePiece);
        const color = TETROMINOES[this.activePiece.type].color;

        for (const cell of cells) {
            if (cell.row >= 0 && cell.row < ROWS) {
                this.board[cell.row][cell.col] = color;
            }
        }

        this.dropSound?.play();

        // Clear lines
        const cleared = this.clearLines();
        if (cleared > 0) {
            this.lineClearSound?.play();
            // Scoring: 100, 300, 500, 800 for 1-4 lines
            const lineScores = [0, 100, 300, 500, 800];
            this.score += (lineScores[cleared] || 0) * this.level;
            this.linesCleared += cleared;
            this.game.events.emit('scoreUpdate', this.score);

            // Level up every 10 lines
            const newLevel = Math.floor(this.linesCleared / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                // Speed up: reduce interval by ~15% per level, minimum 100ms
                this.dropInterval = Math.max(100, 800 - (this.level - 1) * 75);
            }

            this.levelText.setText(`Level: ${this.level}`);
            this.linesText.setText(`Lines: ${this.linesCleared}`);
        }

        this.activePiece = null;
        this.spawnPiece();
    }

    private clearLines(): number {
        let cleared = 0;

        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== null)) {
                // Remove this row
                this.board.splice(r, 1);
                // Add empty row at top
                this.board.unshift(new Array(COLS).fill(null));
                cleared++;
                r++; // Re-check this row index since rows shifted down
            }
        }

        return cleared;
    }

    private drawGame() {
        this.graphics.clear();

        // Draw board background
        this.graphics.fillStyle(0x111111, 1);
        this.graphics.fillRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, COLS * CELL_SIZE, ROWS * CELL_SIZE);

        // Draw grid lines
        this.graphics.lineStyle(1, 0x333333, 0.3);
        for (let c = 0; c <= COLS; c++) {
            this.graphics.beginPath();
            this.graphics.moveTo(BOARD_OFFSET_X + c * CELL_SIZE, BOARD_OFFSET_Y);
            this.graphics.lineTo(BOARD_OFFSET_X + c * CELL_SIZE, BOARD_OFFSET_Y + ROWS * CELL_SIZE);
            this.graphics.strokePath();
        }
        for (let r = 0; r <= ROWS; r++) {
            this.graphics.beginPath();
            this.graphics.moveTo(BOARD_OFFSET_X, BOARD_OFFSET_Y + r * CELL_SIZE);
            this.graphics.lineTo(BOARD_OFFSET_X + COLS * CELL_SIZE, BOARD_OFFSET_Y + r * CELL_SIZE);
            this.graphics.strokePath();
        }

        // Draw locked pieces on board
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board[r][c] !== null) {
                    this.drawCell(c, r, this.board[r][c]!, 1);
                }
            }
        }

        // Draw ghost piece
        const ghost = this.getGhostPiece();
        if (ghost) {
            const ghostColor = TETROMINOES[ghost.type].color;
            const ghostCells = this.getCells(ghost);
            for (const cell of ghostCells) {
                if (cell.row >= 0) {
                    this.drawCell(cell.col, cell.row, ghostColor, 0.2);
                }
            }
        }

        // Draw active piece
        if (this.activePiece) {
            const color = TETROMINOES[this.activePiece.type].color;
            const cells = this.getCells(this.activePiece);
            for (const cell of cells) {
                if (cell.row >= 0) {
                    this.drawCell(cell.col, cell.row, color, 1);
                }
            }
        }

        // Draw next piece preview
        this.drawNextPiece();

        // Draw board border
        this.graphics.lineStyle(2, 0x555555, 1);
        this.graphics.strokeRect(BOARD_OFFSET_X, BOARD_OFFSET_Y, COLS * CELL_SIZE, ROWS * CELL_SIZE);
    }

    private drawCell(col: number, row: number, color: number, alpha: number) {
        const x = BOARD_OFFSET_X + col * CELL_SIZE;
        const y = BOARD_OFFSET_Y + row * CELL_SIZE;

        // Fill
        this.graphics.fillStyle(color, alpha);
        this.graphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        // Highlight (top-left edges for 3D effect)
        if (alpha >= 0.8) {
            const r = ((color >> 16) & 0xFF);
            const g = ((color >> 8) & 0xFF);
            const b = (color & 0xFF);
            const lighter = ((Math.min(255, r + 60)) << 16) | ((Math.min(255, g + 60)) << 8) | Math.min(255, b + 60);
            const darker = ((Math.max(0, r - 40)) << 16) | ((Math.max(0, g - 40)) << 8) | Math.max(0, b - 40);

            this.graphics.fillStyle(lighter, 0.5);
            this.graphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, 3);
            this.graphics.fillRect(x + 1, y + 1, 3, CELL_SIZE - 2);

            this.graphics.fillStyle(darker, 0.5);
            this.graphics.fillRect(x + 1, y + CELL_SIZE - 4, CELL_SIZE - 2, 3);
            this.graphics.fillRect(x + CELL_SIZE - 4, y + 1, 3, CELL_SIZE - 2);
        }
    }

    private drawNextPiece() {
        const previewX = CELL_SIZE * COLS + 25;
        const previewY = 40;
        const previewCellSize = 22;

        // Draw preview background
        this.graphics.fillStyle(0x222222, 0.8);
        this.graphics.fillRect(previewX - 5, previewY - 5, previewCellSize * 4 + 10, previewCellSize * 4 + 10);

        if (this.nextPieceType) {
            const shape = TETROMINOES[this.nextPieceType].shape[0];
            const color = TETROMINOES[this.nextPieceType].color;

            for (const [dr, dc] of shape) {
                const x = previewX + dc * previewCellSize;
                const y = previewY + dr * previewCellSize;

                this.graphics.fillStyle(color, 1);
                this.graphics.fillRect(x + 1, y + 1, previewCellSize - 2, previewCellSize - 2);
            }
        }
    }
}

export const createTetrisGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a1a',
        scene: TetrisScene,
    };
};
