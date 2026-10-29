import { Vector3 } from "three";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GameInstance, ViewportSize } from "../../game-player/contract";
import { GameLoop } from "../../game-player/render/GameLoop";
import { advanceWobble, canShoot, createAim, pull, wobbledDir } from "./aim";
import { distance } from "./course/geometry";
import type { Vec2 } from "./course/types";
import { LatencyStats } from "./net/latency";
import { PuttClient, socketUrl } from "./net/PuttClient";
import type { ServerMessage, ShotStartedMessage, StateMessage } from "./net/protocol";
import { launchVelocity } from "./physics";
import { CAMERA, overviewDistance, transitionPose, TRANSITION, yawToward, type Pose } from "./render/CameraRig";
import { loadModels } from "./render/models";
import { PuttScene } from "./render/PuttScene";
import { BallSim } from "./sim";
import { createPuttStore, type PuttIntents } from "./store";
import { Overlay } from "./ui/Overlay";
import "./ui/puttparty.css";

const REALTIME_BASE = import.meta.env.VITE_GAMES_REALTIME_URL || "ws://localhost:5290";
const SHOWCASE_SPIN = 0.06;
/** Give up on an unacknowledged shot after this long and put the ball back. */
const SHOT_TIMEOUT_MS = 3000;

/** One mounted Better Putt Party client: socket, store, renderer, input and the React overlay. */
export class PuttGame implements GameInstance {
  private readonly scene: PuttScene;
  private readonly store = createPuttStore();
  private readonly client: PuttClient;
  private readonly sim = new BallSim();
  private readonly latency = new LatencyStats();
  private readonly loop: GameLoop;
  private readonly overlayEl: HTMLDivElement;
  private readonly overlay: Root;
  private readonly abort = new AbortController();
  private readonly aim = createAim();
  private readonly follow = new Vector3();
  private readonly positions = new Map<string, Vec2>();
  private aiming = false;
  private orbiting: { x: number; y: number } | null = null;
  private pendingShot = 0;
  private showcase = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(host: HTMLElement) {
    this.scene = new PuttScene(host);
    this.overlayEl = document.createElement("div");
    host.appendChild(this.overlayEl);
    this.overlay = createRoot(this.overlayEl);
    this.overlay.render(createElement(Overlay, { store: this.store, intents: this.intents }));

    this.client = new PuttClient(socketUrl(REALTIME_BASE), {
      onMessage: (msg) => this.onMessage(msg),
      onStatus: (connection) => {
        if (connection !== "open") this.latency.reset();
        this.store.setState(connection === "open" ? { connection } : { connection, latency: null });
      },
      onPing: (ms) => this.store.setState({ latency: this.latency.add(ms) }),
    });
    this.loop = new GameLoop({ update: (dt) => this.update(dt), render: () => this.scene.render(this.frameDt) });
    this.bindInput();
    this.enterShowcase();

    void loadModels(this.abort.signal).then((models) => {
      if (this.abort.signal.aborted || Object.keys(models).length === 0) return;
      this.scene.setModels(models);
      const course = this.store.getState().course;
      if (course) {
        this.scene.setCourse(null);
        this.scene.setCourse(course);
      }
    });
  }

  private frameDt = 0;

  readonly intents: PuttIntents = {
    create: (profile) => this.client.send({ type: "create", ...profile }),
    join: (code, profile) => this.client.send({ type: "join", code, ...profile }),
    selectCourse: (courseId) => this.client.send({ type: "selectCourse", courseId }),
    start: () => this.client.send({ type: "start" }),
    returnToLobby: () => this.client.send({ type: "returnToLobby" }),
    leave: () => {
      this.client.leave();
      this.cancelAim();
      this.store.setState({ state: null, playerId: null });
      this.enterShowcase();
    },
    clearError: () => this.store.setState({ error: null }),
  };

  start(): void {
    this.loop.resume();
    this.loop.start();
  }

  pause(): void {
    this.loop.pause();
  }

  resume(): void {
    this.loop.resume();
  }

  resize(size: ViewportSize): void {
    this.scene.resize(size);
  }

  destroy(): void {
    this.abort.abort();
    this.loop.stop();
    this.client.dispose();
    this.cleanups.forEach((fn) => fn());
    // React cannot unmount a root synchronously while the host page is mid-render.
    const root = this.overlay, el = this.overlayEl;
    setTimeout(() => {
      root.unmount();
      el.remove();
    });
    this.scene.dispose();
  }

