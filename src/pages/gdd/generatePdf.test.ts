import { basename, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { Font, pdf } from "@react-pdf/renderer";
import { cloneElement } from "react";
import { GddPdf } from "./GddPdf";
import { beforeAll, describe, expect, it } from "vitest";
import { generatePdf } from "./generatePdf";
import { createTemplate, importArchive } from "./archive";
import { parseDocument } from "./document";

interface LayoutNode {
  type: string;
  value?: string;
  box?: { width: number; height: number };
  lines?: unknown[];
  children?: LayoutNode[];
}

function descendants(node: LayoutNode): LayoutNode[] {
  return [node, ...(node.children ?? []).flatMap(descendants)];
}

describe("GDD PDF export", () => {
  beforeAll(() => {
    // Vite asset URLs need filesystem paths in the Node test environment.
    for (const family of ["GddSans", "GddSerif"]) {
      for (const font of Font.getRegisteredFonts()[family].sources) {
        font.src = resolve("src", "assets", "fonts", "gdd", basename(font.src));
      }
    }
  });

  it("renders a cover, linked contents, sections, figures and flowing overflow pages", async () => {
    const template = importArchive(createTemplate());
    const content = parseDocument(
      `# A Test Game\n\nDesign and visual references.\n\n## Long section\n\n${"This paragraph must flow onto another page without losing its text.\n\n".repeat(70)}\n### Reference\n\n![Original caption.](images/example.png)\n\n## Final section\n\nLast paragraph.`,
    );
    const blob = await generatePdf(content, {
      "images/example.png": {
        src: `data:image/png;base64,${Buffer.from(template.images["images/example.png"]).toString("base64")}`,
        width: 1,
        height: 1,
      },
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const source = new TextDecoder("latin1").decode(bytes);
    expect(blob.type).toBe("application/pdf");
    expect(source.startsWith("%PDF")).toBe(true);
    expect(
      (source.match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThanOrEqual(5);
    expect(source).toContain("/Subtype /Image");
    expect(source).toContain("/Dests");
    expect(source).toContain("/Outlines");
    expect(source).toContain("/MediaBox [0 0 612 792]");
    if (process.env.GDD_PDF_OUTPUT)
      writeFileSync(process.env.GDD_PDF_OUTPUT, bytes);
  }, 30_000);

  it("keeps visible dynamic section labels, footers and Letter dimensions", async () => {
    let layout: LayoutNode | undefined;
    await pdf(
      cloneElement(
        GddPdf({
          content: parseDocument("# Debug\n\n## Section\n\nBody."),
          images: {},
          pageNumbers: { "section-1": 3 },
        }),
        {
          onRender: (data: unknown) => {
            if (
              typeof data !== "object" ||
              !data ||
              !("_INTERNAL__LAYOUT__DATA_" in data)
            ) {
              throw new Error("PDF layout data is unavailable.");
            }
            layout = data._INTERNAL__LAYOUT__DATA_ as LayoutNode;
          },
        },
      ),
    ).toBlob();
    expect(layout).toBeDefined();
    const pages = layout?.children ?? [];
    expect(pages).toHaveLength(3);
    for (const page of pages)
      expect(page.box).toMatchObject({ width: 612, height: 792 });
    for (const [index, page] of pages.entries()) {
      if (!index) continue;
      const textNodes = descendants(page).filter(
        (node) =>
          node.type === "TEXT" &&
          node.children?.some((child) => child.type === "TEXT_INSTANCE"),
      );
      const footer = textNodes.find((node) =>
        node.children?.some(
          (child) => child.value === "DESIGN & VISUAL REFERENCES",
        ),
      );
      const number = textNodes.find((node) =>
        node.children?.some((child) => child.value === `0${index + 1} / 03`),
      );
      expect(footer?.lines?.length).toBeGreaterThan(0);
      expect(number?.lines?.length).toBeGreaterThan(0);
    }
    const section = descendants(pages[2]).find(
      (node) =>
        node.type === "TEXT" &&
        node.children?.some((child) => child.value === "01 / SECTION"),
    );
    expect(section?.lines?.length).toBeGreaterThan(0);
  });
});
