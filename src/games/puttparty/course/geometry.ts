import type { Vec2 } from "./types";

const cross = (a: Vec2, b: Vec2, c: Vec2) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 <= 0) return a;
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { x: a.x + t * dx, z: a.z + t * dz };
}

export function distanceToEdges(p: Vec2, polygon: Vec2[]): number {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) min = Math.min(min, distance(p, closestOnSegment(p, polygon[i], polygon[(i + 1) % polygon.length])));
  return min;
}

export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function signedArea(polygon: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    area += a.x * b.z - b.x * a.z;
  }
  return area / 2;
}

const EPS = 1e-9;
const onSegment = (a: Vec2, b: Vec2, p: Vec2) =>
  p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.z >= Math.min(a.z, b.z) - EPS && p.z <= Math.max(a.z, b.z) + EPS;

export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (Math.abs(d1) < EPS && onSegment(c, d, a)) || (Math.abs(d2) < EPS && onSegment(c, d, b))
    || (Math.abs(d3) < EPS && onSegment(a, b, c)) || (Math.abs(d4) < EPS && onSegment(a, b, d));
}

/** True when no two non-adjacent edges touch and no edge has zero length. */
export function isSimplePolygon(polygon: Vec2[]): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    if (distance(polygon[i], polygon[(i + 1) % n]) < 1e-6) return false;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(polygon[i], polygon[(i + 1) % n], polygon[j], polygon[(j + 1) % n])) return false;
    }
  }
  return true;
}

/** Corners of a box obstacle, counter-clockwise; matches the server's rotation convention. */
export function boxCorners(center: Vec2, width: number, depth: number, rotationDeg = 0): Vec2[] {
  const r = (rotationDeg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const hw = width / 2, hd = depth / 2;
  const corner = (x: number, z: number) => ({ x: center.x + x * c - z * s, z: center.z + x * s + z * c });
  return [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd)];
}

export function bounds(points: Vec2[]) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  return { minX, minZ, maxX, maxZ };
}
