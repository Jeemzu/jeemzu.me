import { describe, expect, it } from "vitest";
import { AIM, advanceWobble, canShoot, createAim, pull, wobbleAngle, wobbledDir } from "./aim";
import { Interpolator } from "./interpolation";
import type { StateMessage } from "./net/protocol";

describe("aim", () => {
  it("points away from the pull and caps power", () => {
    const aim = createAim();
    pull(aim, { x: 0, z: 0 }, { x: 0, z: -2 });
    expect(aim.dir.z).toBeCloseTo(1);
    expect(aim.power).toBeCloseTo(2 / AIM.maxPull);
    pull(aim, { x: 0, z: 0 }, { x: 10, z: 0 });
    expect(aim.dir.x).toBeCloseTo(-1);
    expect(aim.power).toBe(1);
  });

  it("ignores taps below the minimum power", () => {
    const aim = createAim();
    pull(aim, { x: 0, z: 0 }, { x: 0, z: -0.01 });
    expect(canShoot(aim)).toBe(false);
  });

  it("wobbles at power × 1 Hz with amplitude scaled by power", () => {
    const aim = createAim();
    pull(aim, { x: 0, z: 0 }, { x: 0, z: -AIM.maxPull });
    advanceWobble(aim, 0.25);
    expect(wobbleAngle(aim)).toBeCloseTo(AIM.maxWobble);
    const d = wobbledDir(aim);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    expect(Math.atan2(-d.x, d.z)).toBeCloseTo(AIM.maxWobble);

    const half = createAim();
    pull(half, { x: 0, z: 0 }, { x: 0, z: -AIM.maxPull / 2 });
    advanceWobble(half, 0.5);
    expect(wobbleAngle(half)).toBeCloseTo(AIM.maxWobble / 2);
  });
});

const snap = (time: number, x: number, holeIndex = 0): StateMessage => ({
  type: "state", code: "ABCDEF", phase: "playing", hostId: "a", courseId: "c", holeIndex, phaseRemaining: 0, time, winners: [],
  players: [{ id: "a", name: "A", icon: "frog", color: 0, connected: true, disqualified: false, x, z: 0, moving: true, sunk: false, strokes: 1, holeDone: false, scores: [], total: 0 }],
});

describe("interpolation", () => {
  it("renders slightly behind the newest snapshot", () => {
    const interp = new Interpolator();
    interp.push(snap(10, 0), 100);
    interp.push(snap(10.05, 1), 100.05);
    interp.push(snap(10.1, 2), 100.1);
    expect(interp.position({ id: "a", x: 2, z: 0 }, 100.15).x).toBeCloseTo(1);
    expect(interp.position({ id: "a", x: 2, z: 0 }, 100.175).x).toBeCloseTo(1.5);
    expect(interp.position({ id: "a", x: 2, z: 0 }, 101).x).toBeCloseTo(2);
  });

  it("snaps when the hole changes", () => {
    const interp = new Interpolator();
    interp.push(snap(10, 0), 100);
    interp.push(snap(10.05, 50, 1), 100.05);
    expect(interp.position({ id: "a", x: 50, z: 0 }, 100.06).x).toBe(50);
  });
});
