import type { HoleDefinition } from "./course/types";
import type { PlayerState } from "./net/protocol";
import { HoleCollider, PHYSICS, isMoving, type Ball } from "./physics";

export interface Launch {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export interface BallPose {
  x: number;
  z: number;
  sunk: boolean;
}

/** Rate (1/s) at which a leftover mismatch eases to the server's resting spot. */
const CORRECTION_RATE = 10;
/** Stop a local roll if the server has reported this shot at rest for this long. */
const STUCK_AFTER = 1.5;
const MAX_STEPS = 2400;

interface Track {
  launch: Launch;
  ball: Ball;
  prevX: number;
  prevZ: number;
  acc: number;
  /** Server stroke count once this shot is included; older state messages are ignored. */
  strokes: number;
  serverRestFor: number;
}

/**
 * Replays shots locally with the server's physics so balls move without waiting on the network.
 * Server state stays authoritative: once it reports the shot at rest, any difference is eased away.
 */
export class BallSim {
  private collider: HoleCollider | null = null;
  private readonly tracks = new Map<string, Track>();

  setHole(hole: HoleDefinition | null): void {
    this.collider = hole ? new HoleCollider(hole) : null;
    this.tracks.clear();
  }

  /** Starts (or restarts) a roll, fast-forwarding `elapsed` seconds. Returns false when no hole is active. */
  launch(id: string, launch: Launch, strokes: number, elapsed = 0): boolean {
    if (!this.collider) return false;
    const ball: Ball = { ...launch, sunk: false };
    const track: Track = { launch, ball, prevX: ball.x, prevZ: ball.z, acc: 0, strokes, serverRestFor: 0 };
    this.tracks.set(id, track);
    this.advance(track, Math.max(0, elapsed));
    track.prevX = ball.x;
    track.prevZ = ball.z;
    return true;
  }

  launchOf(id: string): Launch | null {
    return this.tracks.get(id)?.launch ?? null;
  }

  confirm(id: string, strokes: number): void {
    const track = this.tracks.get(id);
    if (track) track.strokes = strokes;
  }

  clear(id: string): void {
    this.tracks.delete(id);
  }

  moving(id: string): boolean {
    const track = this.tracks.get(id);
    return !!track && isMoving(track.ball);
  }

  /** True once the local roll has stopped and the server's state includes it, so a new shot can start from `player`. */
  settled(player: PlayerState): boolean {
    const track = this.tracks.get(player.id);
    return !track || (!isMoving(track.ball) && player.strokes >= track.strokes);
  }

  update(dt: number): void {
    for (const track of this.tracks.values()) this.advance(track, dt);
  }

  /** Where to draw `player` this frame; call once per frame per player after `update`. */
  pose(player: PlayerState, dt: number): BallPose {
    const track = this.tracks.get(player.id);
    if (!track) return { x: player.x, z: player.z, sunk: player.sunk };
    const { ball } = track;
    const serverCaughtUp = player.strokes >= track.strokes;
    const serverAtRest = serverCaughtUp && !player.moving;

    if (isMoving(ball)) {
      track.serverRestFor = serverAtRest ? track.serverRestFor + dt : 0;
      if (track.serverRestFor > STUCK_AFTER) ball.vx = ball.vz = 0;
      const k = track.acc / PHYSICS.fixedStep;
      return { x: track.prevX + (ball.x - track.prevX) * k, z: track.prevZ + (ball.z - track.prevZ) * k, sunk: false };
    }
    if (!serverAtRest) return { x: ball.x, z: ball.z, sunk: ball.sunk };

    const k = 1 - Math.exp(-dt * CORRECTION_RATE);
    ball.x += (player.x - ball.x) * k;
    ball.z += (player.z - ball.z) * k;
    if (Math.abs(player.x - ball.x) + Math.abs(player.z - ball.z) < 1e-3 || ball.sunk !== player.sunk) {
      this.tracks.delete(player.id);
      return { x: player.x, z: player.z, sunk: player.sunk };
    }
    return { x: ball.x, z: ball.z, sunk: player.sunk };
  }

  private advance(track: Track, dt: number): void {
    const collider = this.collider;
    if (!collider || !isMoving(track.ball)) {
      track.acc = 0;
      track.prevX = track.ball.x;
      track.prevZ = track.ball.z;
      return;
    }
    track.acc += dt;
    for (let n = 0; track.acc >= PHYSICS.fixedStep && n < MAX_STEPS; n++) {
      track.prevX = track.ball.x;
      track.prevZ = track.ball.z;
      collider.step(track.ball, PHYSICS.fixedStep);
      track.acc -= PHYSICS.fixedStep;
      if (!isMoving(track.ball)) {
        track.acc = 0;
        track.prevX = track.ball.x;
        track.prevZ = track.ball.z;
        break;
      }
    }
  }
}
