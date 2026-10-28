import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createTemplate, importArchive } from "./archive";
import { parseDocument } from "./document";
import {
  defaultDraft,
  draftFromMarkdown,
  draftMarkdown,
  openProject,
  readDraft,
  saveProject,
} from "./editor";
import { markdownArchive } from "./importDocument";
import {
  defaultPrototype,
  ENGINES,
  engineRequirements,
  editableRequirements,
  hasEngineDetails,
  removeEngine,
  requirementFields,
  requirementMarkdown,
  SHARED_FIELDS,
  SHARED_REQUIREMENTS,
  SUPPORTED_ENGINES,
  type EngineId,
  type RequirementFields,
} from "./prototype";

describe("GDD engine and platform requirements", () => {
  it("offers only supported engines and starts with blank technical fields", () => {
    expect(SUPPORTED_ENGINES.map((engine) => engine.id)).toEqual([
      "unity",
      "threejs",
      "unreal",
      "phaser",
    ]);
    expect(defaultPrototype()).toMatchObject({
      engines: ["unity"],
      platforms: [],
      customPlatform: "",
      details: { unity: "" },
      shared: "",
    });
  });

  it("removes legacy guidance from editable fields without removing real or custom answers", () => {
    expect(
      editableRequirements(
        engineRequirements("unity"),
        ENGINES[0].requirements,
      ),
    ).toEqual({ fields: {}, additional: "" });
    expect(editableRequirements(SHARED_REQUIREMENTS, SHARED_FIELDS)).toEqual({
      fields: {},
      additional: "",
    });
    const prototype = defaultPrototype();
    prototype.details.unity = engineRequirements("unity");
    expect(hasEngineDetails(prototype, "unity")).toBe(false);
    prototype.details.unity = engineRequirements("unity").replace(
      "State the exact Unity Editor version, or write Undecided.",
      "6000.99.custom",
    );
    expect(hasEngineDetails(prototype, "unity")).toBe(true);
    expect(
      editableRequirements(prototype.details.unity, ENGINES[0].requirements)
        .fields,
    ).toEqual({ "Unity version": "6000.99.custom" });
    prototype.details.unity = {
      fields: { "Render pipeline": "My renderer" },
      additional: "",
    };
    expect(hasEngineDetails(prototype, "unity")).toBe(true);
    prototype.details.unity = { fields: {}, additional: "Imported notes." };
    expect(hasEngineDetails(prototype, "unity")).toBe(true);
  });

  it("preserves structured user input verbatim, including answers matching old guidance", () => {
    const content = {
      fields: { Controls: SHARED_FIELDS[0][1], Multiplayer: "  " },
      additional: "",
    };
    expect(editableRequirements(content, SHARED_FIELDS)).toBe(content);
  });

  it("deletes only the deselected engine's information without mutating the draft", () => {
    const prototype = defaultPrototype();
    prototype.engines = ["unity", "threejs"];
    prototype.details.unity = {
      fields: { "Unity version": "6000.99.custom" },
      additional: "Custom notes",
    };
    prototype.details.threejs = {
      fields: { Renderer: "WebGL" },
      additional: "",
    };
    const before = structuredClone(prototype);
    const removed = removeEngine(prototype, "unity");
    expect(prototype).toEqual(before);
    expect(removed.engines).toEqual(["threejs"]);
    expect(removed.details.unity).toBeUndefined();
    expect(removed.details.threejs).toEqual(before.details.threejs);
    const saved = openProject(
      saveProject({
        draft: { ...defaultDraft(), prototype: removed },
        assets: {},
      }),
    );
    expect(saved.draft.prototype?.details.unity).toBeUndefined();
  });

  it.each<EngineId>(["unity", "threejs", "unreal", "phaser", "custom"])(
    "exports only the selected %s engine requirements",
    (id) => {
      const prototype = defaultPrototype();
      prototype.engines = [id];
      prototype.details[id] = engineRequirements(id);
      prototype.platforms = ["Windows", "Web"];
      prototype.customPlatform = "Steam Deck";
      const draft = { ...defaultDraft(), title: "Game", prototype };
      const markdown = draftMarkdown(draft);
      const document = parseDocument(markdown);
      const section = document.sections.find(
        (entry) => entry.title === "Prototype requirements",
      );
      expect(section).toBeDefined();
      for (const engine of ENGINES) {
        expect(markdown.includes(`### ${engine.label}\n`)).toBe(
          engine.id === id,
        );
      }
      expect(markdown).toContain("Windows\n\nWeb\n\nSteam Deck");
      expect(draftFromMarkdown(markdown).prototype).toEqual({
        ...prototype,
        sectionIndex: 0,
        details: { [id]: prototype.details[id] },
      });
    },
  );

  it("supports multiple engines and preserves deselected engine text in saved drafts only", () => {
    const prototype = defaultPrototype();
    prototype.engines = ["threejs", "phaser"];
    prototype.details.unity = "Preserved Unity setup decision";
    prototype.details.threejs = engineRequirements("threejs");
    prototype.details.phaser = engineRequirements("phaser");
    const project = {
      draft: { ...defaultDraft(), title: "Browser game", prototype },
      assets: {},
    };
    expect(openProject(saveProject(project))).toEqual(project);
    const markdown = strFromU8(unzipSync(markdownArchive(project))["gdd.md"]);
    expect(markdown).toContain("### Three.js");
    expect(markdown).toContain("### Phaser");
    expect(markdown).not.toContain("Preserved Unity setup decision");
    expect(markdown).not.toContain("### Unity");
  });

  it("downloads a selected-engine template that imports back into engine controls", () => {
    const prototype = defaultPrototype();
    prototype.engines = ["threejs", "unreal"];
    prototype.platforms = ["Web", "Windows"];
    prototype.details.unreal = engineRequirements("unreal");
    prototype.details.threejs =
      "Existing decisions must not populate a blank template.";
    const imported = importArchive(createTemplate(prototype));
    expect(imported.markdown).not.toContain("Existing decisions");
    expect(imported.markdown).not.toContain("### Unity");
    expect(imported.markdown).toContain("### Three.js");
    expect(draftFromMarkdown(imported.markdown).prototype?.engines).toEqual([
      "threejs",
      "unreal",
    ]);
    expect(
      parseDocument(draftMarkdown(draftFromMarkdown(imported.markdown))),
    ).toEqual(imported.document);
  });

  it("keeps legacy drafts and unrelated imported sections unchanged", () => {
    const source =
      "# Legacy\n\n## Implementation overview\n\nUnity 6000, URP.\n";
    const draft = draftFromMarkdown(source);
    expect(draft.prototype).toBeUndefined();
    expect(openProject(saveProject({ draft, assets: {} })).draft).toEqual(
      draft,
    );
    expect(draftMarkdown(draft)).toBe(source);
    const custom =
      "# Custom\n\n## Prototype requirements\n\n### My own format\n\nDetails.\n";
    expect(draftFromMarkdown(custom).prototype).toBeUndefined();
    expect(draftMarkdown(draftFromMarkdown(custom))).toBe(custom);
  });

  it("allows all engine sections and platform fields to be cleared", () => {
    const prototype = { ...defaultPrototype(), engines: [], shared: "" };
    const draft = { ...defaultDraft(), prototype, title: "Game" };
    draft.sections[0].items = [
      { id: "body", heading: "", type: "text", body: "Design." },
    ];
    expect(draftMarkdown(draft)).not.toContain("Prototype requirements");
  });

  it("keeps a selected engine visible when its requirements are still undecided", () => {
    const prototype = defaultPrototype();
    prototype.engines = ["threejs"];
    prototype.details.threejs = "";
    const markdown = draftMarkdown({
      ...defaultDraft(),
      title: "Game",
      prototype,
    });
    expect(markdown).toContain("### Three.js\n\nUndecided.");
    expect(markdown).not.toContain("### Unity");
  });

  it("preserves imported prototype section placement", () => {
    const source =
      "# Game\n\n## Prototype requirements\n\n### Three.js\n\nWebGL.\n\n## Design\n\nCore loop.\n";
    const draft = draftFromMarkdown(source);
    expect(draft.prototype?.sectionIndex).toBe(0);
    expect(draftMarkdown(draft)).toBe(source);
    expect(openProject(saveProject({ draft, assets: {} })).draft).toEqual(
      draft,
    );
  });

  it.each(ENGINES)(
    "parses existing $label tables into individual fields",
    (engine) => {
      const parsed = requirementFields(
        engineRequirements(engine.id),
        engine.requirements,
      );
      expect(parsed.fields).toEqual(Object.fromEntries(engine.requirements));
      expect(parsed.additional).toBe("");
    },
  );

  it("parses shared requirement tables into individual fields", () => {
    expect(requirementFields(SHARED_REQUIREMENTS, SHARED_FIELDS)).toEqual({
      fields: Object.fromEntries(SHARED_FIELDS),
      additional: "",
    });
  });

  it("preserves custom prose, unknown tables, duplicate rows and escaped pipes", () => {
    const source = `Imported notes.

| Requirement | First prototype |
| --- | --- |
| Unity version | 6000.3 |
| Asset loading | Local \\| cloud |
| Custom decision | Retain me. |
| Unity version | A second version decision. |

| Custom | Table |
| --- | --- |
| Value | Still here. |

- Keep this custom bullet.
`;
    const parsed = requirementFields(source, ENGINES[0].requirements);
    expect(parsed.fields).toEqual({
      "Unity version": "6000.3",
      "Asset loading": "Local | cloud",
    });
    expect(parsed.additional).toContain("Imported notes.");
    expect(parsed.additional).toContain("| Custom decision | Retain me. |");
    expect(parsed.additional).toContain(
      "| Unity version | A second version decision. |",
    );
    expect(parsed.additional).toContain("| Custom | Table |");
    expect(parsed.additional).toContain("- Keep this custom bullet.");
    expect(
      requirementFields(requirementMarkdown(parsed), ENGINES[0].requirements),
    ).toEqual(parsed);
  });

  it("round-trips multiline fields, Markdown, long values and literal pipes without table limits", () => {
    const fields: RequirementFields = {
      fields: {
        Controls:
          "Keyboard | controller\n\n- Move with WASD.\n- Jump with Space.",
        Multiplayer: "None.",
        "Save data": `Local saves: ${"content ".repeat(80).trim()}\n\n\`slot.json\` with **checkpoints**.`,
      },
      additional:
        "Custom notes.\n\n| Extra | Decision |\n| --- | --- |\n| Budget | 10 MB |",
    };
    const markdown = requirementMarkdown(fields);
    expect(markdown).toContain("- **Controls**");
    expect(requirementFields(markdown, SHARED_FIELDS)).toEqual(fields);
    const document = parseDocument(
      `# Game\n\n## Prototype requirements\n\n### Shared requirements\n\n${markdown}\n`,
    );
    expect(
      document.sections[0].blocks.some((block) => block.type === "list"),
    ).toBe(true);
  });

  it("keeps whitespace in structured inputs and omits cleared values only on export", () => {
    const fields: RequirementFields = {
      fields: { Controls: "Keyboard\n\n", Multiplayer: "", "Save data": "  " },
      additional: "",
    };
    expect(requirementFields(fields, SHARED_FIELDS)).toBe(fields);
    expect(requirementMarkdown(fields)).toBe("- **Controls**\n\n  Keyboard");
    expect(requirementMarkdown({ fields: {}, additional: "" })).toBe("");
  });

  it("saves structured requirements and restores them through Markdown and source ZIP imports", () => {
    const prototype = defaultPrototype();
    const unity: RequirementFields = {
      fields: {
        "Unity version": "6000.3",
        "Render pipeline": "URP",
        "Asset loading": "Addressables\n\nLocal bundles.",
      },
      additional: "No paid plugins.",
    };
    const shared: RequirementFields = {
      fields: {
        Controls: "Keyboard and controller",
        "Launch locales": "English only",
      },
      additional: "",
    };
    prototype.details.unity = unity;
    prototype.shared = shared;
    const project = {
      draft: { ...defaultDraft(), title: "Game", prototype },
      assets: {},
    };
    expect(openProject(saveProject(project))).toEqual(project);
    const markdown = draftMarkdown(project.draft);
    const restored = draftFromMarkdown(markdown).prototype;
    expect(restored).toBeDefined();
    expect(
      requirementFields(restored?.details.unity ?? "", ENGINES[0].requirements),
    ).toEqual(unity);
    expect(requirementFields(restored?.shared ?? "", SHARED_FIELDS)).toEqual(
      shared,
    );
    expect(parseDocument(draftMarkdown(draftFromMarkdown(markdown)))).toEqual(
      parseDocument(markdown),
    );
    const source = importArchive(markdownArchive(project));
    expect(
      requirementFields(
        draftFromMarkdown(source.markdown).prototype?.shared ?? "",
        SHARED_FIELDS,
      ),
    ).toEqual(shared);
  });

  it.each([
    { engines: ["unknown"] },
    { engines: ["unity", "unity"] },
    { platforms: ["unknown"] },
    { platforms: ["Web", "Web"] },
    { details: { threejs: 123 } },
    { details: { unknown: "Unsupported engine" } },
    { customPlatform: "x".repeat(1001) },
    { shared: null },
    { shared: { fields: { Controls: 123 }, additional: "" } },
    { shared: { fields: { Unknown: "unsupported" }, additional: "" } },
    { shared: { fields: {}, additional: null } },
    { shared: { fields: {}, additional: "", unknown: "unsupported" } },
    { shared: { fields: { Controls: "x".repeat(150001) }, additional: "" } },
    {
      details: {
        unity: { fields: { Controls: "wrong section" }, additional: "" },
      },
    },
    { sectionIndex: -1 },
    { sectionIndex: 40 },
    { sectionIndex: 1.5 },
  ])("rejects malformed prototype metadata: %j", (patch) => {
    const draft = {
      ...defaultDraft(),
      prototype: { ...defaultPrototype(), ...patch },
    };
    expect(() =>
      readDraft({ format: "jeemzu-gdd-editor", version: 1, draft }),
    ).toThrow();
  });
});
