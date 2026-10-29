import { describe, expect, it } from "vitest";
import { AIM, advanceWobble, canShoot, createAim, pull, wobbleAngle, wobbledDir } from "./aim";

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
