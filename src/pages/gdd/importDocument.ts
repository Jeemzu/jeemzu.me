import { Lexer, type MarkedToken } from "marked";
import { Unzip, UnzipInflate, strToU8, zipSync } from "fflate";
import { LIMITS } from "./document";
import {
  draftFromMarkdown,
  draftMarkdown,
  openProject,
  projectAssets,
  readDraft,
  saveProject,
  validateAsset,
  type EditorProject,
} from "./editor";

export const DOCUMENT_ACCEPT = ".zip,.pdf,.docx,.md,.markdown,.txt,.html,.htm";

export interface DocumentImport {
  project: EditorProject;
  warnings: string[];
  converted: boolean;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>!~#|]/g, "\\$&");
}

export function normalizeMarkdown(
  source: string,
  fallbackTitle: string,
): string {
  if (source.length > LIMITS.characters)
    throw new Error("The document exceeds 150,000 characters.");
  const tokens = Lexer.lex(source.replace(/^\uFEFF/, "").trim(), {
    gfm: true,
  }) as MarkedToken[];
  const first = tokens.findIndex((token) => token.type !== "space");
  const title = tokens[first];
  let heading = `# ${escapeMarkdown(fallbackTitle)}`;
  if (title?.type === "heading" && title.depth === 1) {
    heading = title.raw.trim();
    tokens.splice(first, 1);
  }
  const sectionIndex = tokens.findIndex((token) => token.type === "heading");
  const prefix = tokens.slice(
    0,
    sectionIndex < 0 ? tokens.length : sectionIndex,
  );
  const cover = prefix.filter(
    (token) => token.type !== "space" && token.type !== "def",
  );
  const canUseCover =
    sectionIndex >= 0 &&
    cover.length <= 4 &&
    cover.every(
      (token) =>
        token.type === "paragraph" &&
        !token.tokens.some((child) => child.type === "image"),
    ) &&
    cover.map((token) => token.raw).join("").length <= 800;
  const body = tokens
    .map((token, index) => {
      let raw = token.raw;
      if (token.type === "heading")
        raw = `${"#".repeat(token.depth <= 2 ? 2 : 3)} ${token.text}\n\n`;
      if (
        index === 0 &&
        !canUseCover &&
        (sectionIndex !== 0 ||
          tokens[0].type !== "heading" ||
          tokens[0].depth > 2)
      )
        raw = `## Imported content\n\n${raw}`;
      if (
        canUseCover &&
        index === sectionIndex &&
        token.type === "heading" &&
        token.depth > 2
      )
        raw = `## Imported content\n\n${raw}`;
      return raw;
    })
    .join("");
  return `${heading}\n\n${body.trim()}\n`;
}

export class ImportImages {
  readonly assets: Record<string, Uint8Array> = {};
  private total = 0;

  add(bytes: Uint8Array, extension: "png" | "jpg"): string {
    const count = Object.keys(this.assets).length;
    if (count >= 97)
      throw new Error("Use no more than 97 image files per document.");
    const path = `images/reference-${String(count + 1).padStart(2, "0")}.${extension}`;
    validateAsset(bytes, path);
    this.total += bytes.length;
    if (this.total > LIMITS.expanded - 2 * LIMITS.markdown)
      throw new Error("Extracted images exceed the 58 MB combined limit.");
    this.assets[path] = bytes;
    return path;
  }

  async addRaster(bytes: Uint8Array, mime: string): Promise<string> {
    if (bytes.length > LIMITS.image)
      throw new Error("An embedded image exceeds the 10 MB limit.");
    if (mime === "image/png") return this.add(bytes, "png");
    if (mime === "image/jpeg") return this.add(bytes, "jpg");
    if (!["image/gif", "image/webp", "image/bmp"].includes(mime))
      throw new Error(
        `Unsupported embedded image format: ${mime}. Use PNG or JPEG.`,
      );
    const bitmap = await createImageBitmap(
      new Blob([Uint8Array.from(bytes).buffer], { type: mime }),
    );
    try {
      if (bitmap.width * bitmap.height > LIMITS.pixels)
        throw new Error("An embedded image exceeds 24 megapixels.");
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image conversion requires canvas support.");
      context.drawImage(bitmap, 0, 0);
      return this.add(await canvasPng(canvas), "png");
    } finally {
      bitmap.close();
    }
  }
}

export async function canvasPng(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Cannot encode an extracted image.")),
      "image/png",
    ),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export async function canvasRaster(
  canvas: HTMLCanvasElement,
): Promise<{ bytes: Uint8Array; extension: "png" | "jpg" }> {
  const png = await canvasPng(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image conversion requires canvas support.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4)
    if (pixels[index] !== 255) return { bytes: png, extension: "png" };
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Cannot encode an extracted image.")),
      "image/jpeg",
      0.95,
    ),
  );
  if (jpeg.size < png.length * 0.8)
    return {
      bytes: new Uint8Array(await jpeg.arrayBuffer()),
      extension: "jpg",
    };
  return { bytes: png, extension: "png" };
}

