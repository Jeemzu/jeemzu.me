import { describe, expect, it } from "vitest";
import { exportCourseFile, CourseExportError } from "./export";
import { parseCourse, validateCourse } from "./validate";
import type { CourseFile, HoleDefinition } from "./types";

const hole = (offsetX: number): HoleDefinition => ({
  par: 2,
  strokeLimit: 12,
  tee: { x: offsetX, z: 1.5 },
  cup: { x: offsetX, z: 12 },
  boundary: [{ x: offsetX - 2, z: 0 }, { x: offsetX + 2, z: 0 }, { x: offsetX + 2, z: 14 }, { x: offsetX - 2, z: 14 }],
  obstacles: [{ type: "box", center: { x: offsetX, z: 7 }, width: 2, depth: 0.5, rotationDeg: 30 }],
});

const course = (): CourseFile => ({
  format: "better-putt-party-course",
  version: 1,
  id: "test-course",
  name: "Test Course",
  author: "Tester",
  holes: [0, 10, 20, 30, 40, 50].map(hole),
});

describe("course validation", () => {
  it("accepts a well-formed course", () => {
    expect(validateCourse(course()).errors).toEqual([]);
  });

  it("rejects the wrong hole count and unknown properties", () => {
    const c = course() as unknown as { holes: unknown[]; extra: number };
    c.holes.pop();
    c.extra = 1;
    const { errors } = validateCourse(c);
    expect(errors).toContain("$.extra: unknown property");
    expect(errors.some((e) => e.startsWith("holes:"))).toBe(true);
  });

  it("rejects bad markers, stroke limits and crossing boundaries", () => {
    const c = course();
    c.holes[0].cup = { x: 50, z: 50 };
    c.holes[1].strokeLimit = 13;
    c.holes[2].boundary = [{ x: 18, z: 0 }, { x: 22, z: 14 }, { x: 22, z: 0 }, { x: 18, z: 14 }];
    c.holes[3].tee = { x: 30, z: 7 };
    const { errors } = validateCourse(c);
    expect(errors.some((e) => e.startsWith("holes[0].cup"))).toBe(true);
    expect(errors.some((e) => e.startsWith("holes[1].strokeLimit"))).toBe(true);
    expect(errors.some((e) => e.startsWith("holes[2].boundary"))).toBe(true);
    expect(errors).toContain("holes[3].tee: overlaps an obstacle");
  });

  it("rejects overlapping holes and mismatched obstacle fields", () => {
    const c = course();
    c.holes[1] = hole(1);
    (c.holes[2].obstacles as unknown[]) = [{ type: "cylinder", center: { x: 20, z: 7 }, radius: 0.5, width: 1 }];
    const { errors } = validateCourse(c);
    expect(errors).toContain("holes[1].boundary: bounding box overlaps holes[0]");
    expect(errors.some((e) => e.startsWith("holes[2].obstacles[0]:"))).toBe(true);
  });

  it("reports invalid JSON", () => {
    expect(parseCourse("{").errors[0]).toMatch(/^\$: invalid JSON/);
  });
});

describe("course export", () => {
  it("round-trips through the hand-off format", () => {
    const text = exportCourseFile(course());
    expect(parseCourse(text).course).toEqual(course());
  });

  it("refuses to export invalid courses", () => {
    const c = course();
    c.id = "Bad Id";
    expect(() => exportCourseFile(c)).toThrow(CourseExportError);
  });
});
