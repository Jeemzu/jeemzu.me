import { describe, expect, it } from "vitest";
import { imagePath, LIMITS, parseDocument, plainText } from "./document";
import { TEMPLATE_MARKDOWN } from "./archive";

describe("GDD Markdown", () => {
  it("preserves the template's section order, text, tables and reference captions", () => {
    const document = parseDocument(TEMPLATE_MARKDOWN);
    expect(document.title).toBe("Your Game");
    expect(document.sections.map((section) => section.title)).toEqual([
      "Game direction",
      "World and progression",
      "Core gameplay",
      "Combat and character systems",
      "Presentation and interaction",
      "Implementation overview",
      "First playable slice",
      "Audience and release",
    ]);
    expect(plainText(document.introduction[0])).toBe(
      "Your genre / Your setting / Your core experience",
    );
    expect(
      document.sections[0].blocks[document.sections[0].blocks.length - 1]?.type,
    ).toBe("table");
    expect(
      document.sections[4].blocks[document.sections[4].blocks.length - 1],
    ).toEqual({
      type: "image",
      path: "images/example.png",
      number: 1,
      caption:
        "Replace this example with your reference image. Add attribution or source details here.",
    });
  });

  it("preserves inline formatting, nested lists, and explicit line breaks", () => {
    const document = parseDocument(
      "# Café\n\n## Rules\n\n**Bold** and *italic* with ~~old~~ [link](https://example.com).\n\nFirst  \nSecond\n\n3. Start\n   - Nested\n4. Finish\n",
    );
    const [paragraph, multiline, list] = document.sections[0].blocks;
    expect(paragraph).toMatchObject({
      type: "paragraph",
      text: expect.arrayContaining([
        { bold: true, text: "Bold" },
        { italic: true, text: "italic" },
        { strike: true, text: "old" },
        { href: "https://example.com/", text: "link" },
      ]),
    });
    expect(multiline).toMatchObject({
      type: "paragraph",
      text: expect.arrayContaining([{ text: "\n" }]),
    });
    expect(list).toMatchObject({ type: "list", ordered: true, start: 3 });
    expect(document.title).toBe("Café");
  });

  it("numbers figures by appearance and deduplicates image assets", () => {
    const document = parseDocument(
      "# Game\n\n## Art\n\n![First](images/a.png)\n\n![Again](images/a.png)",
    );
    expect(document.imagePaths).toEqual(["images/a.png"]);
    expect(document.sections[0].blocks).toMatchObject([
      { number: 1 },
      { number: 2 },
    ]);
  });

  it.each([
    ["No title", /single #/],
    ["# Game\n\n## Empty", /every section/],
    ["# Game\n\n### Before", /Section heading/],
    ["# Game\n\n## Rules\n\n# Another title", /## for sections/],
    ["# Game\n\n## Rules\n\n#### Too deep", /subheadings/],
    ["# Game\n\n## Rules\n\n<script>alert(1)</script>", /Raw HTML/],
    ["# Game\n\n## Rules\n\n[bad](javascript:alert)", /http/],
    ["# Game\n\n## Rules\n\nText ![inline](images/a.png)", /own paragraph/],
    ["# Game\n\n## Art\n\n![](images/a.png)", /caption/],
    ["# Game\n\n## Rules\n\n- [ ] Check", /checkboxes/],
    [`# Game\n\n## Rules\n\n${"a".repeat(LIMITS.characters)}`, /characters/],
    [
      `# Game\n\n## Rules\n\n| A |\n| - |\n| ${"a".repeat(351)} |`,
      /table cells/,
    ],
    [`# Game\n\n${"Text\n\n".repeat(5)}## Rules\n\nBody`, /four cover/],
  ])(
    "rejects invalid or unsupported content explicitly: %s",
    (source, message) => {
      expect(() => parseDocument(source)).toThrow(message);
    },
  );

  it.each([
    "https://example.com/a.png",
    "../secret.png",
    "images/../a.png",
    "images/a.svg",
    "images\\a.png",
    "images/%2e%2e%2fa.png",
    "images/a.png?x",
    "images/%zz.png",
  ])("rejects unsafe or unsupported image path %s", (path) => {
    expect(() => imagePath(path)).toThrow();
  });

  it("decodes spaces in local image paths", () => {
    expect(imagePath("images/concept%20art.jpg")).toBe(
      "images/concept art.jpg",
    );
  });
});
