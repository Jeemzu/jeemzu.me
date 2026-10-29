import { describe, expect, it } from "vitest";
import type { CourseFile } from "./course/types";
import fixture from "./physics.fixture.json";
import { HoleCollider, PHYSICS, isMoving, launchVelocity, type Ball } from "./physics";

// Same file as games-api tests/GamesRealtime.Tests/Fixtures/putt-physics.json, produced by the server's physics.
const course = fixture.course as unknown as CourseFile;

describe("physics matches the server", () => {
  it("uses the server's fixed step", () => {
    expect(PHYSICS.fixedStep).toBe(fixture.fixedStep);
  });

  it.each(fixture.shots.map((s, i) => [i, s] as const))("shot %i rests where the server's does", (_, shot) => {
    const collider = new HoleCollider(course.holes[shot.hole]);
    const ball: Ball = { x: shot.x, z: shot.z, vx: shot.vx, vz: shot.vz, sunk: false };
    let steps = 0;
    while (isMoving(ball) && steps < 2400) {
      collider.step(ball, PHYSICS.fixedStep);
      steps++;
    }
    expect(steps).toBe(shot.steps);
    expect(ball.sunk).toBe(shot.sunk);
    expect(ball.x).toBe(shot.restX);
    expect(ball.z).toBe(shot.restZ);
  });

  it("computes launch velocity like the server", () => {
    const len = Math.sqrt(0.3 * 0.3 + 1);
    expect(launchVelocity(0.3, 1, 1.5)).toEqual({ vx: (0.3 / len) * 18, vz: (1 / len) * 18 });
  });
});
