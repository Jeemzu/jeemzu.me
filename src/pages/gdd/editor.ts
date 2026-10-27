import { Lexer, type MarkedToken } from "marked";
import { strToU8, zipSync } from "fflate";
import { extractArchive, importArchive } from "./archive";
import {
  imagePath,
  LIMITS,
  parseDocument,
  plainText,
  type Inline,
} from "./document";
import { validateDimensions } from "./images";
import {
  defaultPrototype,
  ENGINES,
  PLATFORMS,
  PROTOTYPE_SECTION,
  prototypeItems,
  type PrototypeRequirements,
} from "./prototype";

export interface EditorImage {
  id: string;
  path: string;
  caption: string;
}

export type EditorItem = {
  id: string;
  heading: string;
  headingMarkdown?: string;
} & (
  | { type: "text"; body: string }
  | { type: "images"; images: EditorImage[] }
);

export interface EditorSection {
  id: string;
  title: string;
  items: EditorItem[];
}

export interface EditorDraft {
  title: string;
  introduction: string;
  sections: EditorSection[];
  prototype?: PrototypeRequirements;
}

export interface EditorProject {
  draft: EditorDraft;
  assets: Record<string, Uint8Array>;
}

export function newText(heading = ""): EditorItem {
  return { id: crypto.randomUUID(), type: "text", heading, body: "" };
}

export function newImageGroup(heading = ""): EditorItem {
  return { id: crypto.randomUUID(), type: "images", heading, images: [] };
}

export function newSection(title = ""): EditorSection {
  return { id: crypto.randomUUID(), title, items: [newText()] };
}

export function defaultDraft(): EditorDraft {
  const defaults: [string, string[]][] = [
    [
      "Game direction",
      ["Vision and player experience", "What distinguishes the game"],
    ],
    ["World and progression", ["Setting and narrative", "Progression"]],
    ["Core gameplay", ["Core loop", "Supporting systems"]],
    ["Combat and character systems", ["Combat", "Character customization"]],
    [
      "Presentation and interaction",
      ["Art direction", "Camera and interface", "Audio and animation"],
    ],
    [
      "Implementation overview",
      ["Systems and technology", "Controls and save data"],
    ],
    [
      "First playable slice",
      ["Scope", "Tutorial sequence", "Completion requirements"],
    ],
    ["Audience and release", ["Target audience", "Platforms and monetization"]],
  ];
  return {
    title: "",
    introduction: "",
    prototype: defaultPrototype(),
    sections: defaults.map(([title, headings]) => ({
      id: crypto.randomUUID(),
      title,
      items: [
        ...headings.map(newText),
        ...(title === "Presentation and interaction"
          ? [newImageGroup("Visual references")]
          : []),
      ],
    })),
  };
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;
  if (
    index < 0 ||
    index >= items.length ||
    destination < 0 ||
    destination >= items.length
  ) {
    throw new Error("Cannot move this item outside its list.");
  }
  const result = [...items];
  [result[index], result[destination]] = [result[destination], result[index]];
  return result;
}

