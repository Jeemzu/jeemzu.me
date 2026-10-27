import { AddEquation, BufferGeometry, CustomBlending, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, OneFactor, OneMinusDstColorFactor, PlaneGeometry, RingGeometry, ZeroFactor, type Material } from "three";
import { Stage } from "../../game-player/render/Stage";
import { rectangle } from "../../game-player/render/primitives";
import { HEIGHT, WIDTH, type AimOptions } from "./config";
import { gridLayout } from "./grid";
import type { AimState } from "./logic";
import { STYLE } from "./style";

const BAR_HEIGHT = 6;
const BAR_GAP = 28;

// Writes 1 - destination, so pointer feedback stays visible over black tiles, white tiles and the backdrop.
function invert<M extends Material>(material: M): M {
  Object.assign(material, {
    blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneMinusDstColorFactor, blendDst: ZeroFactor,
    blendSrcAlpha: OneFactor, blendDstAlpha: ZeroFactor, depthTest: false, depthWrite: false,
  });
  return material;
}

export class AimRenderer {
  readonly stage: Stage;
  private readonly tiles: ReturnType<typeof rectangle>[] = [];
  private readonly crosshair = new Group();
  private readonly rings: { mesh: Mesh<RingGeometry, MeshBasicMaterial>; age: number }[] = [];
  private readonly bar = new Group();
  private readonly fill: ReturnType<typeof rectangle>;
  private readonly barLeft: number;
  private readonly barWidth: number;
  constructor(host: HTMLElement, options: AimOptions) {
    this.stage = new Stage(host, { logicalSize: { width: WIDTH, height: HEIGHT }, background: null });
    this.stage.canvas.setAttribute("aria-label", "zAim targets");
    this.stage.canvas.style.cursor = "none";
    const grid = gridLayout(options.mode);
    for (let row = 0; row < grid.columns; row++) for (let col = 0; col < grid.columns; col++) {
      const x = grid.x + (col + 0.5) * grid.size, y = grid.y + (row + 0.5) * grid.size;
      const border = rectangle(grid.size - 1, grid.size - 1, STYLE.border);
      border.position.set(x, y, 0);
      const tile = rectangle(grid.size - 4, grid.size - 4, STYLE.inactive);
      tile.position.set(x, y, 1);
      this.tiles.push(tile);
      this.stage.root.add(border, tile);
    }
    this.barLeft = grid.x;
    this.barWidth = grid.columns * grid.size;
    const barY = grid.y - BAR_GAP;
    const track = rectangle(this.barWidth, BAR_HEIGHT, STYLE.track);
    track.material.transparent = true;
    track.material.opacity = 0.14;
    track.position.set(this.barLeft + this.barWidth / 2, barY, 0);
    this.fill = rectangle(this.barWidth, BAR_HEIGHT, STYLE.fill);
    this.fill.position.set(this.barLeft + this.barWidth / 2, barY, 1);
    this.bar.add(track, this.fill);
    this.bar.visible = options.mode !== "reflex";
    this.stage.root.add(this.bar);

    const hairGeometry = new BufferGeometry();
    hairGeometry.setAttribute("position", new Float32BufferAttribute([-15, 0, 0, -6, 0, 0, 6, 0, 0, 15, 0, 0, 0, -15, 0, 0, -6, 0, 0, 6, 0, 0, 15, 0], 3));
    const hair = new LineSegments(hairGeometry, invert(new LineBasicMaterial({ color: 0xffffff })));
    const dot = new Mesh(new PlaneGeometry(3, 3), invert(new MeshBasicMaterial({ color: 0xffffff })));
    this.crosshair.add(hair, dot);
    this.crosshair.visible = false;
    this.crosshair.renderOrder = 10;
    this.stage.root.add(this.crosshair);
    for (let i = 0; i < 8; i++) {
      const mesh = new Mesh(new RingGeometry(9, 10, 40), invert(new MeshBasicMaterial({ color: 0xffffff })));
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.stage.root.add(mesh);
      this.rings.push({ mesh, age: 1 });
    }
  }
  sync(state: AimState): void {
    this.tiles.forEach((tile, index) => tile.material.color.set(index === state.missedCell ? STYLE.miss : state.targets[index] ? STYLE.active : STYLE.inactive));
    const fraction = state.timeLimit > 0 ? Math.min(1, state.remaining / state.timeLimit) : 0;
    this.fill.visible = fraction > 0;
    this.fill.scale.x = Math.max(fraction, 1e-4);
    this.fill.position.x = this.barLeft + this.barWidth * fraction / 2;
  }
  pointer(x: number, y: number): void { this.crosshair.visible = true; this.crosshair.position.set(x, y, 5); }
  hidePointer(): void { this.crosshair.visible = false; }
  hit(cell: number): void {
    const ring = this.rings.reduce((oldest, current) => current.age > oldest.age ? current : oldest);
    ring.age = 0;
    ring.mesh.position.copy(this.tiles[cell].position);
    ring.mesh.position.z = 3;
  }
  animate(dt: number): void {
    for (const ring of this.rings) {
      ring.age += dt;
      ring.mesh.visible = ring.age < 0.25;
      ring.mesh.scale.setScalar(1 + ring.age * 6);
    }
  }
  reset(): void { for (const ring of this.rings) { ring.age = 1; ring.mesh.visible = false; } }
  dispose(): void { this.stage.dispose(); }
}
