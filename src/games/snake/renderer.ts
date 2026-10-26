import {
  BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, Group, InstancedMesh,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Object3D, RingGeometry, Shape, ShapeGeometry,
} from "three";
import { Stage } from "../../game-player/render/Stage";
import { BOARD_SIZE, CELL_SIZE, GRID_SIZE } from "./config";
import type { SnakeState } from "./logic";
import { STYLE } from "./style";

function segmentGeometry(): ShapeGeometry {
  const s = new Shape();
  const h = CELL_SIZE * 0.43;
  const r = 6;
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  return new ShapeGeometry(s);
}

export class SnakeRenderer {
  readonly stage: Stage;
  private readonly segments: InstancedMesh;
  private readonly eyes = new Group();
  private readonly food = new Group();
  private readonly foodCore = new Mesh(new CircleGeometry(7, 32), new MeshBasicMaterial({ color: STYLE.food }));
  private readonly foodRing = new Mesh(
    new RingGeometry(10, 10.8, 48),
    new MeshBasicMaterial({ color: STYLE.foodRing, transparent: true, opacity: 0.6 }),
  );
  private readonly ripple = new Mesh(
    new RingGeometry(12, 13, 48),
    new MeshBasicMaterial({ color: STYLE.food, transparent: true, depthWrite: false }),
  );
  private readonly particles: Mesh<CircleGeometry, MeshBasicMaterial>[] = [];
  private readonly transform = new Object3D();
  private readonly color = new Color();
  private time = 0;
  private rippleAge = 1;

  constructor(host: HTMLElement) {
    this.stage = new Stage(host, { logicalSize: { width: BOARD_SIZE, height: BOARD_SIZE }, background: STYLE.background, bloom: STYLE.bloom });
    this.stage.canvas.setAttribute("aria-label", "Snake board");
    const points: number[] = [];
    for (let i = 1; i < GRID_SIZE; i++) {
      const p = i * CELL_SIZE;
      points.push(p, 0, 0, p, BOARD_SIZE, 0, 0, p, 0, BOARD_SIZE, p, 0);
    }
    const grid = new BufferGeometry();
    grid.setAttribute("position", new Float32BufferAttribute(points, 3));
    this.stage.root.add(new LineSegments(grid, new LineBasicMaterial({ color: STYLE.grid, transparent: true, opacity: 0.4 })));
    const border = new BufferGeometry();
    const b = BOARD_SIZE - 1;
    border.setAttribute("position", new Float32BufferAttribute([1, 1, 0, b, 1, 0, b, 1, 0, b, b, 0, b, b, 0, 1, b, 0, 1, b, 0, 1, 1, 0], 3));
    this.stage.root.add(new LineSegments(border, new LineBasicMaterial({ color: STYLE.border })));

    this.segments = new InstancedMesh(segmentGeometry(), new MeshBasicMaterial(), GRID_SIZE * GRID_SIZE);
    this.segments.count = 0;
    this.segments.frustumCulled = false;
    this.stage.root.add(this.segments);

    const eyeGeometry = new CircleGeometry(2.5, 16);
    const eyeMaterial = new MeshBasicMaterial({ color: STYLE.eyes });
    for (const y of [-5, 5]) {
      const eye = new Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(5, y, 0);
      this.eyes.add(eye);
    }
    this.stage.root.add(this.eyes);
    this.food.add(this.foodCore, this.foodRing);
    this.stage.root.add(this.food, this.ripple);
    for (let i = 0; i < 28; i++) {
      const particle = new Mesh(
        new CircleGeometry(i % 3 === 0 ? 1.3 : 0.7, 8),
        new MeshBasicMaterial({ color: STYLE.plankton, transparent: true, opacity: 0.2, depthWrite: false }),
      );
      this.particles.push(particle);
      this.stage.root.add(particle);
    }
  }

  sync(state: SnakeState, ate = false): void {
    const tailColor = new Color(STYLE.tail);
    const bodyColor = new Color(STYLE.body);
    this.segments.count = state.snake.length;
    state.snake.forEach((cell, i) => {
      this.transform.position.set((cell.x + 0.5) * CELL_SIZE, (cell.y + 0.5) * CELL_SIZE, 2);
      this.transform.scale.setScalar(i === 0 ? 1 : 0.94);
      this.transform.updateMatrix();
      this.segments.setMatrixAt(i, this.transform.matrix);
      if (i === 0) this.color.set(STYLE.head);
      else this.color.copy(bodyColor).lerp(tailColor, i / state.snake.length);
      this.segments.setColorAt(i, this.color);
    });
    this.segments.instanceMatrix.needsUpdate = true;
    if (this.segments.instanceColor) this.segments.instanceColor.needsUpdate = true;
    const head = state.snake[0];
    this.eyes.position.set((head.x + 0.5) * CELL_SIZE, (head.y + 0.5) * CELL_SIZE, 3);
    this.eyes.rotation.z = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[state.direction];
    this.food.visible = state.food !== null;
    if (state.food) this.food.position.set((state.food.x + 0.5) * CELL_SIZE, (state.food.y + 0.5) * CELL_SIZE, 2);
    if (ate) {
      this.ripple.position.copy(this.eyes.position);
      this.ripple.position.z = 1;
      this.rippleAge = 0;
    }
    this.animate(0);
  }

  reset(state: SnakeState): void {
    this.time = 0;
    this.rippleAge = 1;
    this.sync(state);
  }

  animate(dt: number): void {
    this.time += dt;
    this.rippleAge += dt;
    this.foodCore.scale.setScalar(1 + Math.sin(this.time * 3) * 0.1);
    this.foodRing.scale.setScalar(1 + Math.sin(this.time * 2.5) * 0.12);
    this.ripple.visible = this.rippleAge < 0.5;
    this.ripple.scale.setScalar(1 + this.rippleAge * 6);
    this.ripple.material.opacity = Math.max(0, 1 - this.rippleAge * 2) * 0.55;
    this.particles.forEach((particle, i) => {
      particle.position.set(
        (i * 137.51 + Math.sin(this.time * 0.25 + i) * 7 + BOARD_SIZE) % BOARD_SIZE,
        (i * 83.17 - this.time * (1 + i % 3) + BOARD_SIZE * 100) % BOARD_SIZE,
        0.5,
      );
      particle.material.opacity = 0.12 + (Math.sin(this.time + i * 2) + 1) * 0.08;
    });
  }

  dispose(): void {
    this.segments.dispose();
    this.stage.dispose();
  }
}
