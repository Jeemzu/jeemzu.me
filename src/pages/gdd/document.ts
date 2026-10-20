import { Lexer, type MarkedToken } from "marked";

export const LIMITS = {
  archive: 25 * 1024 * 1024,
  expanded: 60 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  markdown: 1024 * 1024,
  files: 100,
  characters: 150_000,
  sections: 40,
  pixels: 24_000_000,
} as const;

export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  href?: string;
}

export type Block =
  | { type: "paragraph" | "quote" | "code"; text: Inline[] }
  | { type: "heading"; text: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Block[][] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "image"; path: string; caption: string; number: number }
  | { type: "rule" };

export interface GddSection {
  id: string;
  title: string;
  blocks: Block[];
}

export interface GddDocument {
  title: string;
  introduction: Inline[][];
  sections: GddSection[];
  imagePaths: string[];
}

export function imagePath(value: string): string {
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid image path: ${value}`);
  }
  if (
    !/^images\/[^/]+\.(png|jpe?g)$/i.test(path) ||
    /[\\?#:]/.test(path) ||
    [...path].some((char) => char.charCodeAt(0) < 32)
  ) {
    throw new Error(`Use a local PNG or JPEG in images/: ${value}`);
  }
  return path;
}

function inline(
  tokens: MarkedToken[],
  inherited: Omit<Inline, "text"> = {},
): Inline[] {
  return tokens.flatMap((token): Inline[] => {
    switch (token.type) {
      case "text":
        return token.tokens
          ? inline(token.tokens as MarkedToken[], inherited)
          : [{ ...inherited, text: token.text }];
      case "escape":
      case "codespan":
      // Raw HTML is shown literally; the PDF never interprets markup.
      case "html":
        return [{ ...inherited, text: token.text }];
      case "strong":
      case "em":
      case "del":
        return inline(token.tokens as MarkedToken[], {
          ...inherited,
          ...(token.type === "strong" ? { bold: true } : {}),
          ...(token.type === "em" ? { italic: true } : {}),
          ...(token.type === "del" ? { strike: true } : {}),
        });
      case "link": {
        if (!/^https?:\/\//i.test(token.href)) {
          throw new Error("Text links must use https:// or http://.");
        }
        const url = new URL(token.href);
        return inline(token.tokens as MarkedToken[], {
          ...inherited,
          href: url.href,
        });
      }
      case "br":
        return [{ ...inherited, text: "\n" }];
      case "image":
        throw new Error(
          "Place each image on its own paragraph, outside lists and tables.",
        );
      default:
        throw new Error(
          `Unsupported Markdown (${token.type}). Use the template's headings, text, lists, tables and images.`,
        );
    }
  });
}

export function plainText(text: Inline[]): string {
  return text.map((span) => span.text).join("");
}

