# Better Putt Party course files

Courses are plain JSON files. The same format is used by the built-in courses, by `exportCourseFile`/`downloadCourseFile` in `src/games/puttparty/course/export.ts` (for the future course editor), and by the server.

## Adding a handed-off course

1. Get the course `.json` file from its author.
2. Optional: check it in the browser by calling `parseCourse(text)` from `src/games/puttparty/course/validate.ts`. It returns the same error paths as the server.
3. Put the file in `games-api/src/GamesRealtime/Putt/Courses/`, giving it a unique `id`.
4. Run `dotnet test tests/GamesRealtime.Tests --filter "FullyQualifiedName~PuttCourseTests"` in `games-api`.
   - The service refuses to start if any course file is invalid. Its error message names the file and the field paths that failed.
   - If the course should be part of the physics parity check, regenerate the fixture (see [putt-party-network.md](putt-party-network.md)).
5. Deploy `games-realtime`. The course then appears in the room's course selector.

## Format (version 1)

```json
{
  "format": "better-putt-party-course",
  "version": 1,
  "id": "meadow-loop",
  "name": "Meadow Loop",
  "author": "Jeemzu",
  "holes": [
    {
      "par": 2,
      "strokeLimit": 12,
      "tee": { "x": 0, "z": 1.5 },
      "cup": { "x": 0, "z": 12 },
      "boundary": [{ "x": -2, "z": 0 }, { "x": 2, "z": 0 }, { "x": 2, "z": 14 }, { "x": -2, "z": 14 }],
      "obstacles": [
        { "type": "box", "center": { "x": 0, "z": 6 }, "width": 1.5, "depth": 0.4, "rotationDeg": 30, "height": 0.6 },
        { "type": "cylinder", "center": { "x": 1, "z": 9 }, "radius": 0.5, "height": 0.8 }
      ]
    }
  ]
}
```

Units are world units, and the ball radius is 0.2. The y axis is up, so every position is an `{x, z}` point on the ground plane.

## Rules

The validators live in `CourseValidator.cs` and `validate.ts`, and must be kept in sync.

**Course**
- Unknown fields are rejected.
- `id`: 3–48 characters of lowercase letters, digits, and single hyphens.
- `name` and `author`: 1–48 printable characters.
- `holes`: exactly 6.
- The bounding boxes of different holes must not overlap.

**Holes**
- `strokeLimit`: 1–12. `par`: from 1 up to `strokeLimit`.
- `boundary`: a simple polygon with 3–64 points.
  - Edges must not cross or touch, and points must not repeat.
  - The area must be at least 1.
  - Every coordinate must be within ±1000.
  - Walls are built automatically along the boundary.
- `tee` and `cup`:
  - must be inside the boundary, at a distance from the walls of at least their own radius (ball 0.2, cup 0.32)
  - must not overlap an obstacle
  - must be at least 1 unit apart
- `obstacles`: at most 48.

**Obstacles**
- The `center` must be inside the boundary.
- `height`: 0.1–5. It is optional and only affects visuals.
- `box`:
  - `width` and `depth`: 0.1–100 each.
  - `rotationDeg` is optional and rotates the box from +x toward +z.
  - `radius` is not allowed.
- `cylinder`:
  - `radius`: 0.1–50.
  - `width`, `depth` and `rotationDeg` are not allowed.