function escaped(value: string): string {
  return value.replace(/[\\`*_[\]<>!~#|]/g, "\\$&");
}

function heading(value: string): string {
  if (/[\r\n]/.test(value))
    throw new Error("Titles and subheadings must use a single line.");
  return escaped(value.trim());
}

function formattedHeading(spans: Inline[]): string {
  return spans
    .map((span) => {
      let text = escaped(span.text);
      if (span.bold) text = `**${text}**`;
      if (span.italic) text = `*${text}*`;
      if (span.strike) text = `~~${text}~~`;
      if (span.href)
        text = `[${text}](${span.href.replace(/[()]/g, (char) => encodeURIComponent(char))})`;
      return text;
    })
    .join("");
}

export function projectPaths(draft: EditorDraft): string[] {
  return [
    ...new Set(
      draft.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.type === "images" ? item.images.map((image) => image.path) : [],
        ),
      ),
    ),
  ];
}

export function draftMarkdown(draft: EditorDraft, validate = true): string {
  const entries = [...draft.sections];
  if (draft.prototype) {
    const index =
      draft.prototype.sectionIndex ??
      entries.findIndex((section) => section.title === "First playable slice");
    entries.splice(index < 0 ? entries.length : index, 0, {
      id: "prototype",
      title: PROTOTYPE_SECTION,
      items: prototypeItems(draft.prototype).map((item) => ({
        ...item,
        id: item.heading,
        type: "text" as const,
      })),
    });
  }
  const sections = entries
    .map((section) => {
      const items = section.items.flatMap((item): string[] => {
        if (item.type === "text") {
          if (!item.body.trim()) return [];
          // Structure and image placement belong to the form controls.
          if (
            validate &&
            Lexer.lex(item.body).some((token) => token.type === "heading")
          ) {
            throw new Error(
              `Use the subheading field instead of Markdown headings in "${item.heading || section.title}".`,
            );
          }
          return [
            [
              item.heading.trim()
                ? `### ${item.headingMarkdown ?? heading(item.heading)}\n\n`
                : "",
              item.body.trim(),
            ].join(""),
          ];
        }
        if (!item.images.length) return [];
        const figures = item.images.map((image) => {
          if (validate && (!image.caption.trim() || image.caption.length > 400))
            throw new Error(
              "Give every image a caption between 1 and 400 characters.",
            );
          return `![${image.caption.trim().replace(/[\\[\]]/g, "\\$&")}](${encodeURI(imagePath(image.path)).replace(/[()]/g, (char) => encodeURIComponent(char))})`;
        });
        return [
          `${item.heading.trim() ? `### ${item.headingMarkdown ?? heading(item.heading)}\n\n` : ""}${figures.join("\n\n")}`,
        ];
      });
      if (!items.length) return "";
      if (validate && !section.title.trim())
        throw new Error("Name every section that contains text or images.");
      return `## ${heading(section.title)}\n\n${items.join("\n\n")}`;
    })
    .filter(Boolean);
  if (validate && !sections.length)
    throw new Error("Add text or upload images to at least one section.");
  const source = `# ${heading(draft.title)}\n\n${draft.introduction.trim() ? `${draft.introduction.trim()}\n\n` : ""}${sections.join("\n\n")}\n`;
  if (!validate) return source;
  const document = parseDocument(source);
  const expected = projectPaths(draft);
  if (document.imagePaths.some((path) => !expected.includes(path))) {
    throw new Error(
      "Use Add image category to upload images instead of image Markdown in body fields.",
    );
  }
  return source;
}

