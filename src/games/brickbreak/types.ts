import type { BrickType } from "./levels";

export type EffectKind = "expand" | "multi" | "slow" | "life" | "sticky" | "shrink" | "fast";
export interface Ball {
  x: number; y: number; vx: number; vy: number; stuck: boolean; offset: number;
}
export interface Brick {
  x: number; y: number; key: string; type: BrickType; hp: number; alive: boolean;
}
export interface Drop { x: number; y: number; kind: EffectKind }
export interface BrickState {
  phase: "serving" | "playing" | "complete" | "over";
  level: number; score: number; lives: number;
  paddleX: number; paddleWidth: number; paddleTimer: number;
  speedMultiplier: number; speedTimer: number; serveTimer: number;
  sticky: boolean; aimAngle: number;
  balls: Ball[]; bricks: Brick[]; drops: Drop[];
}
export interface BrickInput { left: boolean; right: boolean; aimLeft: boolean; aimRight: boolean }
export type BrickEvent =
  | { type: "break"; x: number; y: number; key: string }
  | { type: "wall" | "lose" | "power" }
  | { type: "complete"; bonus: number };
