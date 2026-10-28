import {
  BoxGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Path,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Shape,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { bounds, signedArea } from "../course/geometry";
import { RULES, type CourseFile, type HoleDefinition, type Vec2 } from "../course/types";
import type { LoadedModels } from "./models";
import { rng, type PuttMaterials } from "./materials";

const GREEN_DEPTH = 0.3;
const WALL_HEIGHT = 0.28;
const WALL_THICKNESS = 0.16;
const CUP_DEPTH = 0.35;
export const FLAG_HEIGHT = 1.5;

export interface HoleView {
  def: HoleDefinition;
  bounds: ReturnType<typeof bounds>;
  center: Vector3;
  flag: Object3D;
}

/**
 * Builds the visible course purely from course-file data. Gameplay collision lives on the server;
 * these meshes only mirror it. Owns its geometries; materials are shared and owned by `PuttMaterials`.
 */
export class CourseView {
  readonly root = new Group();
  readonly holes: HoleView[] = [];
  readonly id: string;
  private readonly geometries: BufferGeometry[] = [];
  private time = 0;

  constructor(course: CourseFile, mats: PuttMaterials, models: LoadedModels) {
    this.id = course.id;
    course.holes.forEach((hole) => this.holes.push(this.buildHole(hole, mats, models)));
    this.buildSurroundings(course, mats, models);
  }

  private geo<T extends BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private mesh(geo: BufferGeometry, mat: Material, parent: Object3D, cast = true): Mesh {
    const m = new Mesh(this.geo(geo), mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private buildHole(def: HoleDefinition, mats: PuttMaterials, models: LoadedModels): HoleView {
    const group = new Group();
    this.root.add(group);
    const ccw = signedArea(def.boundary) > 0;

    // Green: the boundary extruded downward, with a real hole cut where the cup is.
    const shape = new Shape(def.boundary.map((p) => new Vector2(p.x, p.z)));
    const cupPath = new Path();
    cupPath.absarc(def.cup.x, def.cup.z, RULES.cupRadius, 0, Math.PI * 2, true);
    shape.holes.push(cupPath);
    const greenGeo = new ExtrudeGeometry(shape, { depth: GREEN_DEPTH, bevelEnabled: false, curveSegments: 24 });
    greenGeo.rotateX(Math.PI / 2);
    const green = new Mesh(this.geo(greenGeo), [mats.green, mats.greenSide]);
    green.receiveShadow = true;
    group.add(green);

    const cup = this.mesh(new CylinderGeometry(RULES.cupRadius, RULES.cupRadius, CUP_DEPTH, 24, 1, true), mats.cup, group, false);
    cup.position.set(def.cup.x, -CUP_DEPTH / 2, def.cup.z);
    const cupBottom = this.mesh(new CylinderGeometry(RULES.cupRadius, RULES.cupRadius, 0.02, 24), mats.cup, group, false);
    cupBottom.position.set(def.cup.x, -CUP_DEPTH, def.cup.z);
    const rim = this.mesh(new RingGeometry(RULES.cupRadius, RULES.cupRadius + 0.035, 32), mats.cupRim, group, false);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(def.cup.x, 0.004, def.cup.z);

    const tee = this.mesh(new BoxGeometry(0.9, 0.02, 0.9), mats.tee, group, false);
    tee.position.set(def.tee.x, 0.01, def.tee.z);

    // Walls sit outside each edge so the playable area matches the server polygon exactly.
    const n = def.boundary.length;
    for (let i = 0; i < n; i++) {
      const a = def.boundary[i], b = def.boundary[(i + 1) % n];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
      const out = ccw ? { x: dz / len, z: -dx / len } : { x: -dz / len, z: dx / len };
      const wall = this.mesh(new BoxGeometry(len, WALL_HEIGHT, WALL_THICKNESS), mats.wall, group);
      wall.position.set((a.x + b.x) / 2 + (out.x * WALL_THICKNESS) / 2, WALL_HEIGHT / 2, (a.z + b.z) / 2 + (out.z * WALL_THICKNESS) / 2);
      wall.rotation.y = Math.atan2(-dz, dx);
      const cap = this.mesh(new BoxGeometry(len, 0.03, WALL_THICKNESS + 0.02), mats.wallCap, wall, false);
      cap.position.y = WALL_HEIGHT / 2 + 0.015;
      const post = this.mesh(new CylinderGeometry(WALL_THICKNESS * 0.75, WALL_THICKNESS * 0.75, WALL_HEIGHT + 0.08, 12), mats.post, group);
      post.position.set(a.x, (WALL_HEIGHT + 0.08) / 2, a.z);
    }

    for (const o of def.obstacles) {
      if (o.type === "box") {
        const h = o.height ?? RULES.defaultBoxHeight;
        const box = this.mesh(new BoxGeometry(o.width, h, o.depth), mats.block, group);
        box.position.set(o.center.x, h / 2, o.center.z);
        box.rotation.y = -((o.rotationDeg ?? 0) * Math.PI) / 180;
      } else {
        const h = o.height ?? RULES.defaultCylinderHeight;
        const cyl = this.mesh(new CylinderGeometry(o.radius, o.radius, h, 28), mats.bumper, group);
        cyl.position.set(o.center.x, h / 2, o.center.z);
        const band = this.mesh(new CylinderGeometry(o.radius * 1.02, o.radius * 1.02, h * 0.18, 28), mats.wallCap, cyl, false);
        band.position.y = h * 0.2;
      }
    }

    const flag = models.flag ? models.flag.clone() : this.proceduralFlag(mats);
    flag.position.set(def.cup.x, 0, def.cup.z);
    group.add(flag);

    const bb = bounds(def.boundary);
    return { def, bounds: bb, center: new Vector3((bb.minX + bb.maxX) / 2, 0, (bb.minZ + bb.maxZ) / 2), flag };
  }

  private proceduralFlag(mats: PuttMaterials): Object3D {
    const flag = new Group();
    const pole = this.mesh(new CylinderGeometry(0.025, 0.025, FLAG_HEIGHT, 8), mats.pole, flag);
    pole.position.y = FLAG_HEIGHT / 2 - CUP_DEPTH * 0.5;
    const cloth = new PlaneGeometry(0.55, 0.34, 6, 1);
    cloth.translate(0.275, 0, 0);
    const banner = this.mesh(cloth, mats.flag, flag);
    banner.position.y = FLAG_HEIGHT - CUP_DEPTH * 0.5 - 0.2;
    banner.name = "banner";
    return flag;
  }

  /** Rough ground plus deterministic trees and rocks that stay clear of every hole. */
  private buildSurroundings(course: CourseFile, mats: PuttMaterials, models: LoadedModels) {
    const all = bounds(course.holes.flatMap((h) => h.boundary));
    const margin = 14;
    const w = all.maxX - all.minX + margin * 2, d = all.maxZ - all.minZ + margin * 2;
    const ground = this.mesh(new PlaneGeometry(w, d), mats.rough, this.root, false);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((all.minX + all.maxX) / 2, -GREEN_DEPTH + 0.02, (all.minZ + all.maxZ) / 2);
    const uv = ground.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);

    const random = rng(course.id);
    const clear = (p: Vec2, pad: number) =>
      course.holes.every((h) => {
        const b = bounds(h.boundary);
        return p.x < b.minX - pad || p.x > b.maxX + pad || p.z < b.minZ - pad || p.z > b.maxZ + pad;
      });
    const spots = (count: number, pad: number) => {
      const out: { p: Vec2; s: number; r: number }[] = [];
      for (let tries = 0; out.length < count && tries < count * 30; tries++) {
        const p = { x: all.minX - margin + 1 + random() * (w - 2), z: all.minZ - margin + 1 + random() * (d - 2) };
        if (clear(p, pad) && out.every((o) => Math.hypot(o.p.x - p.x, o.p.z - p.z) > 1.6)) out.push({ p, s: 0.75 + random() * 0.6, r: random() * Math.PI * 2 });
      }
      return out;
    };

    const trees = spots(Math.round((w * d) / 40), 2.2);
    const rocks = spots(Math.round((w * d) / 120), 1.2);
    const y = -GREEN_DEPTH + 0.02;
    if (models.tree) this.placeClones(models.tree, trees, y);
    else this.instanced(trees, y, [
      { geo: new CylinderGeometry(0.12, 0.18, 1, 6).translate(0, 0.5, 0), mat: mats.trunk },
      { geo: new IcosahedronGeometry(0.85, 0).translate(0, 1.55, 0), mat: mats.leaves },
      { geo: new IcosahedronGeometry(0.6, 0).translate(0.25, 2.15, 0.1), mat: mats.leaves },
    ]);
    if (models.rock) this.placeClones(models.rock, rocks, y);
    else this.instanced(rocks, y, [{ geo: new DodecahedronGeometry(0.4, 0).scale(1, 0.6, 0.8).translate(0, 0.12, 0), mat: mats.rock }]);
  }

  private placeClones(model: Object3D, spots: { p: Vec2; s: number; r: number }[], y: number) {
    for (const { p, s, r } of spots) {
      const c = model.clone();
      c.position.set(p.x, y, p.z);
      c.scale.multiplyScalar(s);
      c.rotation.y = r;
      this.root.add(c);
    }
  }

  private instanced(spots: { p: Vec2; s: number; r: number }[], y: number, parts: { geo: BufferGeometry; mat: Material }[]) {
    const m = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0);
    for (const part of parts) {
      const inst = new InstancedMesh(this.geo(part.geo), part.mat, spots.length);
      spots.forEach(({ p, s, r }, i) => inst.setMatrixAt(i, m.compose(new Vector3(p.x, y, p.z), q.setFromAxisAngle(up, r), new Vector3(s, s, s))));
      inst.castShadow = true;
      inst.receiveShadow = true;
      this.root.add(inst);
    }
  }

  /** Flag sway; lifts the pin when any ball comes close so it never hides the cup. */
  update(dt: number, holeIndex: number, nearestBall: number): void {
    this.time += dt;
    const hole = this.holes[holeIndex];
    if (!hole) return;
    const lift = nearestBall < 1.2 ? 0.6 : 0;
    hole.flag.position.y += (lift - hole.flag.position.y) * Math.min(1, dt * 6);
    const banner = hole.flag.getObjectByName("banner");
    if (banner) banner.rotation.y = Math.sin(this.time * 1.7) * 0.25;
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.root.removeFromParent();
  }
}