  private onMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "welcome":
        this.store.setState({ playerId: msg.playerId, courses: msg.courses, error: null });
        break;
      case "course":
        this.store.setState({ course: msg.course });
        this.scene.setCourse(msg.course);
        if (this.showcase) this.enterShowcase();
        break;
      case "state":
        this.onState(msg);
        break;
      case "shotStarted":
        this.onShotStarted(msg);
        break;
      case "error":
        this.store.setState({ error: { code: msg.code, at: performance.now() } });
        if (msg.code === "resumeFailed") {
          this.store.setState({ state: null, playerId: null });
          this.enterShowcase();
        }
        this.cancelPrediction();
        break;
    }
  }

  private onShotStarted(msg: ShotStartedMessage): void {
    const launch = { x: msg.x, z: msg.z, vx: msg.vx, vz: msg.vz };
    if (msg.playerId === this.store.getState().playerId && this.pendingShot) {
      const now = performance.now();
      const predicted = this.sim.launchOf(msg.playerId);
      this.store.setState({ shotMs: now - this.pendingShot });
      if (predicted && predicted.x === launch.x && predicted.z === launch.z && predicted.vx === launch.vx && predicted.vz === launch.vz)
        this.sim.confirm(msg.playerId, msg.strokes);
      else this.sim.launch(msg.playerId, launch, msg.strokes, (now - this.pendingShot) / 1000);
      this.pendingShot = 0;
      return;
    }
    this.sim.launch(msg.playerId, launch, msg.strokes, msg.elapsed);
  }

  /** Drops an unconfirmed local shot so the ball returns to the server's position. */
  private cancelPrediction(): void {
    const selfId = this.store.getState().playerId;
    if (this.pendingShot && selfId) this.sim.clear(selfId);
    this.pendingShot = 0;
  }

  private onState(next: StateMessage): void {
    const prev = this.store.getState().state;
    this.store.setState({ state: next });
    const self = next.players.find((p) => p.id === this.store.getState().playerId);
    if (self?.holeDone || next.phase !== "playing") this.cancelAim();

    const holeChanged = prev?.holeIndex !== next.holeIndex || prev?.courseId !== next.courseId;
    if (next.phase === "playing" && (prev?.phase !== "playing" || holeChanged)) this.enterHole(next);
    else if (next.phase === "transition" && prev?.phase !== "transition") this.enterTransition(next);
    else if ((next.phase === "lobby" || next.phase === "finished") && prev?.phase !== next.phase) this.enterShowcase(next.holeIndex);
    else if (!prev) this.enterShowcase();
  }

  private holePose(holeIndex: number): Pose | null {
    const hole = this.scene.course?.holes[holeIndex];
    if (!hole) return null;
    const { tee, cup } = hole.def;
    return { target: new Vector3(tee.x, 0, tee.z), yaw: yawToward(tee, cup), pitch: CAMERA.playPitch, distance: CAMERA.playDistance };
  }

  private overviewPose(holeIndex: number, yaw: number): Pose | null {
    const hole = this.scene.course?.holes[holeIndex];
    if (!hole) return null;
    const b = hole.bounds;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    return { target: hole.center.clone(), yaw, pitch: 1.15, distance: overviewDistance(size, this.scene.rig.camera.fov) };
  }

  private enterHole(state: StateMessage): void {
    this.showcase = false;
    this.pendingShot = 0;
    this.sim.setHole(this.store.getState().course?.holes[state.holeIndex] ?? null);
    this.scene.focusLight(state.holeIndex);
    const pose = this.holePose(state.holeIndex);
    if (pose && !this.scene.rig.scripted) this.scene.rig.snap(pose);
    this.scene.rig.setFollow(this.follow);
  }

  private enterTransition(state: StateMessage): void {
    this.showcase = false;
    const rig = this.scene.rig;
    const start = { ...rig.pose, target: rig.pose.target.clone() };
    const overview = this.overviewPose(state.holeIndex, start.yaw);
    if (!overview) return;
    const nextTee = this.holePose(state.holeIndex + 1);
    const nextOverview = nextTee && this.overviewPose(state.holeIndex + 1, nextTee.yaw);
    const { hold, zoomOut, pan, zoomIn } = TRANSITION;
    rig.setFollow(null);
    if (nextTee && nextOverview) {
      rig.play(hold + zoomOut + pan + zoomIn, (t) => {
        if (t > hold + zoomOut) this.scene.focusLight(state.holeIndex + 1);
        return transitionPose(t, start, overview, nextOverview, nextTee);
      });
    } else {
      rig.play(hold + zoomOut, (t) => transitionPose(Math.min(t, hold + zoomOut - 1e-3), start, overview, overview, overview));
    }
  }

  /** Slow orbit over a hole for menus, the waiting room and results. */
  private enterShowcase(holeIndex = 0): void {
    this.showcase = true;
    this.pendingShot = 0;
    this.sim.setHole(null);
    this.scene.rig.setFollow(null);
    this.scene.focusLight(holeIndex);
    const pose = this.overviewPose(holeIndex, this.scene.rig.pose.yaw);
    if (pose) this.scene.rig.snap({ ...pose, pitch: 0.85, distance: pose.distance * 0.9 });
  }

  private self() {
    const { state, playerId } = this.store.getState();
    return state?.players.find((p) => p.id === playerId) ?? null;
  }

  private canAim(): boolean {
    const { state, connection } = this.store.getState();
    const self = this.self();
    return !!state && state.phase === "playing" && connection === "open" && !!self && !self.holeDone && !self.moving
      && !self.disqualified && !this.pendingShot && this.sim.settled(self) && !this.scene.rig.scripted;
  }

  private cancelAim(): void {
    this.aiming = false;
    this.scene.hideAim();
  }

  private bindInput(): void {
    const canvas = this.scene.canvas;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    const updatePull = (e: PointerEvent) => {
      const self = this.self();
      const point = this.scene.pick(e.clientX, e.clientY);
      if (self && point) pull(this.aim, self, point);
    };

    on(canvas, "pointerdown", (e) => {
      if (e.button === 2) {
        this.orbiting = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0 && this.canAim()) {
        this.aiming = true;
        this.aim.phase = 0;
        canvas.setPointerCapture(e.pointerId);
        updatePull(e);
      }
    });
    on(canvas, "pointermove", (e) => {
      if (this.orbiting) {
        this.scene.rig.orbit(e.clientX - this.orbiting.x, e.clientY - this.orbiting.y);
        this.orbiting = { x: e.clientX, y: e.clientY };
      } else if (this.aiming) updatePull(e);
    });
    on(canvas, "pointerup", (e) => {
      if (e.button === 2) this.orbiting = null;
      if (e.button !== 0 || !this.aiming) return;
      updatePull(e);
      if (canShoot(this.aim) && this.canAim()) {
        const self = this.self()!;
        const dir = wobbledDir(this.aim);
        if (this.client.send({ type: "shot", dirX: dir.x, dirZ: dir.z, power: this.aim.power })) {
          this.pendingShot = performance.now();
          // Roll immediately from the server's exact resting spot; the server's echo confirms or corrects it.
          this.sim.launch(self.id, { x: self.x, z: self.z, ...launchVelocity(dir.x, dir.z, this.aim.power) }, self.strokes + 1);
        }
      }
      this.cancelAim();
    });
    on(canvas, "pointercancel", () => {
      this.orbiting = null;
      this.cancelAim();
    });
    on(canvas, "contextmenu", (e) => e.preventDefault());
    on(canvas, "wheel", (e) => {
      e.preventDefault();
      this.scene.rig.zoom(e.deltaY);
    }, { passive: false });
    on(window, "keydown", (e) => {
      if (e.code === "Escape" && this.aiming) {
        e.preventDefault();
        this.cancelAim();
      }
    });
  }

  private update(dt: number): void {
    this.frameDt = dt;
    const { state, playerId } = this.store.getState();
    if (this.pendingShot && performance.now() - this.pendingShot > SHOT_TIMEOUT_MS) this.cancelPrediction();
    if (this.showcase && !this.scene.rig.scripted) this.scene.rig.pose.yaw += dt * SHOWCASE_SPIN;

    this.sim.update(dt);
    this.positions.clear();
    const players = (state && state.phase !== "lobby" ? state.players : []).map((p) => {
      const pose = this.sim.pose(p, dt);
      this.positions.set(p.id, pose);
      return pose.sunk === p.sunk ? p : { ...p, sunk: pose.sunk };
    });
    this.scene.syncBalls(players, this.positions, playerId, dt);

    const self = players.find((p) => p.id === playerId);
    const selfPos = self && this.positions.get(self.id);
    const holeIndex = state?.holeIndex ?? 0;
    const hole = this.scene.course?.holes[holeIndex];
    if (self && selfPos && hole) {
      const target = self.sunk ? hole.def.cup : selfPos;
      this.follow.set(target.x, 0, target.z);
    }
    if (hole) {
      let nearest = Infinity;
      for (const p of players) if (!p.sunk) nearest = Math.min(nearest, distance(this.positions.get(p.id) ?? p, hole.def.cup));
      this.scene.course?.update(dt, holeIndex, nearest);
    }

    if (this.aiming && self) {
      advanceWobble(this.aim, dt);
      if (canShoot(this.aim)) this.scene.showAim(self, wobbledDir(this.aim), this.aim.power);
      else this.scene.hideAim();
    }
  }
}