export function parseDocument(source: string): GddDocument {
  if (source.length > LIMITS.characters) {
    throw new Error(
      `Keep gdd.md below ${LIMITS.characters.toLocaleString()} characters.`,
    );
  }
  const tokens = Lexer.lex(source.replace(/^\uFEFF/, ""), {
    gfm: true,
  }) as MarkedToken[];
  const meaningful = tokens.filter(
    (token) => token.type !== "space" && token.type !== "def",
  );
  const first = meaningful.shift();
  if (first?.type !== "heading" || first.depth !== 1) {
    throw new Error("Start gdd.md with a single # Game title.");
  }
  const title = plainText(inline(first.tokens as MarkedToken[])).trim();
  if (!title || title.length > 100)
    throw new Error("Use a game title between 1 and 100 characters.");
  const sections: GddSection[] = [];
  const introduction: Inline[][] = [];
  const imagePaths = new Set<string>();
  let figure = 0;

  function blocks(items: MarkedToken[], depth = 0): Block[] {
    if (depth > 4) throw new Error("Use no more than four nested list levels.");
    return items.flatMap((token): Block[] => {
      switch (token.type) {
        case "space":
        case "def":
          return [];
        case "paragraph":
        case "text": {
          const children = token.tokens as MarkedToken[] | undefined;
          if (children?.length === 1 && children[0].type === "image") {
            const image = children[0];
            const path = imagePath(image.href);
            const caption = image.text.trim();
            if (!caption || caption.length > 400) {
              throw new Error(
                "Give every image a caption between 1 and 400 characters inside ![...].",
              );
            }
            if (depth) throw new Error("Place images outside lists.");
            imagePaths.add(path);
            return [{ type: "image", path, caption, number: ++figure }];
          }
          return [
            {
              type: "paragraph",
              text: children ? inline(children) : [{ text: token.text }],
            },
          ];
        }
        case "heading":
          if (token.depth !== 3 || depth)
            throw new Error("Use ## for sections and ### for subheadings.");
          return [
            { type: "heading", text: inline(token.tokens as MarkedToken[]) },
          ];
        case "list":
          if (token.items.some((item) => item.task))
            throw new Error(
              "Use plain bullet or numbered lists, not checkboxes.",
            );
          return [
            {
              type: "list",
              ordered: token.ordered,
              start: typeof token.start === "number" ? token.start : 1,
              items: token.items.map((item) =>
                blocks(item.tokens as MarkedToken[], depth + 1),
              ),
            },
          ];
        case "blockquote": {
          const content = blocks(token.tokens as MarkedToken[], depth + 1);
          return content.map((block) => {
            if (block.type !== "paragraph")
              throw new Error("Use paragraphs only inside blockquotes.");
            return { type: "quote", text: block.text };
          });
        }
        case "code":
          if (
            token.text.length > 3000 ||
            token.text.split("\n").some((line) => line.length > 80)
          ) {
            throw new Error(
              "Keep code blocks below 3,000 characters and lines below 80 characters.",
            );
          }
          return [{ type: "code", text: [{ text: token.text }] }];
        case "table": {
          if (depth)
            throw new Error("Place tables outside lists and blockquotes.");
          if (token.header.length > 6 || token.rows.length > 100) {
            throw new Error("Tables support up to six columns and 100 rows.");
          }
          const cells = [token.header, ...token.rows];
          if (cells.some((row) => row.some((cell) => cell.text.length > 350))) {
            throw new Error(
              "Keep table cells below 350 characters; move longer explanations into paragraphs.",
            );
          }
          return [
            {
              type: "table",
              header: token.header.map((cell) =>
                inline(cell.tokens as MarkedToken[]),
              ),
              rows: token.rows.map((row) =>
                row.map((cell) => inline(cell.tokens as MarkedToken[])),
              ),
            },
          ];
        }
        case "hr":
          return [{ type: "rule" }];
        case "html":
          return [{ type: "paragraph", text: [{ text: token.text.trim() }] }];
        default:
          throw new Error(
            `Unsupported Markdown (${token.type}). Use the template's headings, text, lists, tables and images.`,
          );
      }
    });
  }

  let section: GddSection | undefined;
  for (const token of meaningful) {
    if (token.type === "heading" && token.depth === 2) {
      const sectionTitle = plainText(
        inline(token.tokens as MarkedToken[]),
      ).trim();
      if (!sectionTitle || sectionTitle.length > 100)
        throw new Error("Section titles must be 1-100 characters.");
      section = {
        id: `section-${sections.length + 1}`,
        title: sectionTitle,
        blocks: [],
      };
      sections.push(section);
    } else if (section) {
      section.blocks.push(...blocks([token]));
    } else if (token.type === "paragraph") {
      introduction.push(inline(token.tokens as MarkedToken[]));
    } else if (token.type === "html") {
      introduction.push([{ text: token.text.trim() }]);
    } else {
      throw new Error(
        "After the title, add optional cover paragraphs, then a ## Section heading.",
      );
    }
  }
  if (
    introduction.length > 4 ||
    introduction.map(plainText).join("").length > 800
  ) {
    throw new Error(
      "Use up to four cover paragraphs, with at most 800 characters total.",
    );
  }
  if (!sections.length || sections.length > LIMITS.sections)
    throw new Error("Include between 1 and 40 ## sections.");
  if (sections.some((item) => !item.blocks.length))
    throw new Error("Add content to every section before generating a PDF.");
  return { title, introduction, sections, imagePaths: [...imagePaths] };
}
