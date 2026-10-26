import { BALL_RADIUS, BRICK_GAP, BRICK_HEIGHT, BRICK_MARGIN, BRICK_TOP, BRICK_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_WIDTH, PADDLE_Y, WIDTH } from "./config";
import { BRICK_COLS, getBrickType, LEVELS, TOTAL_LEVELS } from "./levels";
import { updateBalls } from "./collisions";
import { currentSpeed, updateDrops, updateEffects } from "./powers";
import type { BrickEvent, BrickInput, BrickState } from "./types";

export function createState(level = 1, score = 0, lives = 3): BrickState {
  if (!Number.isInteger(level) || level < 1 || level > TOTAL_LEVELS) throw new RangeError("Invalid Brick Break level.");
  const bricks: BrickState["bricks"] = [];
  LEVELS[level - 1].forEach((row, r) => {
    [...row].slice(0, BRICK_COLS).forEach((key, c) => {
      const type = getBrickType(key);
      if (type) bricks.push({ key, type, hp: type.hits, alive: true,
        x: BRICK_MARGIN + c * (BRICK_WIDTH + BRICK_GAP) + BRICK_WIDTH / 2,
        y: BRICK_TOP + r * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2 });
    });
  });
  return { phase: "serving", level, score, lives, paddleX: WIDTH / 2, paddleWidth: PADDLE_WIDTH,
    paddleTimer: 0, speedMultiplier: 1, speedTimer: 0, serveTimer: 0, sticky: false, aimAngle: 0,
    bricks, balls: [{ x: WIDTH / 2, y: PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_RADIUS, vx: 0, vy: 0, stuck: false, offset: 0 }], drops: [] };
}
export function launch(state: BrickState, random = Math.random): void {
  if (state.phase !== "serving" && state.phase !== "playing") return;
  const serving = state.phase === "serving";
  const angle = serving ? (Math.floor(random() * 51) - 25) * Math.PI / 180 : state.aimAngle;
  for (const ball of state.balls) {
    if (!serving && !ball.stuck) continue;
    ball.stuck = false;
    ball.vx = Math.sin(angle) * currentSpeed(state);
    ball.vy = -Math.cos(angle) * currentSpeed(state);
  }
  state.aimAngle = 0;
  state.phase = "playing";
}
export function step(state: BrickState, dt: number, input: BrickInput, random = Math.random): BrickEvent[] {
  const events: BrickEvent[] = [];
  if (state.phase !== "serving" && state.phase !== "playing") return events;
  // Small physics steps prevent fast balls tunnelling through thin bricks or the paddle.
  for (let remaining = dt; remaining > 1e-9; ) {
    const delta = Math.min(remaining, 1 / 240);
    remaining -= delta;
    const stuck = state.balls.some(ball => ball.stuck);
    if (!stuck) {
      state.paddleX += (input.left ? -1 : input.right ? 1 : 0) * PADDLE_SPEED * delta;
      state.paddleX = Math.max(state.paddleWidth / 2, Math.min(WIDTH - state.paddleWidth / 2, state.paddleX));
    } else {
      state.aimAngle = Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180,
        state.aimAngle + ((input.aimRight || input.right ? 1 : 0) - (input.aimLeft || input.left ? 1 : 0)) * 120 * Math.PI / 180 * delta));
    }
    if (state.phase === "serving") {
      for (const ball of state.balls) ball.x = state.paddleX;
      state.serveTimer += delta;
      if (state.serveTimer >= 1.2) launch(state, random);
      continue;
    }
    updateEffects(state, delta);
    updateBalls(state, delta, random, events);
    updateDrops(state, delta, events);
    if (!state.balls.length) {
      state.lives--;
      events.push({ type: "lose" });
      if (!state.lives) state.phase = "over";
      else {
        state.drops = [];
        state.paddleWidth = PADDLE_WIDTH;
        state.paddleTimer = state.speedTimer = 0;
        state.speedMultiplier = 1;
        state.sticky = false;
        state.balls.push({ x: state.paddleX, y: PADDLE_Y - PADDLE_HEIGHT / 2 - BALL_RADIUS, vx: 0, vy: 0, stuck: false, offset: 0 });
        state.phase = "serving";
        state.serveTimer = 0;
      }
      break;
    }
    if (!state.bricks.some(brick => brick.alive && brick.type.breakable)) {
      state.phase = "complete";
      state.balls = [];
      state.drops = [];
      const bonus = state.lives * 100;
      state.score += bonus;
      events.push({ type: "complete", bonus });
      break;
    }
  }
  return events;
}
