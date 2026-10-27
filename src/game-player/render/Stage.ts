import {
  Color,
  Group,
  HalfFloatType,
  Line,
  Mesh,
  OrthographicCamera,
  Scene,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
  type ColorRepresentation,
  type Material,
  type Object3D,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { LogicalSize, ViewportSize } from "../contract";

export interface BloomOptions {
  strength: number;
  radius: number;
  threshold: number;
}

export interface StageOptions {
  logicalSize: LogicalSize;
  /** `null` renders a transparent canvas so the Player background shows through. */
  background: ColorRepresentation | null;
  bloom?: BloomOptions;
}

/**
 * Owns the WebGL canvas for one game. Games add objects to `root`, which uses
 * y-down logical coordinates (0,0 = top-left, logicalSize = bottom-right).
 * The canvas backing store always matches CSS size × devicePixelRatio, so output stays crisp.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: OrthographicCamera;
  readonly root = new Group();
  readonly logicalSize: LogicalSize;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(host: HTMLElement, opts: StageOptions) {
    const { width, height } = opts.logicalSize;
    this.logicalSize = opts.logicalSize;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: opts.background === null, powerPreference: "high-performance" });
    // scene.background (not setClearColor) is converted per render target, so post-processing doesn't double-encode it.
    if (opts.background === null) this.renderer.setClearColor(0x000000, 0);
    else this.scene.background = new Color(opts.background);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);

    this.camera = new OrthographicCamera(0, width, height, 0, -1000, 1000);
    this.camera.position.z = 10;
    this.root.position.y = height;
    this.root.scale.y = -1;
    this.scene.add(this.root);

    if (opts.bloom) this.enableBloom(opts.bloom);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private enableBloom(b: BloomOptions): void {
    // Multisampled target keeps edges antialiased once post-processing is active.
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const { width, height } = this.logicalSize;
    this.bloomPass = new UnrealBloomPass(new Vector2(width, height), b.strength, b.radius, b.threshold);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  setBloom(b: Partial<BloomOptions>): void {
    if (!this.bloomPass) return;
    if (b.strength !== undefined) this.bloomPass.strength = b.strength;
    if (b.radius !== undefined) this.bloomPass.radius = b.radius;
    if (b.threshold !== undefined) this.bloomPass.threshold = b.threshold;
  }

  resize({ cssWidth, cssHeight, dpr }: ViewportSize): void {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(cssWidth, cssHeight, false);
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(cssWidth, cssHeight);
    }
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    disposeTree(this.scene);
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

/** Frees GPU resources for every mesh below `obj`. */
export function disposeTree(obj: Object3D): void {
  obj.traverse((o) => {
    if (!(o instanceof Mesh) && !(o instanceof Line)) return;
    o.geometry?.dispose();
    const mats: Material[] = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => m?.dispose());
  });
}
