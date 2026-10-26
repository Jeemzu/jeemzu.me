import { describe, expect, it } from "vitest";
import { BALL_RADIUS, BRICK_HEIGHT, HEIGHT, PADDLE_WIDTH, PADDLE_Y, WIDTH } from "./config";
import { createState, launch, step } from "./logic";
import { applyPower, currentSpeed, pickPower, updateEffects } from "./powers";
import type { BrickInput, BrickState } from "./types";

const idle: BrickInput = { left: false, right: false, aimLeft: false, aimRight: false };
const noDrop = () => 0.99;
function hitFirst(state: BrickState) {
  const brick = state.bricks[0];
  state.phase = "playing";
  state.balls = [{ x: brick.x, y: brick.y - BRICK_HEIGHT / 2 - BALL_RADIUS - 1, vx: 0, vy: currentSpeed(state), stuck: false, offset: 0 }];
  return step(state, 1 / 120, idle, noDrop);
}
describe("Brick Break rules", () => {
  it.each(Array.from({ length: 20 }, (_, i) => i + 1))("builds preserved level %s within renderer capacity", level => {
    const state = createState(level);
    expect(state.bricks.length).toBeGreaterThan(0);
    expect(state.bricks.length).toBeLessThanOrEqual(200);
    expect(state.bricks.some(brick => brick.type.breakable)).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.phase).toBe("serving");
  });
  it.each([0, 21, 1.5])("rejects invalid level %s", level => expect(() => createState(level)).toThrow(RangeError));
  it("serves automatically after 1.2 seconds", () => {
    const state = createState();
    step(state, 1.19, idle);
    expect(state.phase).toBe("serving");
    step(state, 0.02, idle);
    expect(state.phase).toBe("playing");
    expect(Math.hypot(state.balls[0].vx, state.balls[0].vy)).toBeCloseTo(450);
    expect(state.balls[0].vy).toBeLessThan(0);
  });
  it("clamps keyboard movement to the paddle's visible bounds", () => {
    const state = createState();
    step(state, 1, { ...idle, left: true });
    expect(state.paddleX).toBe(PADDLE_WIDTH / 2);
    step(state, 2, { ...idle, right: true });
    expect(state.paddleX).toBe(WIDTH - PADDLE_WIDTH / 2);
  });
  it("breaks and scores one-hit bricks without overlapping them after reflection", () => {
    const state = createState();
    expect(hitFirst(state).some(event => event.type === "break")).toBe(true);
    expect(state.score).toBe(30);
    expect(state.bricks[0].alive).toBe(false);
    expect(state.balls[0].vy).toBeLessThan(0);
  });
  it("requires all armor hits before awarding points", () => {
    const state = createState(6);
    hitFirst(state);
    expect(state.bricks[0].hp).toBe(1);
    expect(state.score).toBe(0);
    hitFirst(state);
    expect(state.score).toBe(70);
  });
  it("reflects from indestructible obstacles without changing health or score", () => {
    const state = createState(8);
    hitFirst(state);
    expect(state.bricks[0].hp).toBe(Infinity);
    expect(state.bricks[0].alive).toBe(true);
    expect(state.score).toBe(0);
  });
  it("substeps fast balls instead of tunnelling through bricks", () => {
    const state = createState(20);
    state.speedMultiplier = 1.5;
    const brick = state.bricks[0];
    state.phase = "playing";
    state.balls = [{ x: brick.x, y: 25, vx: 0, vy: currentSpeed(state), stuck: false, offset: 0 }];
    step(state, 0.05, idle, noDrop);
    expect(brick.hp).toBe(2);
    expect(state.balls[0].vy).toBeLessThan(0);
  });
  it("catches sticky balls and releases them along the bounded aim angle", () => {
    const state = createState();
    state.phase = "playing"; state.sticky = true;
    state.balls = [{ x: state.paddleX, y: PADDLE_Y - 20, vx: 0, vy: 450, stuck: false, offset: 0 }];
    step(state, 0.02, idle);
    expect(state.balls[0].stuck).toBe(true);
    expect(state.sticky).toBe(false);
    const x = state.paddleX;
    step(state, 1, { ...idle, right: true });
    expect(state.paddleX).toBe(x);
    expect(state.aimAngle).toBeCloseTo(80 * Math.PI / 180);
    launch(state);
    expect(state.balls[0].stuck).toBe(false);
    expect(state.balls[0].vx).toBeGreaterThan(0);
    expect(state.balls[0].vy).toBeLessThan(0);
  });
  it("caps multiball at six balls with the current speed", () => {
    const state = createState();
    launch(state);
    for (let i = 0; i < 5; i++) applyPower(state, "multi");
    expect(state.balls).toHaveLength(6);
    for (const ball of state.balls) expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(450);
  });
  it("preserves power-up duration, speed and life caps", () => {
    const state = createState();
    applyPower(state, "expand"); expect(state.paddleWidth).toBe(176);
    applyPower(state, "shrink"); expect(state.paddleWidth).toBe(66);
    applyPower(state, "slow"); expect(state.speedMultiplier).toBe(0.6);
    applyPower(state, "fast"); expect(state.speedTimer).toBe(7);
    expect(state.speedMultiplier).toBe(1.5);
    updateEffects(state, 10);
    expect(state.paddleWidth).toBe(110);
    expect(state.speedMultiplier).toBe(1);
    for (let i = 0; i < 5; i++) applyPower(state, "life");
    expect(state.lives).toBe(5);
  });
  it("catches falling power-ups", () => {
    const state = createState();
    launch(state);
    state.drops = [{ x: state.paddleX, y: PADDLE_Y - 20, kind: "life" }];
    expect(step(state, 0.1, idle).some(event => event.type === "power")).toBe(true);
    expect(state.lives).toBe(4);
    expect(state.drops).toHaveLength(0);
  });
  it("re-serves after a lost ball and ends after three losses", () => {
    const state = createState();
    for (let i = 0; i < 3; i++) {
      state.phase = "playing";
      state.balls[0].y = HEIGHT + 30;
      state.balls[0].vy = 1;
      expect(step(state, 0.01, idle).some(event => event.type === "lose")).toBe(true);
      expect(state.lives).toBe(2 - i);
    }
    expect(state.phase).toBe("over");
    expect(state.balls).toHaveLength(0);
  });
  it("awards the life bonus once and carries score/lives to the next level", () => {
    const state = createState();
    state.bricks = [state.bricks[0]];
    const events = hitFirst(state);
    expect(events).toContainEqual({ type: "complete", bonus: 300 });
    expect(state.score).toBe(330);
    expect(state.phase).toBe("complete");
    expect(step(state, 1, idle)).toEqual([]);
    const next = createState(2, state.score, state.lives);
    expect(next.score).toBe(330); expect(next.lives).toBe(3);
    expect(createState(1).score).toBe(0);
  });
  it("uses the original weighted power-up distribution", () => {
    expect(pickPower(() => 0)).toBe("expand");
    expect(pickPower(() => 0.3)).toBe("multi");
    expect(pickPower(() => 0.99)).toBe("fast");
  });
});
