import {
  BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, Object3D, Path, PlaneGeometry, Shape, ShapeGeometry,
} from "three";
import { Stage } from "../../game-player/render/Stage";
import { BOARD_HEIGHT, BOARD_WIDTH, CELL_SIZE, COLS, ROWS } from "./config";
import { cells, ghost, type TetrisState } from "./logic";
import { PIECE_COLORS, STYLE } from "./style";
import type { PieceType } from "./pieces";

function rimGeometry(): ShapeGeometry {
  const shape = new Shape();
  shape.moveTo(-14, -14); shape.lineTo(14, -14); shape.lineTo(14, 14); shape.lineTo(-14, 14); shape.closePath();
  const hole = new Path();
  hole.moveTo(-12, -12); hole.lineTo(-12, 12); hole.lineTo(12, 12); hole.lineTo(12, -12); hole.closePath();
  shape.holes.push(hole);
  return new ShapeGeometry(shape);
}

export class TetrisRenderer {
  readonly stage: Stage;
  private readonly fills = new InstancedMesh(new PlaneGeometry(26, 26), new MeshBasicMaterial(), COLS * ROWS + 4);
  private readonly rims = new InstancedMesh(rimGeometry(), new MeshBasicMaterial(), COLS * ROWS + 4);
  private readonly sheen = new InstancedMesh(new PlaneGeometry(22, 1.5), new MeshBasicMaterial(), COLS * ROWS + 4);
  private readonly ghosts = new InstancedMesh(rimGeometry(), new MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false }), 4);
  private readonly flashes: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly transform = new Object3D();
  private readonly color = new Color();
  private readonly white = new Color(0xffffff);
  private clearAge = 1;

  constructor(host: HTMLElement) {
    this.stage = new Stage(host, { logicalSize: { width: BOARD_WIDTH, height: BOARD_HEIGHT }, background: STYLE.background, bloom: STYLE.bloom });
    this.stage.canvas.setAttribute("aria-label", "Tetris board");
    const points: number[] = [];
    for (let col = 0; col <= COLS; col++) points.push(col * CELL_SIZE, 0, 0, col * CELL_SIZE, BOARD_HEIGHT, 0);
    for (let row = 0; row <= ROWS; row++) points.push(0, row * CELL_SIZE, 0, BOARD_WIDTH, row * CELL_SIZE, 0);
    const grid = new BufferGeometry();
    grid.setAttribute("position", new Float32BufferAttribute(points, 3));
    this.stage.root.add(new LineSegments(grid, new LineBasicMaterial({ color: STYLE.grid, transparent: true, opacity: 0.45 })));
    const frame = new BufferGeometry();
    frame.setAttribute("position", new Float32BufferAttribute([
      1, 1, 0, BOARD_WIDTH - 1, 1, 0, BOARD_WIDTH - 1, 1, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0,
      BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0, 1, BOARD_HEIGHT - 1, 0, 1, BOARD_HEIGHT - 1, 0, 1, 1, 0,
    ], 3));
    this.stage.root.add(new LineSegments(frame, new LineBasicMaterial({ color: STYLE.border })));
    for (const mesh of [this.fills, this.rims, this.sheen, this.ghosts]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.stage.root.add(mesh);
    }
    for (let i = 0; i < 4; i++) {
      const flash = new Mesh(new PlaneGeometry(BOARD_WIDTH - 4, CELL_SIZE - 2), new MeshBasicMaterial({ color: STYLE.clear, transparent: true, depthWrite: false }));
      flash.visible = false;
      this.flashes.push(flash);
      this.stage.root.add(flash);
    }
  }

  private block(index: number, row: number, col: number, type: PieceType): void {
    this.transform.position.set((col + 0.5) * CELL_SIZE, (row + 0.5) * CELL_SIZE, 1);
    this.transform.updateMatrix();
    this.fills.setMatrixAt(index, this.transform.matrix);
    this.rims.setMatrixAt(index, this.transform.matrix);
    this.transform.position.y -= 10;
    this.transform.position.z = 2;
    this.transform.updateMatrix();
    this.sheen.setMatrixAt(index, this.transform.matrix);
    this.fills.setColorAt(index, this.color.set(PIECE_COLORS[type]).multiplyScalar(0.16));
    this.rims.setColorAt(index, this.color.set(PIECE_COLORS[type]));
    this.sheen.setColorAt(index, this.color.set(PIECE_COLORS[type]).lerp(this.white, 0.35));
  }

  sync(state: TetrisState): void {
    let index = 0;
    state.board.forEach((row, r) => row.forEach((type, col) => {
      if (type) this.block(index++, r, col, type);
    }));
    if (state.active) {
      for (const cell of cells(state.active)) {
        if (cell.row >= 0) this.block(index++, cell.row, cell.col, state.active.type);
      }
    }
    for (const mesh of [this.fills, this.rims, this.sheen]) {
      mesh.count = index;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const target = ghost(state);
    let ghostCount = 0;
    if (target) {
      for (const { row, col } of cells(target)) {
        if (row < 0) continue;
        this.transform.position.set((col + 0.5) * CELL_SIZE, (row + 0.5) * CELL_SIZE, 0.5);
        this.transform.updateMatrix();
        this.ghosts.setMatrixAt(ghostCount, this.transform.matrix);
        this.ghosts.setColorAt(ghostCount++, this.color.set(PIECE_COLORS[target.type]));
      }
    }
    this.ghosts.count = ghostCount;
    this.ghosts.instanceMatrix.needsUpdate = true;
    if (this.ghosts.instanceColor) this.ghosts.instanceColor.needsUpdate = true;
  }

  clearRows(rows: number[]): void {
    this.clearAge = 0;
    this.flashes.forEach((flash, index) => {
      flash.visible = index < rows.length;
      if (flash.visible) flash.position.set(BOARD_WIDTH / 2, (rows[index] + 0.5) * CELL_SIZE, 4);
    });
  }

  animate(dt: number): void {
    this.clearAge += dt;
    for (const flash of this.flashes) {
      flash.material.opacity = Math.max(0, 1 - this.clearAge / 0.25) * 0.28;
      if (this.clearAge >= 0.25) flash.visible = false;
    }
  }

  reset(state: TetrisState): void {
    this.clearAge = 1;
    this.animate(0);
    this.sync(state);
  }

  dispose(): void {
    for (const mesh of [this.fills, this.rims, this.sheen, this.ghosts]) mesh.dispose();
    this.stage.dispose();
  }
}
