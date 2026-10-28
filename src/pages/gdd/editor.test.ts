import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createTemplate, importArchive, TEMPLATE_MARKDOWN } from "./archive";
import { parseDocument } from "./document";
import {
  defaultDraft,
  canCompleteSetup,
  draftFromMarkdown,
  draftMarkdown,
  moveItem,
  newImageGroup,
  newSection,
  newText,
  openProject,
  projectAssets,
  projectPaths,
  readDraft,
  saveProject,
  type EditorDraft,
  type EditorProject,
} from "./editor";

function exampleProject(): EditorProject {
  const imported = importArchive(createTemplate());
  return {
    draft: draftFromMarkdown(imported.markdown),
    assets: imported.images,
  };
}

describe("GDD form model", () => {
  it("requires a title, supported engine and target platform before completing setup", () => {
    const draft = defaultDraft();
    expect(draft.setupComplete).toBe(false);
    expect(canCompleteSetup(draft)).toBe(false);
    draft.title = "My game";
    expect(canCompleteSetup(draft)).toBe(false);
    if (!draft.prototype) throw new Error("Missing default prototype.");
    draft.prototype.platforms = ["Windows"];
    expect(canCompleteSetup(draft)).toBe(true);
    draft.prototype.engines = [];
    expect(canCompleteSetup(draft)).toBe(false);
    draft.prototype.engines = ["custom"];
    expect(canCompleteSetup(draft)).toBe(false);
    draft.prototype.engines = ["unity", "threejs"];
    expect(canCompleteSetup(draft)).toBe(true);
    draft.title = "  ";
    expect(canCompleteSetup(draft)).toBe(false);
  });

  it("persists setup completion in account drafts and leaves legacy imports unlocked", () => {
    for (const complete of [false, true]) {
      const draft = { ...defaultDraft(), setupComplete: complete };
      expect(
        openProject(saveProject({ draft, assets: {} })).draft.setupComplete,
      ).toBe(complete);
    }
    const imported = draftFromMarkdown("# Legacy\n\n## Design\n\nText.");
    expect(imported.setupComplete).toBeUndefined();
    expect(
      openProject(saveProject({ draft: imported, assets: {} })).draft
        .setupComplete,
    ).toBeUndefined();
    expect(() =>
      readDraft({
        format: "jeemzu-gdd-editor",
        version: 1,
        draft: { ...defaultDraft(), setupComplete: "yes" },
      }),
    ).toThrow("Invalid setup status");
  });

  it("opens a parent-folder ZIP with the same editable draft and original assets", () => {
    const project = exampleProject();
    const files = unzipSync(saveProject(project));
    const wrapped = zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, bytes]) => [
          `my-game/${name}`,
          bytes,
        ]),
      ),
    );
    expect(openProject(wrapped)).toEqual(project);
  });

  it("starts with blank fields, the default sections and a section-associated image category", () => {
    const draft = defaultDraft();
    expect(draft.title).toBe("");
    expect(draft.sections).toHaveLength(8);
    expect(draft.sections[0].title).toBe("Game direction");
    expect(draft.sections[0].items[0]).toMatchObject({
      type: "text",
      heading: "Vision and player experience",
      body: "",
    });
    expect(
      draft.sections[4].items[draft.sections[4].items.length - 1],
    ).toMatchObject({
      type: "images",
      heading: "Visual references",
      images: [],
    });
    expect(defaultDraft().sections[0].id).not.toBe(draft.sections[0].id);
  });

  it("moves sections, subsections and images without changing the originals or their associations", () => {
    const project = exampleProject();
    const before = structuredClone(project.draft);
    const sections = moveItem(project.draft.sections, 4, -1);
    expect(sections[3].title).toBe("Presentation and interaction");
    expect(projectPaths({ ...project.draft, sections })).toEqual([
      "images/example.png",
    ]);
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    expect(project.draft).toEqual(before);
    expect(() => moveItem([1], 0, -1)).toThrow();
  });

  it("converts populated templates without losing tables, lists, cover copy or figure order", () => {
    const project = exampleProject();
    expect(parseDocument(draftMarkdown(project.draft))).toEqual(
      parseDocument(TEMPLATE_MARKDOWN),
    );
  });

  it("preserves mixed text and multiple image groups under their section", () => {
    const source =
      "# Game\n\n## Art\n\n### Characters\n\nText before.\n\n![First](images/a.png)\n\n![Second](images/b.jpg)\n\nText after.\n\n### Environments\n\n![Third](images/c.png)\n\n## Rules\n\nPlay.";
    const draft = draftFromMarkdown(source);
    expect(draft.sections[0].items.map((item) => item.type)).toEqual([
      "text",
      "images",
      "text",
      "images",
    ]);
    expect(draft.sections[0].items[3].heading).toBe("Environments");
    expect(parseDocument(draftMarkdown(draft))).toEqual(parseDocument(source));
  });

  it("keeps reference-style links and images when importing Markdown", () => {
    const source =
      "# Game\n\n## Rules\n\n### [Source][guide]\n\nA [reference][guide].\n\n![Art][picture]\n\n[guide]: https://example.com\n[picture]: images/a.png";
    expect(parseDocument(draftMarkdown(draftFromMarkdown(source)))).toEqual(
      parseDocument(source),
    );
  });

  it("uses literal form headings and captions rather than interpreting them as Markdown syntax", () => {
    const draft: EditorDraft = {
      title: "A [game] *test*",
      introduction: "",
      sections: [
        {
          ...newSection("Art & [design]"),
          items: [
            {
              ...newImageGroup(),
              type: "images",
              heading: "Character *concepts*",
              images: [
                {
                  id: "image",
                  path: "images/a.png",
                  caption: "A [reference] with *stars*.",
                },
              ],
            },
          ],
        },
      ],
    };
    const document = parseDocument(draftMarkdown(draft));
    expect(document.title).toBe(draft.title);
    expect(document.sections[0].title).toBe("Art & [design]");
    expect(document.sections[0].blocks[1]).toMatchObject({
      type: "image",
      caption: "A [reference] with *stars*.",
    });
  });

  it("omits untouched fields from PDF output but preserves them in an incomplete saved draft", () => {
    const draft = defaultDraft();
    draft.title = "My game";
    const item = draft.sections[0].items[0];
    if (item.type !== "text") throw new Error("Expected text default");
    item.body = "My actual design.";
    expect(parseDocument(draftMarkdown(draft)).sections).toHaveLength(2);
    expect(openProject(saveProject({ draft, assets: {} })).draft).toEqual(
      draft,
    );
    const empty = defaultDraft();
    expect(
      openProject(saveProject({ draft: empty, assets: {} })).draft,
    ).toEqual(empty);
  });

  it("round-trips edited categories, image groups, ordering and original image bytes in the saved ZIP", () => {
    const project = exampleProject();
    project.draft.sections = moveItem(project.draft.sections, 4, -1);
    const zip = saveProject(project);
    expect(Object.keys(unzipSync(zip))).toContain("editor.json");
    expect(openProject(zip)).toEqual(project);
    expect(openProject(createTemplate())).toMatchObject({
      assets: project.assets,
    });
  });

  it("excludes removed image assets when saving", () => {
    const project = exampleProject();
    project.draft.sections = project.draft.sections.filter(
      (section) => section.title !== "Presentation and interaction",
    );
    expect(projectAssets(project)).toEqual({});
    expect(Object.keys(unzipSync(saveProject(project)))).not.toContain(
      "images/example.png",
    );
  });

  it("recalculates figure numbers from the reordered section, category and image order", () => {
    const draft = draftFromMarkdown(
      "# Game\n\n## Characters\n\n### Early concepts\n\n![First](images/a.png)\n\n![Second](images/b.png)\n\n### Final concepts\n\n![Third](images/c.png)\n\n## Environments\n\n![Fourth](images/d.png)",
    );
    const section = draft.sections[0];
    const group = section.items[0];
    if (group.type !== "images") throw new Error("Expected image category");
    group.images = moveItem(group.images, 1, -1);
    section.items = moveItem(section.items, 1, -1);
    draft.sections = moveItem(draft.sections, 1, -1);
    const figures = parseDocument(draftMarkdown(draft)).sections.flatMap(
      (entry) => entry.blocks.filter((block) => block.type === "image"),
    );
    expect(figures).toMatchObject([
      { caption: "Fourth", number: 1 },
      { caption: "Third", number: 2 },
      { caption: "Second", number: 3 },
      { caption: "First", number: 4 },
    ]);
  });

  it("keeps duplicate image references tied to the same original file", () => {
    const draft = draftFromMarkdown(
      "# Game\n\n## Art\n\n![First](images/a.png)\n\n![Second](images/a.png)",
    );
    expect(projectPaths(draft)).toEqual(["images/a.png"]);
  });

  it("blocks missing assets and unsupported image types on draft import", () => {
    const project = exampleProject();
    expect(() => saveProject({ ...project, assets: {} })).toThrow(
      "Missing image",
    );
    expect(() =>
      saveProject({
        ...project,
        assets: { "images/example.png": strToU8("<svg/>") },
      }),
    ).toThrow("PNG or JPEG");
    const files = unzipSync(saveProject(project));
    delete files["images/example.png"];
    expect(() => openProject(zipSync(files))).toThrow("Missing image");
  });

  it("validates editor version, IDs, field sizes and image paths before using imported metadata", () => {
    const draft = defaultDraft();
    const wrap = (value: unknown) => ({
      format: "jeemzu-gdd-editor",
      version: 1,
      draft: value,
    });
    expect(() => readDraft({ format: "unknown", version: 1, draft })).toThrow(
      "unsupported",
    );
    const duplicate = structuredClone(draft);
    duplicate.sections[1].id = duplicate.sections[0].id;
    expect(() => readDraft(wrap(duplicate))).toThrow("duplicate");
    expect(() => readDraft(wrap({ ...draft, title: "x".repeat(101) }))).toThrow(
      "oversized",
    );
    const invalid = exampleProject().draft;
    const images = invalid.sections[4].items.find(
      (item) => item.type === "images",
    );
    if (images?.type !== "images") throw new Error("Expected image category");
    images.images[0].path = "../secret.png";
    expect(() => readDraft(wrap(invalid))).toThrow("local PNG");
    expect(() =>
      openProject(zipSync({ "editor.json": strToU8("{bad") })),
    ).toThrow("valid UTF-8 JSON");
  });

  it("reports incomplete PDF data and prevents body fields from redefining the document structure", () => {
    const draft = {
      title: "Game",
      introduction: "",
      sections: [newSection("Rules")],
    };
    expect(() => draftMarkdown(draft)).toThrow("Add text or upload images");
    draft.sections[0].items = [
      { ...newText(), type: "text", body: "## Hidden section" },
    ];
    expect(() => draftMarkdown(draft)).toThrow("subheading field");
    draft.sections[0].items = [
      { ...newText(), type: "text", body: "![Manual](images/a.png)" },
    ];
    expect(() => draftMarkdown(draft)).toThrow("Add image category");
  });
});
