import { Color, Group, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from "three";
import { Stage, disposeTree } from "../../game-player/render/Stage";
import { disc, lines, rectangle } from "../../game-player/render/primitives";
import { BALL_RADIUS, BRICK_HEIGHT, BRICK_WIDTH, HEIGHT, PADDLE_HEIGHT, PADDLE_Y, WIDTH } from "./config";
import { powerIcon } from "./powerIcons";
import { STYLE } from "./style";
import type { BrickState, Drop } from "./types";

export class BrickRenderer {
  readonly stage: Stage;
  private readonly rims = new InstancedMesh(new PlaneGeometry(BRICK_WIDTH, BRICK_HEIGHT), new MeshBasicMaterial(), 200);
  private readonly cores = new InstancedMesh(new PlaneGeometry(BRICK_WIDTH - 3, BRICK_HEIGHT - 3), new MeshBasicMaterial(), 200);
  private readonly paddle = rectangle(1, PADDLE_HEIGHT, STYLE.paddle);
  private readonly balls = Array.from({ length: 6 }, () => disc(BALL_RADIUS, STYLE.ball));
  private readonly drops = new Map<Drop, Group>();
  private readonly aim = new Group();
  private readonly shards = new InstancedMesh(new PlaneGeometry(3, 6), new MeshBasicMaterial({ transparent: true, opacity: 0.8 }), 160);
  private particles: { x: number; y: number; vx: number; vy: number; age: number; color: number }[] = [];
  private readonly transform = new Object3D();
  private readonly color = new Color();

  constructor(host: HTMLElement) {
    this.stage = new Stage(host, { logicalSize: { width: WIDTH, height: HEIGHT }, background: STYLE.background, bloom: STYLE.bloom });
    this.stage.canvas.setAttribute("aria-label", "Brick Break board");
    const grid: number[] = [];
    for (let x = -WIDTH; x <= WIDTH * 2; x += 100) grid.push(WIDTH / 2 + (x - WIDTH / 2) * 0.1, 430, -3, x, HEIGHT, -3);
    for (const y of [430, 445, 468, 505, 560, 640, 719]) grid.push(0, y, -3, WIDTH, y, -3);
    this.stage.root.add(lines(grid, STYLE.horizon, 0.45), this.rims, this.cores, this.paddle, ...this.balls, this.aim, this.shards);
    this.aim.add(lines([0, 0, 0, 0, -60, 0, 0, -60, 0, -7, -49, 0, 0, -60, 0, 7, -49, 0], STYLE.paddle));
    for (const mesh of [this.rims, this.cores, this.shards]) { mesh.count = 0; mesh.frustumCulled = false; }
  }
  sync(state: BrickState): void {
    let count = 0;
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const brightness = brick.type.breakable ? 0.6 + 0.4 * brick.hp / brick.type.hits : 1;
      this.color.set(STYLE.bricks[brick.key]).multiplyScalar(brightness);
      this.transform.position.set(brick.x, brick.y, 1);
      this.transform.scale.setScalar(1);
      this.transform.rotation.z = 0;
      this.transform.updateMatrix();
      this.rims.setMatrixAt(count, this.transform.matrix);
      this.rims.setColorAt(count, this.color);
      this.color.multiplyScalar(0.28);
      this.transform.position.z = 2;
      this.transform.updateMatrix();
      this.cores.setMatrixAt(count, this.transform.matrix);
      this.cores.setColorAt(count++, this.color);
    }
    for (const mesh of [this.rims, this.cores]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.paddle.position.set(state.paddleX, PADDLE_Y, 3);
    this.paddle.scale.x = state.paddleWidth;
    this.balls.forEach((mesh, index) => {
      const ball = state.balls[index];
      mesh.visible = !!ball;
      if (ball) mesh.position.set(ball.x, ball.y, 4);
    });
    const activeDrops = new Set(state.drops);
    for (const [drop, group] of this.drops) {
      if (activeDrops.has(drop)) continue;
      this.stage.root.remove(group);
      disposeTree(group);
      this.drops.delete(drop);
    }
    for (const drop of state.drops) {
      let group = this.drops.get(drop);
      if (!group) { group = powerIcon(drop.kind); this.drops.set(drop, group); this.stage.root.add(group); }
      group.position.set(drop.x, drop.y, 5);
    }
    this.aim.visible = state.balls.some(ball => ball.stuck);
    this.aim.position.set(state.paddleX, PADDLE_Y - 35, 4);
    this.aim.rotation.z = state.aimAngle;
  }
  shatter(x: number, y: number, key: string): void {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      this.particles.push({ x, y, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100, age: 0, color: STYLE.bricks[key] });
    }
    this.particles = this.particles.slice(-160);
  }
  animate(dt: number): void {
    this.particles = this.particles.filter(p => (p.age += dt) < 0.5);
    this.shards.count = this.particles.length;
    this.particles.forEach((particle, i) => {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 120 * dt;
      this.transform.position.set(particle.x, particle.y, 5);
      this.transform.scale.setScalar(1 - particle.age * 2);
      this.transform.rotation.z = particle.age * 4;
      this.transform.updateMatrix();
      this.shards.setMatrixAt(i, this.transform.matrix);
      this.shards.setColorAt(i, this.color.set(particle.color));
    });
    this.shards.instanceMatrix.needsUpdate = true;
    if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true;
  }
  reset(): void { this.particles = []; this.shards.count = 0; }
  dispose(): void {
    this.rims.dispose(); this.cores.dispose(); this.shards.dispose();
    this.stage.dispose();
    this.drops.clear();
  }
}
