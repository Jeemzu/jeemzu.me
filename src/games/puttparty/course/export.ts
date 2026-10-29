import { validateCourse } from "./validate";
import type { CourseFile } from "./types";

export class CourseExportError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`Course is invalid:\n${errors.join("\n")}`);
    this.errors = errors;
  }
}

/**
 * Serializes a course into the hand-off file format. Validation runs first and only known
 * properties are written, so the output can be dropped into `games-api/src/GamesRealtime/Putt/Courses/`.
 */
export function exportCourseFile(course: CourseFile): string {
  const { course: clean, errors } = validateCourse(JSON.parse(JSON.stringify(course)));
  if (!clean) throw new CourseExportError(errors);
  return `${JSON.stringify(clean, null, 2)}\n`;
}

export const courseFileName = (course: Pick<CourseFile, "id">) => `${course.id}.json`;

export function downloadCourseFile(course: CourseFile): void {
  const url = URL.createObjectURL(new Blob([exportCourseFile(course)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = courseFileName(course);
  link.click();
  URL.revokeObjectURL(url);
}
