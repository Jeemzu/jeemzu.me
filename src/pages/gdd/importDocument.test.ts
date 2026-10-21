import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createTemplate, importArchive } from "./archive";
import { parseDocument } from "./document";
import { draftFromMarkdown, openProject } from "./editor";
import {
  ImportImages,
  importDocument,
  markdownArchive,
  normalizeMarkdown,
  validateDocx,
} from "./importDocument";
import { pdfLines, pdfMarkdown } from "./importPdf";

describe("document imports", () => {
  it("preserves organized Markdown, cover copy, section order and formatting", async () => {
    const source =
      "# Grove\n\nA quiet forest.\n\n## World\n\n### Trees\n\n**Grow**.\n\n## Rules\n\n1. Plant.\n2. Harvest.\n";
    const result = await importDocument(new File([source], "grove.md"));
    expect(result.project.draft.title).toBe("Grove");
    expect(
      result.project.draft.sections.map((section) => section.title),
    ).toEqual(["World", "Rules"]);
    expect(parseDocument(normalizeMarkdown(source, "Unused"))).toEqual(
      parseDocument(source),
    );
    expect(result.converted).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("adds structure for unheaded text without rewriting its contents", async () => {
    const result = await importDocument(
      new File(["Plant a tree.\n\nWatch it grow."], "Forest.txt"),
    );
    expect(result.project.draft.title).toBe("Forest");
    expect(result.project.draft.sections[0].title).toBe("Imported content");
    expect(result.project.draft.sections[0].items[0]).toMatchObject({
      type: "text",
      body: "Plant a tree.\n\nWatch it grow.",
    });
  });

  it("normalizes deep and repeated title headings to the supported hierarchy", () => {
    const doc = parseDocument(
      normalizeMarkdown(
        "# Title\n\n## First\n\n#### Detail\n\nText.\n\n# Second\n\nText.",
        "Fallback",
      ),
    );
    expect(doc.sections.map((section) => section.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(doc.sections[0].blocks[0]).toMatchObject({
      type: "heading",
      text: [{ text: "Detail" }],
    });
  });

  it("puts lengthy cover text in a section instead of truncating it", () => {
    const text = "word ".repeat(200);
    const doc = parseDocument(
      normalizeMarkdown(`# Game\n\n${text}\n\n## Rules\n\nPlay.`, "Fallback"),
    );
    expect(doc.introduction).toEqual([]);
    expect(doc.sections[0].title).toBe("Imported content");
    expect(doc.sections[0].blocks[0]).toMatchObject({
      type: "paragraph",
      text: [{ text }],
    });
  });

  it("handles leading whitespace and subsection-only sources without empty sections", () => {
    expect(
      parseDocument(normalizeMarkdown("\n\n## World\n\nForest.", "Game"))
        .sections,
    ).toHaveLength(1);
    expect(
      parseDocument(normalizeMarkdown("### World\n\nForest.", "Game"))
        .sections[0].title,
    ).toBe("Imported content");
  });

  it("keeps existing ZIP imports on the authoritative existing import path", async () => {
    const bytes = createTemplate();
    const result = await importDocument(
      new File([Uint8Array.from(bytes).buffer], "gdd.zip"),
    );
    expect(result.project.draft.title).toBe(openProject(bytes).draft.title);
    expect(result.converted).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("exports only Markdown and referenced images, without an authoritative editor snapshot", () => {
    const imported = importArchive(createTemplate());
    const project = {
      draft: draftFromMarkdown(imported.markdown),
      assets: imported.images,
    };
    const zip = markdownArchive(project);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(["gdd.md", "images/example.png"]);
    expect(importArchive(zip).document).toEqual(imported.document);
    expect(files["images/example.png"]).toEqual(
      imported.images["images/example.png"],
    );
  });

  it("reports missing Markdown assets and leaves image collection limits enforced", async () => {
    await expect(
      importDocument(
        new File(["# Game\n\n## Art\n\n![Missing](images/a.png)"], "game.md"),
      ),
    ).rejects.toThrow("Missing image");
    const collector = new ImportImages();
    expect(() => collector.add(strToU8("not PNG"), "png")).toThrow("PNG");
  });

  it("rejects unsupported, oversized, empty, and non-UTF8 files", async () => {
    await expect(importDocument(new File(["x"], "game.exe"))).rejects.toThrow(
      "Select a",
    );
    await expect(importDocument(new File([""], "game.txt"))).rejects.toThrow(
      "no readable content",
    );
    await expect(
      importDocument(new File([new Uint8Array([0xff])], "game.txt")),
    ).rejects.toThrow("UTF-8");
    await expect(
      importDocument(new File([new Uint8Array(1024 * 1024 + 1)], "game.md")),
    ).rejects.toThrow("1 MB");
    await expect(
      importDocument(
        new File([new Uint8Array(25 * 1024 * 1024 + 1)], "game.pdf"),
      ),
    ).rejects.toThrow("25 MB");
  });

  it("preflights DOCX packages and rejects missing, unsafe, and over-expanded content", () => {
    const valid = {
      "[Content_Types].xml": strToU8("<Types/>"),
      "word/document.xml": strToU8("<document/>"),
    };
    expect(() => validateDocx(zipSync(valid))).not.toThrow();
    expect(() => validateDocx(strToU8("invalid"))).toThrow("valid DOCX");
    expect(() =>
      validateDocx(zipSync({ "other.txt": strToU8("text") })),
    ).toThrow("missing");
    expect(() =>
      validateDocx(zipSync({ ...valid, "../outside": strToU8("x") })),
    ).toThrow("unsafe");
    expect(() =>
      validateDocx(
        zipSync({ ...valid, "huge.xml": new Uint8Array(60 * 1024 * 1024 + 1) }),
      ),
    ).toThrow("60 MB");
  });
});

describe("PDF structure recovery", () => {
  it("distinguishes primary sections and smaller subheadings in unnumbered PDFs", () => {
    const line = (text: string, y: number, size = 10) => ({
      text,
      x: 10,
      y,
      size,
    });
    const markdown = pdfMarkdown(
      [
        {
          height: 800,
          lines: [
            line("Game", 700, 36),
            line("World", 600, 18),
            line("Setting", 560, 14),
            line("Forest.", 520),
            line("Trees.", 500),
            line("Grow.", 480),
            line("Rules", 400, 18),
            line("Plant.", 360),
            line("Harvest.", 340),
            line("Repeat.", 320),
          ],
          images: [],
        },
      ],
      "Fallback",
    );
    const doc = parseDocument(markdown);
    expect(doc.sections.map((section) => section.title)).toEqual([
      "World",
      "Rules",
    ]);
    expect(doc.sections[0].blocks[0]).toMatchObject({
      type: "heading",
      text: [{ text: "Setting" }],
    });
  });

  it("recovers a multiline cover title with differently sized title lines", () => {
    const markdown = pdfMarkdown(
      [
        {
          height: 800,
          lines: [
            { text: "The Knotted", x: 54, y: 586, size: 47 },
            { text: "Grove", x: 54, y: 504, size: 68 },
            { text: "01 / WORLD", x: 54, y: 400, size: 8 },
            { text: "Forest.", x: 54, y: 350, size: 10 },
            { text: "Trees.", x: 54, y: 330, size: 10 },
            { text: "Grow.", x: 54, y: 310, size: 10 },
          ],
          images: [],
        },
      ],
      "Fallback",
    );
    expect(parseDocument(markdown).title).toBe("The Knotted Grove");
  });

  it("groups text runs in visual reading order without losing separated cells", () => {
    const item = (str: string, x: number, y: number, width = 30) => ({
      str,
      transform: [10, 0, 0, 10, x, y],
      height: 10,
      width,
    });
    expect(
      pdfLines([
        item("next", 10, 70),
        item("right", 100, 90),
        item("left", 10, 90),
        item("word", 42, 90),
      ]).map((line) => line.text),
    ).toEqual(["left word | right", "next"]);
  });

  it("keeps numbered section order, suppresses repeated page furniture and places images near text", () => {
    const line = (text: string, y: number, size = 10) => ({
      text,
      x: 10,
      y,
      size,
    });
    const markdown = pdfMarkdown(
      [
        {
          height: 800,
          lines: [
            line("Grove", 650, 30),
            line("HEADER", 770),
            line("01 / WORLD", 720),
            line("Forest.", 600),
            line("1 / 2", 20),
          ],
          images: [{ y: 500, markdown: "![Trees](images/trees.png)" }],
        },
        {
          height: 800,
          lines: [
            line("HEADER", 770),
            line("01 / WORLD", 720),
            line("Still forest.", 600),
            line("02 / RULES", 400),
            line("Plant.", 350),
            line("2 / 2", 20),
          ],
          images: [],
        },
      ],
      "Fallback",
    );
    const doc = parseDocument(markdown);
    expect(doc.title).toBe("Grove");
    expect(doc.sections.map((section) => section.title)).toEqual([
      "WORLD",
      "RULES",
    ]);
    expect(doc.imagePaths).toEqual(["images/trees.png"]);
    expect(markdown).not.toContain("HEADER");
    expect(markdown).not.toContain("1 / 2");
    expect(markdown.indexOf("![Trees]")).toBeLessThan(
      markdown.indexOf("Still forest."),
    );
  });
});
