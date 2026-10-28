import { PerspectiveCamera, Vector3 } from "three";
import { Ease } from "../../../game-player/render/tween";

export interface Pose {
  target: Vector3;
  yaw: number;
  pitch: number;
  distance: number;
}

export const CAMERA = {
  minDistance: 3,
  maxDistance: 34,
  minPitch: 0.22,
  maxPitch: 1.4,
  playDistance: 8,
  playPitch: 0.62,
  orbitSpeed: 0.006,
} as const;

/** Transition beats in seconds; total stays under the server's 4.5 s hole transition. */
export const TRANSITION = { hold: 0.8, zoomOut: 1.0, pan: 1.3, zoomIn: 1.1 } as const;

const lerpAngle = (a: number, b: number, k: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

const mix = (a: Pose, b: Pose, k: number): Pose => ({
  target: a.target.clone().lerp(b.target, k),
  yaw: lerpAngle(a.yaw, b.yaw, k),
  pitch: a.pitch + (b.pitch - a.pitch) * k,
  distance: a.distance + (b.distance - a.distance) * k,
});

/** Yaw that places the camera behind `from`, looking toward `to`. */
export const yawToward = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(from.x - to.x, from.z - to.z);

/** Distance that fits a `size`-wide area in view at a steep pitch. */
export const overviewDistance = (size: number, fovDeg: number) => Math.max(10, (size * 0.62) / Math.tan(((fovDeg / 2) * Math.PI) / 180));

/**
 * Pose for `t` seconds into a hole transition: hold on the finished hole, zoom out over it,
 * pan to the next hole, then zoom in behind the next tee.
 */
export function transitionPose(t: number, start: Pose, overview: Pose, nextOverview: Pose, nextTee: Pose): Pose {
  const { hold, zoomOut, pan, zoomIn } = TRANSITION;
  if (t < hold) return start;
  t -= hold;
  if (t < zoomOut) return mix(start, overview, Ease.inOutQuad(t / zoomOut));
  t -= zoomOut;
  if (t < pan) return mix(overview, nextOverview, Ease.inOutQuad(t / pan));
  t -= pan;
  return mix(nextOverview, nextTee, Ease.inOutQuad(Math.min(1, t / zoomIn)));
}

/** Owns the perspective camera: player orbit/zoom, smooth follow, and scripted transitions. */
export class CameraRig {
  readonly camera = new PerspectiveCamera(50, 16 / 9, 0.1, 400);
  pose: Pose = { target: new Vector3(), yaw: 0, pitch: CAMERA.playPitch, distance: CAMERA.playDistance };
  private follow: Vector3 | null = null;
  private script: ((t: number) => Pose) | null = null;
  private scriptTime = 0;
  private scriptLength = 0;

  get scripted(): boolean {
    return this.script !== null;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  orbit(dx: number, dy: number): void {
    if (this.script) return;
    this.pose.yaw -= dx * CAMERA.orbitSpeed;
    this.pose.pitch = Math.min(CAMERA.maxPitch, Math.max(CAMERA.minPitch, this.pose.pitch + dy * CAMERA.orbitSpeed));
  }

  zoom(deltaY: number): void {
    if (this.script) return;
    this.pose.distance = Math.min(CAMERA.maxDistance, Math.max(CAMERA.minDistance, this.pose.distance * Math.exp(deltaY * 0.001)));
  }

  /** Smoothly keeps `point` (usually the player's ball) as the orbit target. */
  setFollow(point: Vector3 | null): void {
    this.follow = point;
  }

  snap(pose: Pose): void {
    this.script = null;
    this.pose = { ...pose, target: pose.target.clone() };
  }

  play(length: number, script: (t: number) => Pose): void {
    this.script = script;
    this.scriptTime = 0;
    this.scriptLength = length;
  }

  update(dt: number): void {
    if (this.script) {
      this.scriptTime += dt;
      this.pose = this.script(this.scriptTime);
      if (this.scriptTime >= this.scriptLength) this.script = null;
    } else if (this.follow) {
      this.pose.target.lerp(this.follow, 1 - Math.exp(-dt * 6));
    }
    const { target, yaw, pitch, distance } = this.pose;
    this.camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    this.camera.lookAt(target);
  }
}
