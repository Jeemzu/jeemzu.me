import Phaser from 'phaser';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

/**
 * BattleScene — renders sprites and animations only.
 * All game logic (damage, win/lose, XP) lives in BattleScreen.tsx.
 *
 * React → Phaser: scene.registry.set('battleAction', { type, abilityId?, itemId? })
 * Phaser → React: game.events.emit('animationComplete', result)
 *                 game.events.emit('enemyAnimComplete', result)
 */
export class BattleScene extends Phaser.Scene {
    private playerSprite!: Phaser.GameObjects.Rectangle;
    private enemySprite!: Phaser.GameObjects.Rectangle;
    private playerGlow!: Phaser.GameObjects.Graphics;
    private enemyGlow!: Phaser.GameObjects.Graphics;
    private particles!: Phaser.GameObjects.Graphics;
    private floatingTexts: Phaser.GameObjects.Text[] = [];
    private isAnimating = false;
    private playerColor = 0xa8d67e;
    private enemyColor = 0xe05c2a;
    private stars: Phaser.GameObjects.Arc[] = [];

    constructor() {
        super({ key: 'BattleScene' });
    }

    preload() {
        // No external assets — using Phaser.Graphics primitives for v1
    }

    create() {
        this.playerColor = this.registry.get('playerColor') ?? 0xa8d67e;
        this.enemyColor = this.registry.get('enemyColor') ?? 0xe05c2a;
        this.cameras.main.setBackgroundColor('#0a0a1a');

        this.drawBackground();
        this.drawGround();
        this.createPlayerSprite();
        this.createEnemySprite();

        // Listen for action trigger from React
        this.registry.events.on('changedata-battleAction', (_parent: unknown, value: unknown) => {
            if (!value || this.isAnimating) return;
            const action = value as { type: string; abilityId?: string; itemId?: string; auraColor?: number; damageResult?: { damageDealt: number; isCrit: boolean; isWeakness: boolean; isResistance: boolean; isMiss: boolean; healAmount: number } };
            this.handleBattleAction(action);
        });

        this.registry.events.on('changedata-enemyAction', (_parent: unknown, value: unknown) => {
            if (!value || this.isAnimating) return;
            const action = value as { damageResult: { damageDealt: number; isCrit: boolean; isMiss: boolean; healAmount: number }; enemyHealAmount?: number };
            this.handleEnemyAction(action);
        });

        this.registry.events.on('changedata-enemyColor', (_parent: unknown, value: number) => {
            this.enemyColor = value;
            if (this.enemySprite) {
                this.enemySprite.setFillStyle(value);
            }
        });
    }

    private drawBackground() {
        // Star field
        for (let i = 0; i < 60; i++) {
            const star = this.add.circle(
                Math.random() * CANVAS_WIDTH,
                Math.random() * (CANVAS_HEIGHT * 0.65),
                Math.random() < 0.3 ? 1.5 : 1,
                0xffffff,
                Math.random() * 0.4 + 0.1,
            );
            this.stars.push(star);
        }

        // Ground gradient effect via rectangles
        const groundY = CANVAS_HEIGHT * 0.72;
        const groundRect = this.add.rectangle(CANVAS_WIDTH / 2, groundY + (CANVAS_HEIGHT - groundY) / 2, CANVAS_WIDTH, CANVAS_HEIGHT - groundY, 0x0d1a0d);
        groundRect.setAlpha(0.9);
    }

    private drawGround() {
        const groundY = CANVAS_HEIGHT * 0.72;
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x2a4a2a, 0.8);
        graphics.lineBetween(0, groundY, CANVAS_WIDTH, groundY);

