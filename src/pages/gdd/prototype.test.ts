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
  type EngineId,
} from "./prototype";

describe("GDD engine and platform requirements", () => {
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

  it.each([
    { engines: ["unknown"] },
    { engines: ["unity", "unity"] },
    { platforms: ["unknown"] },
    { platforms: ["Web", "Web"] },
    { details: { threejs: 123 } },
    { details: { unknown: "Unsupported engine" } },
    { customPlatform: "x".repeat(1001) },
    { shared: null },
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
