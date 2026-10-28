import { boxCorners, bounds, distance, distanceToEdges, isSimplePolygon, pointInPolygon, signedArea } from "./geometry";
import { COURSE_FORMAT, COURSE_VERSION, RULES, type CourseFile, type HoleDefinition, type Obstacle, type Vec2 } from "./types";

/**
 * Mirrors the server's `CourseValidator` so an editor can reject a file before it is handed off.
 * Errors use the same JSON-path-like prefixes. The server remains the authority.
 */
export interface ParseResult {
  course: CourseFile | null;
  errors: string[];
}

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEYS = {
  course: ["format", "version", "id", "name", "author", "holes"],
  hole: ["par", "strokeLimit", "tee", "cup", "boundary", "obstacles"],
  obstacle: ["type", "center", "width", "depth", "rotationDeg", "radius", "height"],
  vec: ["x", "z"],
};

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);

/** Rejects unknown properties like the server's `UnmappedMemberHandling.Disallow`. */
function unknownKeys(errors: string[], path: string, value: Json, allowed: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown property`);
}

function vec(errors: string[], path: string, value: unknown): Vec2 | null {
  if (value === undefined || value === null) return null;
  if (!isObject(value) || !isNum(value.x) || !isNum(value.z)) {
    errors.push(`${path}: must be {x, z} numbers`);
    return null;
  }
  unknownKeys(errors, path, value, KEYS.vec);
  return { x: value.x, z: value.z };
}

const finite = (p: Vec2) => Math.abs(p.x) <= RULES.coordinateLimit && Math.abs(p.z) <= RULES.coordinateLimit;

export function parseCourse(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    return { course: null, errors: [`$: invalid JSON (${(err as Error).message})`] };
  }
  return validateCourse(raw);
}

export function validateCourse(raw: unknown): ParseResult {
  const errors: string[] = [];
  if (!isObject(raw)) return { course: null, errors: ["$: must be an object"] };
  unknownKeys(errors, "$", raw, KEYS.course);

  if (raw.format !== COURSE_FORMAT) errors.push(`format: must be "${COURSE_FORMAT}"`);
  if (raw.version !== COURSE_VERSION) errors.push(`version: must be ${COURSE_VERSION}`);
  if (typeof raw.id !== "string" || raw.id.length < 3 || raw.id.length > 48 || !ID_PATTERN.test(raw.id))
    errors.push("id: 3-48 lowercase letters, digits and single hyphens");
  for (const key of ["name", "author"] as const) {
    const v = raw[key];
    // eslint-disable-next-line no-control-regex
    if (typeof v !== "string" || !v.trim() || v.trim().length > 48 || /[\u0000-\u001f\u007f-\u009f]/.test(v))
      errors.push(`${key}: 1-48 printable characters`);
  }

  if (!Array.isArray(raw.holes) || raw.holes.length !== RULES.holeCount) {
    errors.push(`holes: exactly ${RULES.holeCount} holes are required`);
    return { course: null, errors };
  }

  const holes: HoleDefinition[] = [];
  const holeBounds: (ReturnType<typeof bounds> | null)[] = [];
  raw.holes.forEach((h, i) => {
    const result = validateHole(errors, `holes[${i}]`, h);
    holeBounds.push(result?.bounds ?? null);
    if (result?.hole) holes.push(result.hole);
  });

  for (let i = 0; i < holeBounds.length; i++)
    for (let j = i + 1; j < holeBounds.length; j++) {
      const a = holeBounds[i], b = holeBounds[j];
      if (a && b && a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ)
        errors.push(`holes[${j}].boundary: bounding box overlaps holes[${i}]`);
    }

  if (errors.length) return { course: null, errors };
  return {
    course: { format: COURSE_FORMAT, version: COURSE_VERSION, id: raw.id as string, name: raw.name as string, author: raw.author as string, holes },
    errors,
  };
}

type Solid = { box: Vec2[] | null; center: Vec2; radius: number };

function validateHole(errors: string[], path: string, h: unknown): { hole: HoleDefinition | null; bounds: ReturnType<typeof bounds> } | null {
  if (!isObject(h)) {
    errors.push(`${path}: missing`);
    return null;
  }
  unknownKeys(errors, path, h, KEYS.hole);
  const strokeLimit = isInt(h.strokeLimit) ? h.strokeLimit : 0;
  const par = isInt(h.par) ? h.par : 0;
  if (strokeLimit < 1 || strokeLimit > RULES.maxStrokeLimit) errors.push(`${path}.strokeLimit: 1-${RULES.maxStrokeLimit}`);
  if (par < 1 || par > Math.max(1, strokeLimit)) errors.push(`${path}.par: 1 to strokeLimit`);

  if (!Array.isArray(h.boundary) || h.boundary.length < 3 || h.boundary.length > RULES.maxBoundaryPoints) {
    errors.push(`${path}.boundary: 3-${RULES.maxBoundaryPoints} points`);
    return null;
  }
  const boundary = h.boundary.map((p, i) => vec(errors, `${path}.boundary[${i}]`, p));
  if (boundary.some((p) => !p || !finite(p))) {
    errors.push(`${path}.boundary: coordinates must be within ±${RULES.coordinateLimit}`);
    return null;
  }
  const poly = boundary as Vec2[];
  if (!isSimplePolygon(poly)) {
    errors.push(`${path}.boundary: edges must not cross, touch or repeat points`);
    return null;
  }
  if (Math.abs(signedArea(poly)) < 1) errors.push(`${path}.boundary: area must be at least 1`);

  const rawObstacles = h.obstacles ?? [];
  if (!Array.isArray(rawObstacles)) {
    errors.push(`${path}.obstacles: must be an array`);
    return null;
  }
  if (rawObstacles.length > RULES.maxObstacles) errors.push(`${path}.obstacles: at most ${RULES.maxObstacles}`);
  const obstacles: Obstacle[] = [];
  const solids: Solid[] = [];
  rawObstacles.forEach((o, i) => {
    const result = validateObstacle(errors, `${path}.obstacles[${i}]`, o, poly);
    if (result) {
      obstacles.push(result.obstacle);
      solids.push(result.solid);
    }
  });

  const tee = marker(errors, `${path}.tee`, h.tee, RULES.ballRadius, poly, solids);
  const cup = marker(errors, `${path}.cup`, h.cup, RULES.cupRadius, poly, solids);
  if (tee && cup && distance(tee, cup) < 1) errors.push(`${path}.cup: must be at least 1 unit from the tee`);
  const hole = tee && cup ? { par, strokeLimit, tee, cup, boundary: poly, obstacles } : null;
  return { hole, bounds: bounds(poly) };
}

function validateObstacle(errors: string[], path: string, o: unknown, boundary: Vec2[]): { obstacle: Obstacle; solid: Solid } | null {
  if (!isObject(o)) {
    errors.push(`${path}.center: required`);
    return null;
  }
  unknownKeys(errors, path, o, KEYS.obstacle);
  const center = vec(errors, `${path}.center`, o.center);
  if (!center || !finite(center)) {
    errors.push(`${path}.center: required`);
    return null;
  }
  if (!pointInPolygon(center, boundary)) errors.push(`${path}.center: must be inside the boundary`);
  const height = o.height;
  if (height !== undefined && (!isNum(height) || height < 0.1 || height > 5)) errors.push(`${path}.height: 0.1-5`);
  const h = isNum(height) ? { height } : {};

  if (o.type === "box") {
    if (o.radius !== undefined) errors.push(`${path}.radius: not used by boxes`);
    const { width, depth, rotationDeg } = o;
    if (!isNum(width) || width < 0.1 || width > 100) errors.push(`${path}.width: 0.1-100`);
    else if (!isNum(depth) || depth < 0.1 || depth > 100) errors.push(`${path}.depth: 0.1-100`);
    else if (rotationDeg !== undefined && !isNum(rotationDeg)) errors.push(`${path}.rotationDeg: must be a number`);
    else {
      const rot = rotationDeg === undefined ? {} : { rotationDeg: rotationDeg as number };
      return {
        obstacle: { type: "box", center, width, depth, ...rot, ...h },
        solid: { box: boxCorners(center, width, depth, (rotationDeg as number | undefined) ?? 0), center, radius: 0 },
      };
    }
    return null;
  }
  if (o.type === "cylinder") {
    if (o.width !== undefined || o.depth !== undefined || o.rotationDeg !== undefined)
      errors.push(`${path}: width, depth and rotationDeg are not used by cylinders`);
    const { radius } = o;
    if (!isNum(radius) || radius < 0.1 || radius > 50) {
      errors.push(`${path}.radius: 0.1-50`);
      return null;
    }
    return { obstacle: { type: "cylinder", center, radius, ...h }, solid: { box: null, center, radius } };
  }
  errors.push(`${path}.type: must be "box" or "cylinder"`);
  return null;
}

function marker(errors: string[], path: string, raw: unknown, clearance: number, boundary: Vec2[], solids: Solid[]): Vec2 | null {
  const p = vec(errors, path, raw);
  if (!p || !finite(p)) {
    errors.push(`${path}: required`);
    return null;
  }
  if (!pointInPolygon(p, boundary) || distanceToEdges(p, boundary) < clearance) {
    errors.push(`${path}: must be inside the boundary, at least ${clearance} from walls`);
    return null;
  }
  for (const s of solids) {
    const blocked = s.box ? pointInPolygon(p, s.box) || distanceToEdges(p, s.box) < clearance : distance(p, s.center) < s.radius + clearance;
    if (blocked) {
      errors.push(`${path}: overlaps an obstacle`);
      return null;
    }
  }
  return p;
}
