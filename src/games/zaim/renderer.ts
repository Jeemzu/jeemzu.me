import { Color, Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { Stage } from "../../game-player/render/Stage";
import { lines, rectangle } from "../../game-player/render/primitives";
import { HEIGHT, WIDTH, type AimOptions } from "./config";
import { gridLayout } from "./grid";
import type { AimState } from "./logic";
import { STYLE } from "./style";

export class AimRenderer {
  readonly stage: Stage;
  private readonly tiles: ReturnType<typeof rectangle>[] = [];
  private readonly crosshair = new Group();
  private readonly rings: { mesh: Mesh<RingGeometry, MeshBasicMaterial>; age: number }[] = [];
  private readonly accent: Color;
  constructor(host: HTMLElement, options: AimOptions) {
    this.stage = new Stage(host, { logicalSize: { width: WIDTH, height: HEIGHT }, background: STYLE.background });
    this.stage.canvas.setAttribute("aria-label", "zAim targets");
    this.stage.canvas.style.cursor = "none";
    this.accent = new Color(options.color);
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
    this.crosshair.add(lines([-15, 0, 0, -6, 0, 0, 6, 0, 0, 15, 0, 0, 0, -15, 0, 0, -6, 0, 0, 6, 0, 0, 15, 0], STYLE.crosshair));
    const dot = rectangle(3, 3, this.accent);
    this.crosshair.add(dot);
    this.crosshair.visible = false;
    this.stage.root.add(this.crosshair);
    for (let i = 0; i < 8; i++) {
      const mesh = new Mesh(new RingGeometry(9, 10, 40), new MeshBasicMaterial({ color: this.accent, transparent: true, depthWrite: false }));
      mesh.visible = false;
      this.stage.root.add(mesh);
      this.rings.push({ mesh, age: 1 });
    }
  }
  sync(state: AimState): void {
    this.tiles.forEach((tile, index) => tile.material.color.set(index === state.missedCell ? STYLE.miss : state.targets[index] ? this.accent : STYLE.inactive));
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
      ring.mesh.material.opacity = Math.max(0, 1 - ring.age * 4);
    }
  }
  reset(): void { for (const ring of this.rings) { ring.age = 1; ring.mesh.visible = false; } }
  dispose(): void { this.stage.dispose(); }
}