export function draftFromMarkdown(source: string): EditorDraft {
  const document = parseDocument(source);
  const tokens = Lexer.lex(source.replace(/^\uFEFF/, ""), {
    gfm: true,
  }) as MarkedToken[];
  const draft: EditorDraft = {
    title: document.title,
    introduction: "",
    sections: [],
  };
  let section: EditorSection | undefined;
  let item: EditorItem | undefined;
  let sectionIndex = 0;
  const definitions = tokens
    .filter((token) => token.type === "def")
    .map((token) => token.raw)
    .join("\n");
  for (const token of tokens) {
    if (
      token.type === "space" ||
      token.type === "def" ||
      (token.type === "heading" && token.depth === 1)
    )
      continue;
    if (token.type === "heading" && token.depth === 2) {
      section = {
        id: crypto.randomUUID(),
        title: document.sections[sectionIndex++].title,
        items: [],
      };
      draft.sections.push(section);
      item = undefined;
    } else if (!section) {
      draft.introduction += `${token.raw.trim()}\n\n`;
    } else if (token.type === "heading" && token.depth === 3) {
      // Use the already parsed inline text so Markdown markup is not duplicated.
      const parsed = parseDocument(
        `# Import\n\n## Section\n\n${token.raw}\n\nContent.\n\n${definitions}`,
      );
      const block = parsed.sections[0].blocks[0];
      item = newText(
        block.type === "heading" ? plainText(block.text) : token.text,
      );
      if (block.type === "heading")
        item.headingMarkdown = formattedHeading(block.text);
      section.items.push(item);
    } else if (
      token.type === "paragraph" &&
      token.tokens.length === 1 &&
      token.tokens[0].type === "image"
    ) {
      const image = token.tokens[0];
      if (item?.type === "text" && !item.body) {
        const group: EditorItem = {
          id: item.id,
          type: "images",
          heading: item.heading,
          headingMarkdown: item.headingMarkdown,
          images: [],
        };
        section.items[section.items.length - 1] = group;
        item = group;
      }
      if (!item || item.type !== "images") {
        item = newImageGroup();
        section.items.push(item);
      }
      if (item.type === "images")
        item.images.push({
          id: crypto.randomUUID(),
          path: imagePath(image.href),
          caption: image.text,
        });
    } else {
      if (!item || item.type !== "text") {
        item = newText();
        section.items.push(item);
      }
      if (item.type === "text") item.body += `${token.raw.trim()}\n\n`;
    }
  }
  draft.introduction = draft.introduction.trim();
  for (const entry of draft.sections) {
    for (const part of entry.items) {
      if (part.type === "text")
        part.body = `${part.body.trim()}${definitions ? `\n\n${definitions}` : ""}`;
    }
  }
  if (definitions && draft.introduction)
    draft.introduction += `\n\n${definitions}`;
  const prototypeSections = draft.sections.filter(
    (entry) => entry.title === PROTOTYPE_SECTION,
  );
  const prototypeSection = prototypeSections[0];
  const headings = [
    "Target platforms",
    "Shared requirements",
    ...ENGINES.map((engine) => engine.label),
  ];
  if (
    prototypeSections.length === 1 &&
    prototypeSection.items.length > 0 &&
    prototypeSection.items.every(
      (part) => part.type === "text" && headings.includes(part.heading),
    ) &&
    new Set(prototypeSection.items.map((part) => part.heading)).size ===
      prototypeSection.items.length
  ) {
    const prototype: PrototypeRequirements = {
      sectionIndex: draft.sections.indexOf(prototypeSection),
      engines: [],
      platforms: [],
      customPlatform: "",
      details: {},
      shared: "",
    };
    for (const part of prototypeSection.items) {
      if (part.type !== "text") continue;
      const engine = ENGINES.find((entry) => entry.label === part.heading);
      if (engine) {
        prototype.engines.push(engine.id);
        prototype.details[engine.id] = part.body;
      } else if (part.heading === "Shared requirements") {
        prototype.shared = part.body;
      } else {
        const targets = part.body.split(/\n\s*\n/);
        prototype.platforms = targets.filter((target) =>
          PLATFORMS.some((platform) => platform === target),
        );
        prototype.customPlatform = targets
          .filter((target) => !prototype.platforms.includes(target))
          .join("\n\n");
      }
    }
    draft.prototype = prototype;
    draft.sections = draft.sections.filter(
      (entry) => entry !== prototypeSection,
    );
  }
  return draft;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readDraft(value: unknown): EditorDraft {
  if (
    !record(value) ||
    value.format !== "jeemzu-gdd-editor" ||
    value.version !== 1 ||
    !record(value.draft)
  ) {
    throw new Error("This ZIP contains an unsupported GDD editor draft.");
  }
  const data = value.draft;
  const ids = new Set<string>();
  function id(value: unknown): string {
    if (
      typeof value !== "string" ||
      !value ||
      value.length > 100 ||
      ids.has(value)
    )
      throw new Error("The draft contains invalid or duplicate item IDs.");
    ids.add(value);
    return value;
  }
  function text(value: unknown, maximum: number): string {
    if (typeof value !== "string" || value.length > maximum)
      throw new Error("The draft contains invalid or oversized fields.");
    return value;
  }
  if (!Array.isArray(data.sections) || data.sections.length > LIMITS.sections)
    throw new Error("Drafts support up to 40 sections.");
  let itemCount = 0;
  const sections = data.sections.map((entry): EditorSection => {
    if (!record(entry) || !Array.isArray(entry.items))
      throw new Error("Invalid section in draft.");
    itemCount += entry.items.length;
    if (itemCount > 400)
      throw new Error(
        "Drafts support up to 400 subsections and image categories.",
      );
    return {
      id: id(entry.id),
      title: text(entry.title, 100),
      items: entry.items.map((part): EditorItem => {
        if (!record(part)) throw new Error("Invalid subsection in draft.");
        const common = {
          id: id(part.id),
          heading: text(part.heading, 100),
          ...(part.headingMarkdown !== undefined
            ? { headingMarkdown: text(part.headingMarkdown, 3000) }
            : {}),
        };
        if (common.headingMarkdown && /[\r\n]/.test(common.headingMarkdown))
          throw new Error("Imported subheadings must use a single line.");
        if (part.type === "text")
          return {
            ...common,
            type: "text",
            body: text(part.body, LIMITS.characters),
          };
        if (
          part.type !== "images" ||
          !Array.isArray(part.images) ||
          part.images.length > 97
        )
          throw new Error("Invalid image category in draft.");
        return {
          ...common,
          type: "images",
          images: part.images.map((image): EditorImage => {
            if (!record(image)) throw new Error("Invalid image in draft.");
            return {
              id: id(image.id),
              path: imagePath(text(image.path, 300)),
              caption: text(image.caption, 400),
            };
          }),
        };
      }),
    };
  });
  return {
    title: text(data.title, 100),
    introduction: text(data.introduction, 2000),
    sections,
    ...(data.prototype !== undefined
      ? { prototype: readPrototype(data.prototype) }
      : {}),
  };
}

function readPrototype(value: unknown): PrototypeRequirements {
  if (
    !record(value) ||
    !Array.isArray(value.engines) ||
    !Array.isArray(value.platforms) ||
    !record(value.details)
  )
    throw new Error("Invalid prototype requirements in draft.");
  const engines: PrototypeRequirements["engines"] = [];
  for (const id of value.engines) {
    const engine = ENGINES.find((entry) => entry.id === id);
    if (!engine || engines.includes(engine.id))
      throw new Error("Invalid engines or platforms in draft.");
    engines.push(engine.id);
  }
  const platforms: string[] = [];
  for (const target of value.platforms) {
    const platform = PLATFORMS.find((entry) => entry === target);
    if (!platform || platforms.includes(platform))
      throw new Error("Invalid engines or platforms in draft.");
    platforms.push(platform);
  }
  if (
    engines.length !== value.engines.length ||
    platforms.length !== value.platforms.length ||
    typeof value.customPlatform !== "string" ||
    value.customPlatform.length > 1000 ||
    typeof value.shared !== "string" ||
    value.shared.length > LIMITS.characters ||
    (value.sectionIndex !== undefined &&
      (typeof value.sectionIndex !== "number" ||
        !Number.isInteger(value.sectionIndex) ||
        value.sectionIndex < 0 ||
        value.sectionIndex >= LIMITS.sections)) ||
    Object.keys(value.details).some(
      (key) => !ENGINES.some((engine) => engine.id === key),
    )
  )
    throw new Error("Invalid engines or platforms in draft.");
  const details: PrototypeRequirements["details"] = {};
  for (const engine of ENGINES) {
    const body = value.details[engine.id];
    if (body === undefined) continue;
    if (typeof body !== "string" || body.length > LIMITS.characters)
      throw new Error("Invalid engine requirements in draft.");
    details[engine.id] = body;
  }
  return {
    ...(typeof value.sectionIndex === "number"
      ? { sectionIndex: value.sectionIndex }
      : {}),
    engines,
    platforms,
    customPlatform: value.customPlatform,
    shared: value.shared,
    details,
  };
}

export function validateAsset(bytes: Uint8Array, path: string): void {
  if (bytes.length > LIMITS.image)
    throw new Error(`${path} exceeds the 10 MB image limit.`);
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (/\.png$/i.test(path) ? !png : !jpeg)
    throw new Error(`${path} must be a PNG or JPEG matching its extension.`);
  validateDimensions(bytes, path);
}

export function projectAssets(
  project: EditorProject,
): Record<string, Uint8Array> {
  const assets: Record<string, Uint8Array> = {};
  let total = 0;
  const paths = projectPaths(project.draft);
  if (paths.length > 97)
    throw new Error("Use no more than 97 image files per document.");
  for (const path of paths) {
    const bytes = project.assets[path];
    if (!bytes) throw new Error(`Missing image: ${path}`);
    validateAsset(bytes, path);
    assets[path] = bytes;
    total += bytes.length;
  }
  if (total > LIMITS.expanded - 2 * LIMITS.markdown)
    throw new Error("Images exceed the draft's 58 MB combined limit.");
  return assets;
}

export function saveProject(project: EditorProject): Uint8Array {
  const metadata = strToU8(
    JSON.stringify({
      format: "jeemzu-gdd-editor",
      version: 1,
      draft: project.draft,
    }),
  );
  if (metadata.length > LIMITS.markdown)
    throw new Error("The editable draft exceeds 1 MB.");
  readDraft(JSON.parse(new TextDecoder().decode(metadata)));
  const assets = projectAssets(project);
  const files: Record<string, Uint8Array> = {
    "editor.json": metadata,
    ...assets,
  };
  // The editor snapshot preserves incomplete fields; only PDF export requires completeness.
  const markdown = strToU8(draftMarkdown(project.draft, false));
  if (markdown.length > LIMITS.markdown)
    throw new Error("The Markdown export exceeds 1 MB.");
  files["gdd.md"] = markdown;
  const zip = zipSync(files);
  if (zip.length > LIMITS.archive)
    throw new Error(
      "The saved ZIP exceeds 25 MB. Remove or compress some images.",
    );
  return zip;
}

export function openProject(bytes: Uint8Array): EditorProject {
  const files = extractArchive(bytes);
  if (files["editor.json"]) {
    let value: unknown;
    try {
      value = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(files["editor.json"]),
      );
    } catch {
      throw new Error("The editor draft is not valid UTF-8 JSON.");
    }
    const project = { draft: readDraft(value), assets: files };
    return { ...project, assets: projectAssets(project) };
  }
  const imported = importArchive(bytes);
  return {
    draft: draftFromMarkdown(imported.markdown),
    assets: imported.images,
  };
}

export function filename(title: string): string {
  return (
    [...title]
      .map((char) => (char.charCodeAt(0) < 32 ? "-" : char))
      .join("")
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/[. ]+$/, "") || "Game"
  );
}
