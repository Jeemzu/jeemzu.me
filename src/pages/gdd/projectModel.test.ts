import { describe, expect, it } from "vitest";
import {
  defaultDraft,
  newSection,
  newText,
  type EditorProject,
} from "./editor";
import {
  GDD_SUBJECTS,
  migrateEditorProject,
  newGddCanvasProject,
  newGddSubjectBlock,
  orderedGddBlocks,
  placeGddSubjectBlockOnTop,
  readGddCanvasProject,
  reorderGddBlocks,
  snapGddCanvasPoint,
  structureHasOverlap,
  type GddCanvasStructure,
  type GddSubjectBlock,
} from "./projectModel";
import {
  blockBounds,
  detachedBranchIds,
  groundedBlockIds,
  nearestAttachment,
  stepBlockGravity,
  translateBodies,
  type CanvasBody,
} from "./canvasPhysics";

function textItem(heading: string, body: string) {
  const item = newText(heading);
  if (item.type !== "text") throw new Error("Expected a text subsection.");
  return { ...item, body };
}

describe("GDD canvas project model", () => {
  it("starts with an empty platform and exposes the fixed subject catalog", () => {
    const project = newGddCanvasProject();
    expect(project.blocks).toEqual({ orderMode: "spatial", blocks: [] });
    expect(GDD_SUBJECTS.map((subject) => subject.label)).toContain(
      "Game Title and Description",
    );
    expect(GDD_SUBJECTS.map((subject) => subject.label)).toContain(
      "Prototype and Technical Requirements",
    );
  });

  describe("magnetic canvas structures", () => {
    const foundation = { left: 24, right: 1096, top: 600 };
    function body(id: string, x: number, y: number): CanvasBody {
      return { id, layout: { x, y, width: 100, height: 100, rotation: 0 } };
    }

    it("anchors side-connected overhangs but not separated or corner-touching blocks", () => {
      const blocks = [
        body("base", 300, 550),
        body("upper", 300, 450),
        body("overhang", 400, 450),
        body("corner", 500, 350),
        body("loose", 700, 150),
      ];
      expect([...groundedBlockIds(blocks, foundation)]).toEqual([
        "base",
        "upper",
        "overhang",
      ]);
      const result = stepBlockGravity(blocks, foundation, new Map(), 1 / 30);
      expect(result.blocks.slice(0, 3)).toEqual(blocks.slice(0, 3));
      expect(result.blocks[4].layout.y).toBeGreaterThan(150);
      expect(result.landedIds).toContain("corner");
    });

    it("detaches a branch without picking up blocks that have another foundation path", () => {
      const blocks = [
        body("base", 300, 550),
        body("joint", 300, 450),
        body("child", 300, 350),
        body("other-root", 400, 550),
        body("bridge", 400, 450),
      ];
      expect([...detachedBranchIds(blocks, "joint", foundation)]).toEqual([
        "joint",
        "child",
      ]);
    });

    it("finds exact rotated attachment edges without grid-rounding gaps", () => {
      const base = body("base", 300, 550);
      const moving = body("moving", 300, 435);
      moving.layout = {
        ...moving.layout,
        width: 120,
        height: 80,
        rotation: 90,
      };
      const attachment = nearestAttachment([moving], [base], foundation);
      expect(attachment).not.toBeNull();
      const placed = translateBodies([moving], attachment!.dx, attachment!.dy);
      expect(blockBounds(placed[0].layout).bottom).toBe(
        blockBounds(base.layout).top,
      );
      expect(structureHasOverlap([base, ...placed])).toBe(false);
      expect(attachment!.edge.y1).toBe(500);
    });

    it("allows side attachment and keeps an entire branch clear of obstacles", () => {
      const base = body("base", 300, 550);
      const upper = body("upper", 300, 450);
      const moving = [body("moving", 415, 450), body("child", 415, 350)];
      const attachment = nearestAttachment(moving, [base, upper], foundation);
      expect(attachment).not.toBeNull();
      expect(attachment!.edge.x1).toBe(350);
      expect(attachment!.edge.x2).toBe(350);
      const placed = translateBodies(moving, attachment!.dx, attachment!.dy);
      expect(structureHasOverlap([base, upper, ...placed])).toBe(false);
      expect(groundedBlockIds([base, upper, ...placed], foundation).size).toBe(
        4,
      );
    });

    it("sweeps falling groups onto supports without tunnelling or changing their shape", () => {
      const blocks = [
        body("base", 300, 550),
        body("loose", 300, 400),
        body("child", 300, 300),
      ];
      const velocities = new Map([
        ["loose", 1400],
        ["child", 1400],
      ]);
      const result = stepBlockGravity(blocks, foundation, velocities, 0.1);
      expect(result.blocks[1].layout.y).toBe(450);
      expect(result.blocks[2].layout.y).toBe(350);
      expect(result.landedIds).toEqual(["loose", "child"]);
      expect(structureHasOverlap(result.blocks)).toBe(false);
      expect(groundedBlockIds(result.blocks, foundation).size).toBe(3);
    });

    it("keeps fractional landings resizable and JSON-loadable despite floating-point drift", () => {
      const base = newGddSubjectBlock("game-direction");
      const upper = newGddSubjectBlock("core-gameplay", 1);
      base.layout = { ...base.layout, x: 300, y: 510, width: 280, height: 180 };
      upper.layout = {
        ...upper.layout,
        x: 300,
        y: 330.00000000000017,
        width: 280,
        height: 180,
      };
      const project = {
        ...newGddCanvasProject(),
        blocks: { orderMode: "spatial" as const, blocks: [base, upper] },
      };
      upper.layout.width += 48;
      upper.layout.x += 24;
      expect(groundedBlockIds(project.blocks.blocks, foundation).size).toBe(2);
      expect(structureHasOverlap(project.blocks.blocks)).toBe(false);
      expect(readGddCanvasProject(JSON.parse(JSON.stringify(project)))).toEqual(
        project,
      );
      upper.layout.y += 0.1;
      expect(structureHasOverlap(project.blocks.blocks)).toBe(true);
    });
  });

  it("maps existing sections into fixed subjects and retains source titles and content", () => {
    const draft = defaultDraft();
    draft.title = "My game";
    draft.introduction = "The cover description.";
    draft.prototype = undefined;
    draft.sections = [
      {
        ...newSection("Game direction"),
        items: [newText("Vision and player experience")],
      },
      {
        ...newSection("A custom section"),
        items: [textItem("Design notes", "Keep this text.")],
      },
      {
        ...newSection("Game direction"),
        items: [textItem("Custom notes", "More text.")],
      },
    ];
    const project: EditorProject = { draft, assets: {} };

    expect(() => migrateEditorProject(project)).toThrow(
      "Map these sections to a GDD subject",
    );
    const migrated = migrateEditorProject(project, {
      [draft.sections[1].id]: "game-direction",
    });
    const gameDirection = migrated.blocks.blocks.find(
      (block) => block.subjectId === "game-direction",
    );
    expect(migrated.blocks.blocks).toHaveLength(2);
    expect(
      gameDirection?.subsections.blocks.map((block) => block.heading),
    ).toEqual([
      "Vision and player experience",
      "A custom section",
      "Design notes",
      "Custom notes",
    ]);
    expect(gameDirection?.subsections.blocks[2].content).toBe(
      "Keep this text.",
    );
    expect(gameDirection?.subsections.blocks[3].content).toBe("More text.");
    expect(
      migrated.blocks.blocks.find(
        (block) => block.subjectId === "game-title-description",
      )?.fields,
    ).toEqual({ title: "My game", description: "The cover description." });
    expect(readGddCanvasProject(migrated)).toEqual(migrated);
  });

  it("renumbers blocks after manual reordering without changing their positions", () => {
    const structure: GddCanvasStructure<GddSubjectBlock> = {
      orderMode: "spatial",
      blocks: [
        newGddSubjectBlock("game-direction", 0),
        newGddSubjectBlock("core-gameplay", 1),
        newGddSubjectBlock("world-progression", 2),
      ],
    };
    const moved = reorderGddBlocks(structure, structure.blocks[2].id, 0);
    expect(moved.orderMode).toBe("manual");
    expect(orderedGddBlocks(moved).map((block) => block.subjectId)).toEqual([
      "world-progression",
      "game-direction",
      "core-gameplay",
    ]);
    expect(moved.blocks.map((block) => block.order)).toEqual([0, 1, 2]);
    expect(moved.blocks[0].layout).toEqual(structure.blocks[2].layout);
    expect(structure.blocks[2].order).toBe(2);
  });

  it("places the first subject block centered above the foundation", () => {
    const block = newGddSubjectBlock("game-direction", 0);
    const placement = placeGddSubjectBlockOnTop(block.layout, [], {
      x: 560,
      top: 700,
    });

    expect(placement).toEqual({
      layout: { ...block.layout, x: 560, y: 610 },
      supportId: null,
      shiftDown: 0,
    });
  });

  it("stacks new blocks over the top support and shifts a tall structure down", () => {
    const support = newGddSubjectBlock("game-direction", 0);
    support.layout = { ...support.layout, x: 500, y: 90, rotation: 90 };
    const block = newGddSubjectBlock("core-gameplay", 1);
    const placement = placeGddSubjectBlockOnTop(block.layout, [support], {
      x: 560,
      top: 700,
    });
    const shiftedSupport = {
      ...support,
      layout: { ...support.layout, y: support.layout.y + placement.shiftDown },
    };

    expect(placement.supportId).toBe(support.id);
    expect(placement.layout.x).toBe(support.layout.x);
    expect(placement.layout.width).toBe(180);
    expect(placement.layout.y + placement.layout.height / 2).toBe(
      shiftedSupport.layout.y - shiftedSupport.layout.width / 2,
    );
    expect(placement.shiftDown).toBeGreaterThan(0);
    expect(
      structureHasOverlap([
        shiftedSupport,
        { ...block, layout: placement.layout },
      ]),
    ).toBe(false);
  });

  it("validates the JSON-compatible model and rejects duplicate subjects and overlaps", () => {
    const duplicateSubject = {
      ...newGddCanvasProject(),
      blocks: {
        orderMode: "spatial",
        blocks: [
          newGddSubjectBlock("game-direction", 0),
          newGddSubjectBlock("game-direction", 1),
        ],
      },
    };
    expect(() => readGddCanvasProject(duplicateSubject)).toThrow(
      "invalid main subject block",
    );

    const first = newGddSubjectBlock("game-direction", 0);
    const second = newGddSubjectBlock("core-gameplay", 1);
    const overlapping = [
      first,
      {
        ...second,
        layout: { ...second.layout, x: 100 },
      },
    ];
    expect(structureHasOverlap(overlapping)).toBe(true);

    const project = newGddCanvasProject();
    expect(readGddCanvasProject(project)).toEqual(project);
  });

  it("snaps workspace coordinates to the canvas grid", () => {
    expect(snapGddCanvasPoint(35, 57)).toEqual({ x: 24, y: 48 });
  });
});
