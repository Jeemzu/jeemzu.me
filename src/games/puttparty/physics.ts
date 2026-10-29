import { boxCorners } from "./course/geometry";
import type { HoleDefinition, Vec2 } from "./course/types";

/**
 * Port of the server's `PuttPhysics.cs` / `PuttRules` (games-api `src/GamesRealtime/Putt`). Clients replay every shot
 * with it, so it must match the server operation for operation; `physics.test.ts` checks the shared fixture.
 * Use `Math.sqrt` of sums here, not `Math.hypot`: they round differently.
 */
export const PHYSICS = {
  ballRadius: 0.2,
  cupRadius: 0.32,
  maxShotSpeed: 18,
  rollDeceleration: 2.0,
  rollDrag: 0.5,
  stopSpeed: 0.08,
  captureSpeed: 7.0,
  wallRestitution: 0.75,
  obstacleRestitution: 0.8,
  fixedStep: 1 / 120,
} as const;

export interface Ball {
  x: number;
  z: number;
  vx: number;
  vz: number;
  sunk: boolean;
}

const speedOf = (b: Ball) => Math.sqrt(b.vx * b.vx + b.vz * b.vz);
export const isMoving = (b: Ball) => b.vx !== 0 || b.vz !== 0;
const dist = (ax: number, az: number, bx: number, bz: number) => Math.sqrt((ax - bx) * (ax - bx) + (az - bz) * (az - bz));

/** Launch velocity exactly as the server computes it from a `shot` message. */
export function launchVelocity(dirX: number, dirZ: number, power: number): { vx: number; vz: number } {
  const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const speed = Math.min(power, 1) * PHYSICS.maxShotSpeed;
  return { vx: (dirX / len) * speed, vz: (dirZ / len) * speed };
}

function pointInPolygon(x: number, z: number, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

interface Segment { a: Vec2; b: Vec2; e: number }

export class HoleCollider {
  private readonly boundary: Vec2[];
  private readonly segments: Segment[] = [];
  private readonly circles: { c: Vec2; r: number }[] = [];
  private readonly boxes: Vec2[][] = [];
  readonly cup: Vec2;

  constructor(hole: HoleDefinition) {
    this.boundary = hole.boundary;
    this.cup = hole.cup;
    const n = hole.boundary.length;
    for (let i = 0; i < n; i++) this.segments.push({ a: hole.boundary[i], b: hole.boundary[(i + 1) % n], e: PHYSICS.wallRestitution });
    for (const o of hole.obstacles) {
      if (o.type === "cylinder") {
        this.circles.push({ c: o.center, r: o.radius });
        continue;
      }
      const corners = boxCorners(o.center, o.width, o.depth, o.rotationDeg ?? 0);
      this.boxes.push(corners);
      for (let i = 0; i < 4; i++) this.segments.push({ a: corners[i], b: corners[(i + 1) % 4], e: PHYSICS.obstacleRestitution });
    }
  }

  isValidPosition(x: number, z: number): boolean {
    if (!pointInPolygon(x, z, this.boundary)) return false;
    for (const box of this.boxes) if (pointInPolygon(x, z, box)) return false;
    for (const { c, r } of this.circles) if (dist(x, z, c.x, c.z) < r) return false;
    return true;
  }

  /** Advances one ball by `dt` seconds; returns true if it dropped into the cup. */
  step(ball: Ball, dt: number): boolean {
    if (ball.sunk || !isMoving(ball)) return false;
    const r = PHYSICS.ballRadius;
    const steps = Math.max(1, Math.ceil((speedOf(ball) * dt) / (r * 0.5)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      const px = ball.x, pz = ball.z;
      ball.x += ball.vx * h;
      ball.z += ball.vz * h;
      for (const { a, b, e } of this.segments) {
        const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
        let cx = a.x, cz = a.z;
        if (len2 > 0) {
          const t = Math.min(1, Math.max(0, ((ball.x - a.x) * dx + (ball.z - a.z) * dz) / len2));
          cx = a.x + t * dx;
          cz = a.z + t * dz;
        }
        resolve(ball, cx, cz, r, e, false);
      }
      for (const { c, r: radius } of this.circles) {
        const dx = ball.x - c.x, dz = ball.z - c.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d <= 1e-9) continue;
        const sx = c.x + (dx / d) * radius, sz = c.z + (dz / d) * radius;
        if (d < radius + r) resolve(ball, sx, sz, r, PHYSICS.obstacleRestitution, d < radius);
      }
      if (!this.isValidPosition(ball.x, ball.z)) {
        ball.x = px;
        ball.z = pz;
        ball.vx = ball.vz = 0;
        return false;
      }
      if (dist(ball.x, ball.z, this.cup.x, this.cup.z) < PHYSICS.cupRadius && speedOf(ball) < PHYSICS.captureSpeed) {
        ball.x = this.cup.x;
        ball.z = this.cup.z;
        ball.vx = ball.vz = 0;
        ball.sunk = true;
        return true;
      }
    }

    const speed = speedOf(ball);
    const next = speed - (PHYSICS.rollDeceleration + PHYSICS.rollDrag * speed) * dt;
    if (next < PHYSICS.stopSpeed) ball.vx = ball.vz = 0;
    else {
      ball.vx *= next / speed;
      ball.vz *= next / speed;
    }
    return false;
  }
}

function resolve(ball: Ball, cx: number, cz: number, r: number, restitution: number, inside: boolean): void {
  const dx = ball.x - cx, dz = ball.z - cz, d = Math.sqrt(dx * dx + dz * dz);
  if (d >= r && !inside) return;
  let nx: number, nz: number;
  if (d > 1e-9) {
    nx = dx / d;
    nz = dz / d;
    if (inside) {
      nx = -nx;
      nz = -nz;
    }
  } else {
    const s = speedOf(ball);
    if (s <= 0) return;
    nx = -ball.vx / s;
    nz = -ball.vz / s;
  }
  const push = inside ? r + d : r - d;
  ball.x += nx * push;
  ball.z += nz * push;
  const vn = ball.vx * nx + ball.vz * nz;
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vz -= (1 + restitution) * vn * nz;
  }
}
