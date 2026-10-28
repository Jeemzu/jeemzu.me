import type { Vec2 } from "./course/types";

export const AIM = {
  /** Ground distance of pull-back that reaches full power. */
  maxPull: 4,
  minPower: 0.03,
  /** Peak wobble at full power, in radians (≈9°). */
  maxWobble: (9 * Math.PI) / 180,
  /** Wobble frequency at full power, in Hz. */
  wobbleHz: 1,
} as const;

export interface AimState {
  /** Unit direction the ball would travel (opposite of the pull). */
  dir: Vec2;
  power: number;
  phase: number;
}

export const createAim = (): AimState => ({ dir: { x: 0, z: 1 }, power: 0, phase: 0 });

/** Updates direction/power from the pointer's ground point while pulling back from the ball. */
export function pull(aim: AimState, ball: Vec2, pointer: Vec2): void {
  const dx = ball.x - pointer.x, dz = ball.z - pointer.z;
  const len = Math.hypot(dx, dz);
  aim.power = Math.min(1, len / AIM.maxPull);
  if (len > 1e-4) aim.dir = { x: dx / len, z: dz / len };
}

/** Advances the wobble; stronger shots wobble faster and wider. */
export function advanceWobble(aim: AimState, dt: number): void {
  aim.phase = (aim.phase + 2 * Math.PI * AIM.wobbleHz * aim.power * dt) % (2 * Math.PI);
}

export const wobbleAngle = (aim: AimState) => AIM.maxWobble * aim.power * Math.sin(aim.phase);

/** Direction including the current wobble; this is what a release fires. */
export function wobbledDir(aim: AimState): Vec2 {
  const a = wobbleAngle(aim), c = Math.cos(a), s = Math.sin(a);
  return { x: aim.dir.x * c - aim.dir.z * s, z: aim.dir.x * s + aim.dir.z * c };
}

export const canShoot = (aim: AimState) => aim.power >= AIM.minPower;
