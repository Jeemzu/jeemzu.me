import { BASE_SPEED, DROP_RADIUS, DROP_SPEED, HEIGHT, MAX_BALLS, PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_Y } from "./config";
import type { BrickEvent, BrickState, EffectKind } from "./types";

const WEIGHTS: [EffectKind, number][] = [
  ["expand", 3], ["multi", 2], ["slow", 1], ["life", 1], ["sticky", 2], ["shrink", 2], ["fast", 1],
];
export function pickPower(random: () => number): EffectKind {
  let value = random() * 12;
  for (const [kind, weight] of WEIGHTS) {
    value -= weight;
    if (value <= 0) return kind;
  }
  throw new RangeError("Power-up random value must be in [0, 1).");
}
export const currentSpeed = (state: BrickState) => (BASE_SPEED + (state.level - 1) * 8) * state.speedMultiplier;

export function applyPower(state: BrickState, kind: EffectKind): void {
  switch (kind) {
    case "expand": state.paddleWidth = PADDLE_WIDTH * 1.6; state.paddleTimer = 12; break;
    case "shrink": state.paddleWidth = PADDLE_WIDTH * 0.6; state.paddleTimer = 10; break;
    case "slow": case "fast":
      state.speedMultiplier = kind === "slow" ? 0.6 : 1.5;
      state.speedTimer = Math.min(state.speedTimer + 5, 7);
      break;
    case "life": state.lives = Math.min(5, state.lives + 1); break;
    case "sticky": state.sticky = true; break;
    case "multi": {
      const source = state.balls[0];
      if (!source) break;
      const speed = currentSpeed(state);
      for (const offset of [-22, 22]) {
        if (state.balls.length >= MAX_BALLS) break;
        const angle = (source.stuck ? -Math.PI / 2 : Math.atan2(source.vy, source.vx)) + offset * Math.PI / 180;
        state.balls.push({ x: source.x, y: source.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, stuck: false, offset: 0 });
      }
      break;
    }
  }
}
export function updateEffects(state: BrickState, dt: number): void {
  if (state.paddleTimer > 0) {
    state.paddleTimer = Math.max(0, state.paddleTimer - dt);
    if (!state.paddleTimer) state.paddleWidth = PADDLE_WIDTH;
  }
  if (state.speedTimer > 0) {
    state.speedTimer = Math.max(0, state.speedTimer - dt);
    if (!state.speedTimer) state.speedMultiplier = 1;
  }
}
export function updateDrops(state: BrickState, dt: number, events: BrickEvent[]): void {
  state.drops = state.drops.filter(drop => {
    drop.y += DROP_SPEED * dt;
    if (drop.y + DROP_RADIUS >= PADDLE_Y - PADDLE_HEIGHT / 2 &&
        drop.y - DROP_RADIUS <= PADDLE_Y + PADDLE_HEIGHT / 2 &&
        Math.abs(drop.x - state.paddleX) <= state.paddleWidth / 2 + DROP_RADIUS) {
      applyPower(state, drop.kind);
      events.push({ type: "power" });
      return false;
    }
    return drop.y <= HEIGHT + DROP_RADIUS;
  });
}