        // Rocky ground detail
        graphics.lineStyle(1, 0x2a3a2a, 0.4);
        for (let x = 20; x < CANVAS_WIDTH; x += 80) {
            const h = 4 + Math.random() * 12;
            graphics.lineBetween(x, groundY, x + 20, groundY - h);
            graphics.lineBetween(x + 20, groundY - h, x + 40, groundY);
        }
    }

    private createPlayerSprite() {
        const x = 160;
        const groundY = CANVAS_HEIGHT * 0.72;

        // Glow
        this.playerGlow = this.add.graphics();
        this.updateGlow(this.playerGlow, x, groundY - 50, this.playerColor);

        // Body
        this.playerSprite = this.add.rectangle(x, groundY - 50, 48, 80, this.playerColor);
        this.playerSprite.setStrokeStyle(2, 0xffffff, 0.2);

        // Simple "head" on top
        this.add.circle(x, groundY - 96, 18, this.playerColor, 0.9).setStrokeStyle(1, 0xffffff, 0.15);

        // Label
        this.add.text(x, groundY - 130, 'YOU', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#a8d67e',
        }).setOrigin(0.5);
    }

    private createEnemySprite() {
        const x = CANVAS_WIDTH - 160;
        const groundY = CANVAS_HEIGHT * 0.72;

        // Glow
        this.enemyGlow = this.add.graphics();
        this.updateGlow(this.enemyGlow, x, groundY - 55, this.enemyColor);

        // Body (slightly larger for enemy menace)
        this.enemySprite = this.add.rectangle(x, groundY - 55, 56, 90, this.enemyColor);
        this.enemySprite.setStrokeStyle(2, 0xffffff, 0.2);

        // Head
        this.add.circle(x, groundY - 106, 22, this.enemyColor, 0.9).setStrokeStyle(1, 0xffffff, 0.15);

        // Label from registry
        const enemyName: string = this.registry.get('enemyName') ?? 'ENEMY';
        this.add.text(x, groundY - 144, enemyName.toUpperCase(), {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#e05c2a',
        }).setOrigin(0.5);
    }

    private updateGlow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
        graphics.clear();
        graphics.fillStyle(color, 0.08);
        graphics.fillEllipse(x, y + 5, 80, 110);
    }

    private handleBattleAction(action: { type: string; abilityId?: string; auraColor?: number; damageResult?: { damageDealt: number; isCrit: boolean; isWeakness: boolean; isResistance: boolean; isMiss: boolean; healAmount: number } }) {
        this.isAnimating = true;

        if (action.type === 'flee') {
            // No animation needed — just emit complete
            this.time.delayedCall(200, () => {
                this.isAnimating = false;
                this.game.events.emit('animationComplete', {});
            });
            return;
        }

        const playerX = this.playerSprite.x;
        const enemyX = this.enemySprite.x;
        const result = action.damageResult;

        if (action.type === 'ability' && action.auraColor) {
            // Slide + particle burst
            this.tweens.add({
                targets: this.playerSprite,
                x: playerX + 120,
                duration: 200,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    this.spawnAbilityParticles(enemyX - 80, this.playerSprite.y, action.auraColor!);
                    if (result) this.showFloatingDamage(enemyX, this.enemySprite.y - 60, result);
                    this.enemyHitFlash();
                    this.time.delayedCall(500, () => {
                        this.isAnimating = false;
                        this.game.events.emit('animationComplete', {});
                    });
                },
            });
        } else {
            // Basic attack slide
            this.tweens.add({
                targets: this.playerSprite,
                x: playerX + 80,
                duration: 180,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    if (result) this.showFloatingDamage(enemyX, this.enemySprite.y - 60, result);
                    this.enemyHitFlash();
                    this.time.delayedCall(300, () => {
                        this.isAnimating = false;
                        this.game.events.emit('animationComplete', {});
                    });
                },
            });
        }
    }

    private handleEnemyAction(action: { damageResult: { damageDealt: number; isCrit: boolean; isMiss: boolean; healAmount: number }; enemyHealAmount?: number }) {
        this.isAnimating = true;
        const result = action.damageResult;
        const playerX = this.playerSprite.x;
        const enemyStartX = this.enemySprite.x;

        // Enemy slides toward player
        this.tweens.add({
            targets: this.enemySprite,
            x: enemyStartX - 80,
            duration: 180,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.showFloatingDamage(playerX, this.playerSprite.y - 60, result as { damageDealt: number; isCrit: boolean; isWeakness: boolean; isResistance: boolean; isMiss: boolean; healAmount: number });
                this.playerHitFlash();

                // Enemy self-heal visual
                if (action.enemyHealAmount && action.enemyHealAmount > 0) {
                    this.time.delayedCall(150, () => {
                        this.showHealNumber(this.enemySprite.x, this.enemySprite.y - 60, action.enemyHealAmount!);
                    });
                }

                this.time.delayedCall(350, () => {
                    this.isAnimating = false;
                    this.game.events.emit('enemyAnimComplete', {});
                });
            },
        });
    }

    private spawnAbilityParticles(x: number, y: number, color: number) {
        if (!this.particles) {
            this.particles = this.add.graphics();
        }
        this.particles.clear();

        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 20 + Math.random() * 30;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;

            this.particles.fillStyle(color, 0.8);
            this.particles.fillCircle(px, py, 4 + Math.random() * 4);

            this.tweens.add({
                targets: this.particles,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                onComplete: () => this.particles?.clear(),
            });
        }

        // Screen flash tint
        const flash = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, color, 0.12);
        this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
    }

    private showFloatingDamage(x: number, y: number, result: { damageDealt: number; isCrit: boolean; isWeakness?: boolean; isResistance?: boolean; isMiss: boolean; healAmount: number }) {
        let text: string;
        let color: string;

        if (result.isMiss) {
            text = 'MISS';
            color = '#8a9aaa';
        } else if (result.healAmount > 0) {
            text = `+${result.healAmount}`;
            color = '#a8d67e';
        } else if (result.isCrit) {
            text = `${result.damageDealt}!`;
            color = '#ff6060';
        } else if (result.isWeakness) {
            text = `${result.damageDealt} ▲`;
            color = '#ffa040';
        } else if (result.isResistance) {
            text = `${result.damageDealt} ▼`;
            color = '#6090c0';
        } else {
            text = `${result.damageDealt}`;
            color = '#ffffff';
        }

        const floatText = this.add.text(x + (Math.random() - 0.5) * 40, y, text, {
            fontFamily: 'monospace',
            fontSize: result.isCrit ? '20px' : '16px',
            color,
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        this.floatingTexts.push(floatText);

        this.tweens.add({
            targets: floatText,
            y: floatText.y - 60,
            alpha: 0,
            duration: 900,
            ease: 'Power2',
            onComplete: () => {
                floatText.destroy();
                const idx = this.floatingTexts.indexOf(floatText);
                if (idx >= 0) this.floatingTexts.splice(idx, 1);
            },
        });
    }

    private showHealNumber(x: number, y: number, amount: number) {
        const healText = this.add.text(x, y, `+${amount}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#a8d67e',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: healText,
            y: healText.y - 40,
            alpha: 0,
            duration: 700,
            onComplete: () => healText.destroy(),
        });
    }

    private enemyHitFlash() {
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
        });
    }

    private playerHitFlash() {
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
        });
    }

    /** Called by React when enemy enters phase 2 */
    triggerPhaseShift(newColor: number) {
        this.enemyColor = newColor;
        this.cameras.main.flash(300, 150, 150, 255, false);
        this.tweens.add({
            targets: this.enemySprite,
            fillColor: newColor,
            duration: 400,
        });
    }

    update() {
        // Subtle star twinkle
        if (Math.random() < 0.05 && this.stars.length > 0) {
            const star = this.stars[Math.floor(Math.random() * this.stars.length)];
            this.tweens.add({
                targets: star,
                alpha: Math.random() * 0.3 + 0.1,
                duration: 300,
                yoyo: true,
            });
        }
    }
}

export function createBattleSceneConfig(): Omit<Phaser.Types.Core.GameConfig, 'parent'> {
    return {
        type: Phaser.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#0a0a1a',
        scene: BattleScene,
        audio: { disableWebAudio: false },
    };
}
