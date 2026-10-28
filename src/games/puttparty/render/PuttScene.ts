import {
  ACESFilmicToneMapping,
  Color,
  ConeGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  Plane,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { ViewportSize } from "../../../game-player/contract";
import { bounds } from "../course/geometry";
import { RULES, type CourseFile, type Vec2 } from "../course/types";
import type { PlayerState } from "../net/protocol";
import { CameraRig } from "./CameraRig";
import { CourseView } from "./CourseView";
import { PuttMaterials, playerColor } from "./materials";
import type { LoadedModels } from "./models";

const ARROW_COUNT = 12;
const ARROW_SPACING = 0.32;

interface BallView {
  mesh: Mesh;
  material: MeshStandardMaterial;
  label: CSS2DObject;
  color: number;
  sinkT: number;
}

/** Owns the WebGL renderer, scene graph and every GPU resource for one mounted game. */
export class PuttScene {
  readonly renderer: WebGLRenderer;
  readonly labels = new CSS2DRenderer();
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  readonly mats = new PuttMaterials();
  course: CourseView | null = null;
  private readonly sun: DirectionalLight;
  private readonly balls = new Map<string, BallView>();
  private readonly ballGeo = new SphereGeometry(RULES.ballRadius, 24, 16);
  private readonly arrowGeo = new ConeGeometry(0.11, 0.22, 3).rotateX(Math.PI / 2);
  private readonly arrows = new Group();
  private readonly arrowMats: MeshStandardMaterial[] = [];
  private readonly raycaster = new Raycaster();
  private readonly ground = new Plane(new Vector3(0, 1, 0), 0);
  private models: LoadedModels = {};

  constructor(host: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    host.appendChild(canvas);

    const labelEl = this.labels.domElement;
    labelEl.className = "bpp-labels";
    host.appendChild(labelEl);

    this.scene.background = new Color("#9fd4f2");
    this.scene.fog = new Fog("#b9e0f2", 40, 110);
    this.scene.add(new HemisphereLight("#e8f6ff", "#4a7a3a", 1.4));
    this.sun = new DirectionalLight("#fff3dc", 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -16;
    cam.right = cam.top = 16;
    cam.near = 1;
    cam.far = 80;
    this.scene.add(this.sun, this.sun.target);

    for (let i = 0; i < ARROW_COUNT; i++) {
      const mat = new MeshStandardMaterial({ emissiveIntensity: 0.6, roughness: 0.4 });
      this.arrowMats.push(mat);
      const m = new Mesh(this.arrowGeo, mat);
      m.castShadow = true;
      this.arrows.add(m);
    }
    this.arrows.visible = false;
    this.scene.add(this.arrows);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setModels(models: LoadedModels): void {
    this.models = models;
  }

  setCourse(course: CourseFile | null): void {
    if (this.course?.id === course?.id && course) return;
    this.course?.dispose();
    this.course = course ? new CourseView(course, this.mats, this.models) : null;
    if (this.course) this.scene.add(this.course.root);
  }

  resize({ cssWidth, cssHeight, dpr }: ViewportSize): void {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    this.renderer.setPixelRatio(Math.min(dpr, 2));
    this.renderer.setSize(cssWidth, cssHeight, false);
    this.labels.setSize(cssWidth, cssHeight);
    this.rig.setAspect(cssWidth / cssHeight);
  }

  /** Ground-plane point under a client position, or null if the ray misses. */
  pick(clientX: number, clientY: number): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.rig.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, new Vector3());
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  syncBalls(players: PlayerState[], positions: Map<string, Vec2>, selfId: string | null, dt: number): void {
    const seen = new Set<string>();
    for (const p of players) {
      seen.add(p.id);
      let view = this.balls.get(p.id);
      if (!view) view = this.addBall(p);
      if (view.color !== p.color) {
        view.color = p.color;
        view.material.color.set(playerColor(p.color));
      }
      const pos = positions.get(p.id) ?? p;
      view.sinkT = p.sunk ? Math.min(1, view.sinkT + dt * 3) : 0;
      view.mesh.visible = !p.disqualified && view.sinkT < 1;
      view.mesh.position.set(pos.x, RULES.ballRadius - view.sinkT * 0.45, pos.z);
      const el = view.label.element;
      el.textContent = p.name;
      el.dataset.self = String(p.id === selfId);
      el.dataset.offline = String(!p.connected);
      view.label.visible = view.mesh.visible && !p.sunk;
    }
    for (const [id, view] of this.balls)
      if (!seen.has(id)) {
        view.mesh.removeFromParent();
        view.label.element.remove();
        view.material.dispose();
        this.balls.delete(id);
      }
  }

  private addBall(p: PlayerState): BallView {
    const material = new MeshStandardMaterial({ color: playerColor(p.color), roughness: 0.35, metalness: 0.05 });
    const mesh = new Mesh(this.ballGeo, material);
    mesh.castShadow = true;
    const el = document.createElement("div");
    el.className = "bpp-tag";
    el.style.setProperty("--bpp-color", playerColor(p.color));
    const label = new CSS2DObject(el);
    label.position.set(0, 0.55, 0);
    mesh.add(label);
    this.scene.add(mesh);
    const view = { mesh, material, label, color: p.color, sinkT: 0 };
    this.balls.set(p.id, view);
    return view;
  }

  /** Shows the shot indicator from `from` along `dir`; length and colour scale with power. */
  showAim(from: Vec2, dir: Vec2, power: number): void {
    const count = Math.max(1, Math.ceil(power * ARROW_COUNT));
    const color = new Color().setHSL(0.33 - power * 0.33, 0.9, 0.5);
    const yaw = Math.atan2(dir.x, dir.z);
    this.arrows.children.forEach((child, i) => {
      child.visible = i < count;
      const d = 0.45 + i * ARROW_SPACING;
      child.position.set(from.x + dir.x * d, 0.12, from.z + dir.z * d);
      child.rotation.set(0, yaw, 0);
      this.arrowMats[i].color.copy(color);
      this.arrowMats[i].emissive.copy(color);
    });
    this.arrows.visible = true;
  }

  hideAim(): void {
    this.arrows.visible = false;
  }

  /** Points the sun's shadow frustum at the active hole. */
  focusLight(holeIndex: number): void {
    const hole = this.course?.holes[holeIndex];
    if (!hole) return;
    const c = hole.center;
    this.sun.position.set(c.x + 12, 24, c.z + 8);
    this.sun.target.position.copy(c);
    const b = hole.bounds;
    const half = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + 3;
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -half;
    cam.right = cam.top = half;
    cam.updateProjectionMatrix();
  }

  courseBounds() {
    return this.course ? bounds(this.course.holes.flatMap((h) => h.def.boundary)) : null;
  }

  render(dt: number): void {
    this.rig.update(dt);
    this.renderer.render(this.scene, this.rig.camera);
    this.labels.render(this.scene, this.rig.camera);
  }

  dispose(): void {
    this.course?.dispose();
    for (const view of this.balls.values()) view.material.dispose();
    this.balls.clear();
    this.ballGeo.dispose();
    this.arrowGeo.dispose();
    this.arrowMats.forEach((m) => m.dispose());
    this.mats.dispose();
    for (const model of Object.values(this.models))
      model?.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.labels.domElement.remove();
  }
}