// Inspect expanded DOCX bytes before handing the package to Mammoth's ZIP reader.
export function validateDocx(data: Uint8Array): void {
  if (data[0] !== 0x50 || data[1] !== 0x4b)
    throw new Error("Select a valid DOCX file.");
  const names = new Set<string>();
  let total = 0;
  let pending = 0;
  const unzip = new Unzip((file) => {
    if (
      names.has(file.name) ||
      file.name.startsWith("/") ||
      /[\\:]/.test(file.name) ||
      file.name.split("/").some((part) => part === ".." || part === ".")
    )
      throw new Error("The DOCX contains an unsafe or duplicate ZIP entry.");
    names.add(file.name);
    if (names.size > 2000)
      throw new Error("The DOCX contains more than 2,000 entries.");
    if (file.name.endsWith("/")) return;
    if ((file.originalSize ?? 0) > LIMITS.expanded)
      throw new Error("The expanded DOCX exceeds 60 MB.");
    pending++;
    file.ondata = (error, chunk, final) => {
      if (error) throw new Error(`Cannot read DOCX: ${error.message}`);
      total += chunk.length;
      if (total > LIMITS.expanded)
        throw new Error("The expanded DOCX exceeds 60 MB.");
      if (final) pending--;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < data.length; offset += 1024)
    unzip.push(
      data.subarray(offset, offset + 1024),
      offset + 1024 >= data.length,
    );
  if (
    pending ||
    !names.has("word/document.xml") ||
    !names.has("[Content_Types].xml")
  )
    throw new Error("The DOCX is incomplete or missing its document.");
}

export async function importDocument(file: File): Promise<DocumentImport> {
  if (!/\.(zip|pdf|docx|md|markdown|txt|html?)$/i.test(file.name))
    throw new Error("Select a ZIP, PDF, DOCX, Markdown, text, or HTML file.");
  if (file.size > LIMITS.archive)
    throw new Error("The file exceeds the 25 MB limit.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.zip$/i.test(file.name))
    return { project: openProject(bytes), warnings: [], converted: false };
  const title = file.name.replace(/\.[^.]+$/, "").trim() || "Imported game";
  const images = new ImportImages();
  const warnings: string[] = [];
  let markdown: string;
  if (/\.pdf$/i.test(file.name)) {
    const { importPdf } = await import("./importPdf");
    markdown = await importPdf(bytes, title, images, warnings);
  } else if (/\.docx$/i.test(file.name)) {
    validateDocx(bytes);
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.convertToHtml(
      { arrayBuffer: Uint8Array.from(bytes).buffer },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        convertImage: mammoth.images.imgElement(async (image) => ({
          src: await images.addRaster(
            new Uint8Array(await image.readAsArrayBuffer()),
            image.contentType,
          ),
        })),
      },
    );
    const failures = result.messages.filter(
      (message) => message.type === "error",
    );
    if (failures.length)
      throw new Error(failures.map((message) => message.message).join("; "));
    warnings.push(...result.messages.map((message) => message.message));
    const { htmlMarkdown } = await import("./importHtml");
    markdown = await htmlMarkdown(result.value, images, warnings);
  } else {
    if (bytes.length > LIMITS.markdown)
      throw new Error("Text documents must be smaller than 1 MB.");
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Save text, Markdown, and HTML files as UTF-8.");
    }
    if (/\.html?$/i.test(file.name)) {
      const { htmlMarkdown } = await import("./importHtml");
      markdown = await htmlMarkdown(text, images, warnings);
    } else if (/\.txt$/i.test(file.name)) {
      markdown = escapeMarkdown(text);
    } else {
      markdown = text;
    }
  }
  if (!markdown.trim())
    throw new Error("The document contains no readable content.");
  const project = {
    draft: draftFromMarkdown(normalizeMarkdown(markdown, title)),
    assets: images.assets,
  };
  projectAssets(project);
  draftMarkdown(project.draft);
  readDraft({ format: "jeemzu-gdd-editor", version: 1, draft: project.draft });
  warnings.push(
    "Review imported headings, text, image placement, and captions before generating.",
  );
  return { project, warnings: [...new Set(warnings)], converted: true };
}

export function markdownArchive(project: EditorProject): Uint8Array {
  if (project.draft.assistant) return saveProject(project);
  const markdown = strToU8(draftMarkdown(project.draft));
  if (markdown.length > LIMITS.markdown)
    throw new Error("The Markdown export exceeds 1 MB.");
  const zip = zipSync({ "gdd.md": markdown, ...projectAssets(project) });
  if (zip.length > LIMITS.archive)
    throw new Error("The ZIP exceeds 25 MB. Remove or compress some images.");
  return zip;
}
