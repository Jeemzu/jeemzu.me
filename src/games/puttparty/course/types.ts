/**
 * Course file format shared with the server (`games-api/src/GamesRealtime/Putt/CourseModels.cs`).
 * Coordinates are world units on the ground plane: x to the right, z away from the tee camera.
 */
export const COURSE_FORMAT = "better-putt-party-course";
export const COURSE_VERSION = 1;

export interface Vec2 {
  x: number;
  z: number;
}

export interface BoxObstacle {
  type: "box";
  center: Vec2;
  width: number;
  depth: number;
  /** Counter-clockwise in the x/z plane. */
  rotationDeg?: number;
  height?: number;
}

export interface CylinderObstacle {
  type: "cylinder";
  center: Vec2;
  radius: number;
  height?: number;
}

export type Obstacle = BoxObstacle | CylinderObstacle;

export interface HoleDefinition {
  par: number;
  strokeLimit: number;
  tee: Vec2;
  cup: Vec2;
  /** Simple polygon; walls run along every edge. */
  boundary: Vec2[];
  obstacles: Obstacle[];
}

export interface CourseFile {
  format: typeof COURSE_FORMAT;
  version: typeof COURSE_VERSION;
  id: string;
  name: string;
  author: string;
  holes: HoleDefinition[];
}

export const RULES = {
  holeCount: 6,
  maxStrokeLimit: 12,
  ballRadius: 0.2,
  cupRadius: 0.32,
  coordinateLimit: 1000,
  maxBoundaryPoints: 64,
  maxObstacles: 48,
  defaultBoxHeight: 0.6,
  defaultCylinderHeight: 0.8,
} as const;
