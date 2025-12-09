import Phaser from 'phaser';

const GRID_SIZE = 20;
const CELL_SIZE = 20;

interface SnakeSegment {
    x: number;
    y: number;
}

export class SnakeScene extends Phaser.Scene {
    private snake: SnakeSegment[] = [];
    private food: { x: number; y: number } | null = null;
    private direction: { x: number; y: number } = { x: 1, y: 0 };
    private nextDirection: { x: number; y: number } = { x: 1, y: 0 };
    private score: number = 0;
    private moveTime: number = 0;
    private moveDelay: number = 150;
    private graphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private isGameOver: boolean = false;

    constructor() {
        super({ key: 'SnakeScene' });
    }

    create() {
        // Reset all game state
        this.isGameOver = false;
        this.score = 0;
        this.moveTime = 0;
        this.moveDelay = 150;
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };

        this.graphics = this.add.graphics();

        // Initialize snake in the middle
        const startX = Math.floor(GRID_SIZE / 2);
        const startY = Math.floor(GRID_SIZE / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
        ];

        // Place first food
        this.placeFood();

        // Set up keyboard controls
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Add WASD controls
        this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            this.handleKeyPress(event.key);
        });

        // Initial draw
        this.drawGame();

        // Emit initial score
        this.game.events.emit('scoreUpdate', this.score);
    }

    update(time: number) {
        if (this.isGameOver) return;

        // Check for direction change
        if (this.cursors.left.isDown) {
            this.handleKeyPress('ArrowLeft');
        } else if (this.cursors.right.isDown) {
            this.handleKeyPress('ArrowRight');
        } else if (this.cursors.up.isDown) {
            this.handleKeyPress('ArrowUp');
        } else if (this.cursors.down.isDown) {
            this.handleKeyPress('ArrowDown');
        }

        // Move snake at set intervals
        if (time >= this.moveTime) {
            this.moveSnake();
            this.moveTime = time + this.moveDelay;
        }
    }

    private handleKeyPress(key: string) {
        if (this.isGameOver) return;

        let newDirection: { x: number; y: number } | null = null;

        // Determine desired direction
        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                newDirection = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                newDirection = { x: 1, y: 0 };
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                newDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                newDirection = { x: 0, y: 1 };
                break;
        }

        // Only update if it's not a reverse direction
        if (newDirection) {
            // Check if the new direction would make the head move into the neck (reverse)
            const head = this.snake[0];
            const neck = this.snake[1];
            const futureHeadX = head.x + newDirection.x;
            const futureHeadY = head.y + newDirection.y;

            // Allow the direction change only if it doesn't reverse into the neck
            if (futureHeadX !== neck.x || futureHeadY !== neck.y) {
                this.nextDirection = newDirection;
            }
        }
    }

    private moveSnake() {
        // Update direction
        this.direction = { ...this.nextDirection };

        // Calculate new head position
        const head = this.snake[0];
        const newHead: SnakeSegment = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y,
        };

        // Check for wall collision
        if (
            newHead.x < 0 ||
            newHead.x >= GRID_SIZE ||
            newHead.y < 0 ||
            newHead.y >= GRID_SIZE
        ) {
            this.gameOver();
            return;
        }

        // Check for self collision
        if (this.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
            this.gameOver();
            return;
        }

        // Add new head
        this.snake.unshift(newHead);

        // Check if food was eaten
        if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.game.events.emit('scoreUpdate', this.score);
            this.placeFood();
            // Speed up slightly
            this.moveDelay = Math.max(50, this.moveDelay - 2);
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }

        this.drawGame();
    }

    private placeFood() {
        let validPosition = false;
        let foodX = 0;
        let foodY = 0;

        while (!validPosition) {
            foodX = Phaser.Math.Between(0, GRID_SIZE - 1);
            foodY = Phaser.Math.Between(0, GRID_SIZE - 1);

            validPosition = !this.snake.some((segment) => segment.x === foodX && segment.y === foodY);
        }

        this.food = { x: foodX, y: foodY };
    }

    private drawGame() {
        this.graphics.clear();

        // Draw grid background
        this.graphics.fillStyle(0x1a1a1a, 1);
        this.graphics.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

        // Draw grid lines
        this.graphics.lineStyle(1, 0x333333, 0.3);
        for (let i = 0; i <= GRID_SIZE; i++) {
            this.graphics.beginPath();
            this.graphics.moveTo(i * CELL_SIZE, 0);
            this.graphics.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
            this.graphics.strokePath();

            this.graphics.beginPath();
            this.graphics.moveTo(0, i * CELL_SIZE);
            this.graphics.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
            this.graphics.strokePath();
        }

        // Draw snake - need to set fill style before each rect
        this.snake.forEach((segment, index) => {
            this.graphics.lineStyle(0, 0x4ade80); // Reset line style for fills
            if (index === 0) {
                // Head - brighter green
                this.graphics.fillStyle(0x4ade80, 1);
            } else {
                // Body - theme green
                this.graphics.fillStyle(0x22c55e, 1);
            }
            this.graphics.fillRect(
                segment.x * CELL_SIZE + 1,
                segment.y * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
            );
        });

        // Draw food
        if (this.food) {
            this.graphics.lineStyle(0, 0x4ade80); // Reset line style
            this.graphics.fillStyle(0xff4444, 1);
            this.graphics.fillCircle(
                this.food.x * CELL_SIZE + CELL_SIZE / 2,
                this.food.y * CELL_SIZE + CELL_SIZE / 2,
                CELL_SIZE / 2 - 1
            );
        }
    }

    private gameOver() {
        this.isGameOver = true;
        this.game.events.emit('gameOver', this.score);
    }
}

export const createSnakeGameConfig = (): Omit<Phaser.Types.Core.GameConfig, 'parent'> => {
    return {
        type: Phaser.AUTO,
        width: GRID_SIZE * CELL_SIZE,
        height: GRID_SIZE * CELL_SIZE,
        backgroundColor: '#1a1a1a',
        scene: SnakeScene,
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
            },
        },
    };
};
