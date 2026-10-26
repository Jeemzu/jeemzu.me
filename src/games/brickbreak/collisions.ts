import { BALL_RADIUS as R, BRICK_HEIGHT, BRICK_WIDTH, DROP_CHANCE, HEIGHT, PADDLE_HEIGHT, PADDLE_Y, WIDTH } from "./config";
import { currentSpeed, pickPower } from "./powers";
import type { Ball, BrickEvent, BrickState } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function paddleCollision(state: BrickState, ball: Ball, events: BrickEvent[]): void {
  const top = PADDLE_Y - PADDLE_HEIGHT / 2;
  const half = state.paddleWidth / 2;
  if (ball.vy <= 0 || ball.y + R < top || ball.y - R > PADDLE_Y + PADDLE_HEIGHT / 2 || Math.abs(ball.x - state.paddleX) > half) return;
  ball.y = top - R;
  if (state.sticky) {
    state.sticky = false;
    ball.stuck = true;
    ball.offset = clamp(ball.x - state.paddleX, -(half - R), half - R);
    ball.vx = ball.vy = 0;
    state.aimAngle = 0;
  } else {
    const tilt = clamp((ball.x - state.paddleX) / half, -1, 1) * Math.PI / 3;
    const nx = Math.sin(tilt), ny = -Math.cos(tilt);
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; }
    const magnitude = Math.hypot(ball.vx, ball.vy);
    if (ball.vy > -magnitude * 0.4) {
      ball.vy = -magnitude * 0.4;
      ball.vx = (ball.vx >= 0 ? 1 : -1) * magnitude * Math.sqrt(0.84);
    }
  }
  events.push({ type: "wall" });
}

export function updateBalls(state: BrickState, dt: number, random: () => number, events: BrickEvent[]): void {
  state.balls = state.balls.filter(ball => {
    if (ball.stuck) {
      ball.x = state.paddleX + ball.offset;
      ball.y = PADDLE_Y - PADDLE_HEIGHT / 2 - R;
      return true;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x <= R || ball.x >= WIDTH - R) {
      ball.vx = ball.x <= R ? Math.abs(ball.vx) : -Math.abs(ball.vx);
      ball.x = clamp(ball.x, R, WIDTH - R);
      events.push({ type: "wall" });
    }
    if (ball.y <= R) { ball.y = R; ball.vy = Math.abs(ball.vy); events.push({ type: "wall" }); }
    paddleCollision(state, ball, events);
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const dx = ball.x - brick.x, dy = ball.y - brick.y;
      const overlapX = BRICK_WIDTH / 2 + R - Math.abs(dx);
      const overlapY = BRICK_HEIGHT / 2 + R - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        ball.x = brick.x + (dx < 0 ? -1 : 1) * (BRICK_WIDTH / 2 + R);
        ball.vx = dx < 0 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      } else {
        ball.y = brick.y + (dy < 0 ? -1 : 1) * (BRICK_HEIGHT / 2 + R);
        ball.vy = dy < 0 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
      }
      if (brick.type.breakable && --brick.hp <= 0) {
        brick.alive = false;
        state.score += brick.type.points;
        events.push({ type: "break", x: brick.x, y: brick.y, key: brick.key });
        if (random() < DROP_CHANCE) state.drops.push({ x: brick.x, y: brick.y, kind: pickPower(random) });
      } else events.push({ type: "wall" });
      break;
    }
    const magnitude = Math.hypot(ball.vx, ball.vy);
    if (magnitude) {
      const speed = currentSpeed(state);
      ball.vx = ball.vx / magnitude * speed;
      ball.vy = ball.vy / magnitude * speed;
    }
    return ball.y <= HEIGHT + R * 2;
  });
}
