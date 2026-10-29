import { describe, expect, it } from "vitest";
import type { CourseFile } from "./course/types";
import { LatencyStats } from "./net/latency";
import { socketUrl } from "./net/PuttClient";
import type { PlayerState } from "./net/protocol";
import fixture from "./physics.fixture.json";
import { BallSim } from "./sim";

const hole = (fixture.course as unknown as CourseFile).holes[0];
const shot = fixture.shots.find((s) => s.hole === 0 && !s.sunk)!;
const launch = { x: shot.x, z: shot.z, vx: shot.vx, vz: shot.vz };

const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  id: "a", name: "A", icon: "frog", color: 0, connected: true, disqualified: false,
  x: shot.x, z: shot.z, moving: false, sunk: false, strokes: 0, holeDone: false, scores: [], total: 0, ...over,
});

const run = (sim: BallSim, seconds: number, p: PlayerState) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    sim.update(1 / 60);
    sim.pose(p, 1 / 60);
  }
};

describe("BallSim", () => {
  it("rolls a launched ball locally and stops where the server does", () => {
    const sim = new BallSim();
    sim.setHole(hole);
    sim.launch("a", launch, 1);
    const stale = player();
    sim.update(0.1);
    const moved = sim.pose(stale, 0.1);
    expect(moved.x !== shot.x || moved.z !== shot.z).toBe(true);
    run(sim, 30, stale);
    // The server hasn't reported this shot yet, so the local result is kept.
    expect(sim.pose(stale, 0)).toMatchObject({ x: shot.restX, z: shot.restZ });
    expect(sim.settled(stale)).toBe(false);
    expect(sim.settled(player({ strokes: 1, x: shot.restX, z: shot.restZ }))).toBe(true);
  });

  it("fast-forwards a shot that was already rolling", () => {
    const sim = new BallSim();
    sim.setHole(hole);
    sim.launch("a", launch, 1, 60);
    expect(sim.moving("a")).toBe(false);
    expect(sim.pose(player(), 0)).toMatchObject({ x: shot.restX, z: shot.restZ });
  });

  it("eases a mismatch to the server's resting spot, then follows the server", () => {
    const sim = new BallSim();
    sim.setHole(hole);
    sim.launch("a", launch, 1, 60);
    const server = player({ strokes: 1, x: shot.restX + 0.5, z: shot.restZ });
    const first = sim.pose(server, 1 / 60);
    expect(first.x).toBeGreaterThan(shot.restX);
    expect(first.x).toBeLessThan(server.x);
    run(sim, 3, server);
    expect(sim.pose(server, 0)).toEqual({ x: server.x, z: server.z, sunk: false });
  });

  it("stops a local roll the server has long reported at rest", () => {
    const long = fixture.shots.filter((s) => s.hole === 0).reduce((a, b) => (b.steps > a.steps ? b : a));
    expect(long.steps / 120).toBeGreaterThan(2);
    const sim = new BallSim();
    sim.setHole(hole);
    sim.launch("a", { x: long.x, z: long.z, vx: long.vx, vz: long.vz }, 1);
    run(sim, 1.6, player({ strokes: 1, x: long.x, z: long.z }));
    expect(sim.moving("a")).toBe(false);
  });

  it("ignores launches with no active hole", () => {
    const sim = new BallSim();
    expect(sim.launch("a", launch, 1)).toBe(false);
  });
});

describe("latency", () => {
  it("tracks min, average and jitter over recent pings", () => {
    const stats = new LatencyStats(3);
    stats.add(100);
    stats.add(50);
    stats.add(70);
    expect(stats.add(90)).toEqual({ rtt: 90, min: 50, avg: 70, jitter: 20 });
  });

  it("builds the realtime socket URL", () => {
    expect(socketUrl("wss://play.jeemzu.me/")).toBe("wss://play.jeemzu.me/v1/games/putt-party/ws");
  });
});
