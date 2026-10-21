import { LIMITS } from "./document";
import {
  canvasRaster,
  escapeMarkdown,
  type ImportImages,
} from "./importDocument";

export interface PdfTextLine {
  text: string;
  x: number;
  y: number;
  size: number;
}

interface PdfPageContent {
  lines: PdfTextLine[];
  images: { y: number; markdown: string }[];
  height: number;
}

export function pdfLines(
  items: {
    str: string;
    transform: number[];
    width: number;
    height: number;
  }[],
): PdfTextLine[] {
  const rows: { line: PdfTextLine; end: number }[] = [];
  for (const item of [...items].sort(
    (a, b) =>
      b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
  )) {
    if (!item.str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const size =
      Math.abs(item.height) || Math.hypot(item.transform[2], item.transform[3]);
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.line.y - y) <= Math.max(2, size * 0.2)) {
      const separator =
        x - row.end > size * 2 ? " | " : x - row.end > 0.5 ? " " : "";
      row.line.text += separator + item.str;
      row.line.size = Math.max(row.line.size, size);
      row.end = x + item.width;
    } else {
      rows.push({ line: { text: item.str, x, y, size }, end: x + item.width });
    }
  }
  return rows.map(({ line }) => ({ ...line, text: line.text.trim() }));
}

export function pdfMarkdown(
  pages: PdfPageContent[],
  fallbackTitle: string,
): string {
  const first = pages[0];
  const sizes = pages
    .flatMap((page) => page.lines.map((line) => line.size))
    .sort((a, b) => a - b);
  const bodySize = sizes[Math.floor(sizes.length / 2)] || 12;
  const biggest =
    first?.lines.reduce((max, line) => Math.max(max, line.size), 0) ?? 0;
  const titleLines =
    first?.lines.filter(
      (line) => line.size >= biggest * 0.6 && line.size > bodySize * 1.5,
    ) ?? [];
  const title = titleLines.length
    ? titleLines.map((line) => line.text).join(" ")
    : fallbackTitle;
  const repeated = new Map<string, Set<number>>();
  const signature = (line: PdfTextLine) =>
    line.text.replace(/\d+/g, "#").toLowerCase();
  pages.forEach((page, index) => {
    for (const line of page.lines) {
      if (line.y < page.height * 0.1 || line.y > page.height * 0.9) {
        const key = signature(line);
        if (!repeated.has(key)) repeated.set(key, new Set());
        repeated.get(key)?.add(index);
      }
    }
  });
  const sectionMarker = /^\d{1,2}\s*[/–-]\s*([A-Z][A-Z &]+)$/;
  const hasNumberedSections = pages.some((page) =>
    page.lines.some((line) => sectionMarker.test(line.text)),
  );
  const headingSizes = pages.flatMap((page, index) =>
    page.lines
      .filter(
        (line) =>
          !(index === 0 && titleLines.includes(line)) &&
          line.size > bodySize * 1.3 &&
          line.y >= page.height * 0.1 &&
          line.y <= page.height * 0.9,
      )
      .map((line) => line.size),
  );
  const primaryHeadingSize = headingSizes.reduce(
    (max, size) => Math.max(max, size),
    bodySize * 1.3,
  );
  const output = [`# ${escapeMarkdown(title)}`];
  let hasSection = false;
  let lastSection = "";
  for (const [pageIndex, page] of pages.entries()) {
    const elements = [
      ...page.lines.map((line) => ({ y: line.y, line })),
      ...page.images.map((image) => ({ y: image.y, image })),
    ].sort((a, b) => b.y - a.y);
    let paragraph = "";
    let previous: PdfTextLine | undefined;
    function section() {
      if (!hasSection) {
        output.push("## Imported content");
        hasSection = true;
      }
    }
    function flush() {
      if (paragraph) {
        section();
        output.push(paragraph);
        paragraph = "";
      }
    }
    for (const element of elements) {
      if ("image" in element) {
        flush();
        section();
        output.push(element.image.markdown);
        previous = undefined;
        continue;
      }
      const line = element.line;
      if (pageIndex === 0 && titleLines.includes(line)) continue;
      const numberedSection = sectionMarker.exec(line.text);
      if (
        !numberedSection &&
        (line.y < page.height * 0.1 || line.y > page.height * 0.9) &&
        (/^\d+\s*(?:\/\s*\d+)?$/.test(line.text) ||
          (pages.length > 1 &&
            (repeated.get(signature(line))?.size ?? 0) >=
              Math.max(2, Math.ceil(pages.length / 2))))
      )
        continue;
      if (
        numberedSection ||
        (line.size > bodySize * 1.3 && line.text.length <= 100)
      ) {
        flush();
        const text = numberedSection ? numberedSection[1] : line.text;
        if (
          numberedSection ||
          (!hasNumberedSections && line.size >= primaryHeadingSize * 0.9) ||
          !hasSection
        ) {
          if (text !== lastSection) output.push(`## ${escapeMarkdown(text)}`);
          hasSection = true;
          lastSection = text;
        } else {
          output.push(`### ${escapeMarkdown(text)}`);
        }
        previous = undefined;
        continue;
      }
      const list = /^([•●▪\uFFFD]|[-*]|\d+[.)])\s*/.exec(line.text);
      if (
        list ||
        (previous &&
          previous.y - line.y > Math.max(previous.size, line.size) * 1.65)
      )
        flush();
      const text = list
        ? `${/^\d/.test(list[1]) ? list[1].replace(")", ".") : "-"} ${escapeMarkdown(line.text.slice(list[0].length))}`
        : escapeMarkdown(line.text);
      paragraph += `${paragraph ? " " : ""}${text}`;
      previous = line;
    }
    flush();
  }
  return output.join("\n\n") + "\n";
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function importPdf(
  bytes: Uint8Array,
  title: string,
  images: ImportImages,
  warnings: string[],
): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } =
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: bytes,
    useWasm: false,
    useWorkerFetch: false,
    stopAtErrors: true,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
  });
  task.onPassword = () => {
    void task.destroy();
  };
  const pages: PdfPageContent[] = [];
  let textLength = 0;
  let imageCount = 0;
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100)
      throw new Error("PDF import supports up to 100 pages.");
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const text = await page.getTextContent();
      const lines = pdfLines(text.items.filter((item) => "str" in item));
      textLength += lines.reduce((sum, line) => sum + line.text.length, 0);
      if (textLength > LIMITS.characters)
        throw new Error("The PDF exceeds 150,000 text characters.");
      if (!lines.length)
        warnings.push(
          `Page ${number} has no selectable text; OCR is not available.`,
        );
      const operators = await page.getOperatorList();
      if (operators.fnArray.length > 1_000_000)
        throw new Error(`Page ${number} is too complex to import.`);
      const pageImages: PdfPageContent["images"] = [];
      let transform = [1, 0, 0, 1, 0, 0];
      const stack: number[][] = [];
      for (let index = 0; index < operators.fnArray.length; index++) {
        const op = operators.fnArray[index];
        const args: unknown[] = operators.argsArray[index] ?? [];
        if (op === pdfjs.OPS.save) stack.push([...transform]);
        else if (op === pdfjs.OPS.restore)
          transform = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (op === pdfjs.OPS.transform) {
          if (
            args.length !== 6 ||
            !args.every((value) => typeof value === "number")
          )
            throw new Error("The PDF contains an invalid image transform.");
          transform = pdfjs.Util.transform(transform, args);
        } else if (
          op === pdfjs.OPS.paintImageXObject ||
          op === pdfjs.OPS.paintInlineImageXObject
        ) {
          if (++imageCount > 97)
            throw new Error("The PDF contains more than 97 image placements.");
          let value: unknown = args[0];
          if (op === pdfjs.OPS.paintImageXObject) {
            if (typeof value !== "string")
              throw new Error("The PDF contains an invalid image reference.");
            const objects = value.startsWith("g_")
              ? page.commonObjs
              : page.objs;
            const id = value;
            value = await new Promise<unknown>((resolve) =>
              objects.get(id, resolve),
            );
          }
          if (
            !record(value) ||
            typeof value.width !== "number" ||
            typeof value.height !== "number"
          )
            throw new Error(`Cannot extract an image on page ${number}.`);
          const { width, height } = value;
          if (
            !Number.isInteger(width) ||
            !Number.isInteger(height) ||
            width < 1 ||
            height < 1 ||
            width > 16_000 ||
            height > 16_000 ||
            width * height > LIMITS.pixels
          )
            throw new Error(
              `An image on page ${number} exceeds the supported dimensions.`,
            );
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context)
            throw new Error("PDF image extraction requires canvas support.");
          if (value.bitmap instanceof ImageBitmap) {
            context.drawImage(value.bitmap, 0, 0);
          } else {
            const data = value.data;
            if (
              !(data instanceof Uint8Array) &&
              !(data instanceof Uint8ClampedArray)
            )
              throw new Error(`Unsupported image encoding on page ${number}.`);
            const rgba = new Uint8ClampedArray(width * height * 4);
            if (value.kind === pdfjs.ImageKind.RGBA_32BPP) {
              if (data.length !== rgba.length)
                throw new Error("Incomplete PDF image data.");
              rgba.set(data);
            } else if (value.kind === pdfjs.ImageKind.RGB_24BPP) {
              if (data.length !== width * height * 3)
                throw new Error("Incomplete PDF image data.");
              for (let pixel = 0; pixel < width * height; pixel++) {
                rgba[pixel * 4] = data[pixel * 3];
                rgba[pixel * 4 + 1] = data[pixel * 3 + 1];
                rgba[pixel * 4 + 2] = data[pixel * 3 + 2];
                rgba[pixel * 4 + 3] = 255;
              }
            } else if (value.kind === pdfjs.ImageKind.GRAYSCALE_1BPP) {
              const stride = Math.ceil(width / 8);
              if (data.length !== stride * height)
                throw new Error("Incomplete PDF image data.");
              for (let y = 0; y < height; y++)
                for (let x = 0; x < width; x++) {
                  const offset = (y * width + x) * 4;
                  const shade =
                    data[y * stride + (x >> 3)] & (128 >> (x & 7)) ? 255 : 0;
                  rgba.set([shade, shade, shade, 255], offset);
                }
            } else
              throw new Error(`Unsupported image encoding on page ${number}.`);
            context.putImageData(new ImageData(rgba, width, height), 0, 0);
          }
          const encoded = await canvasRaster(canvas);
          const path = images.add(encoded.bytes, encoded.extension);
          const top = Math.max(
            transform[5],
            transform[5] + transform[3],
            transform[5] + transform[1],
            transform[5] + transform[1] + transform[3],
          );
          pageImages.push({
            y: top,
            markdown: `![Reference ${imageCount}. Source: PDF page ${number}.](${path})`,
          });
          canvas.width = canvas.height = 0;
        } else if (
          [
            pdfjs.OPS.paintImageMaskXObject,
            pdfjs.OPS.paintImageMaskXObjectRepeat,
            pdfjs.OPS.paintImageMaskXObjectGroup,
            pdfjs.OPS.paintImageXObjectRepeat,
          ].includes(op)
        ) {
          throw new Error(
            `Page ${number} contains grouped or masked images that cannot be extracted. Export to DOCX or flatten those images first.`,
          );
        }
      }
      pages.push({
        lines,
        images: pageImages,
        height: page.view[3] - page.view[1],
      });
      page.cleanup();
    }
    if (!textLength)
      throw new Error(
        "This PDF has no selectable text. Run OCR before importing it.",
      );
    warnings.push(
      "PDF layout is inferred. Check reading order and tables; vector artwork is not extracted. Raster images are re-encoded as PNG or high-quality JPEG with source-page captions.",
    );
    return pdfMarkdown(pages, title);
  } catch (cause) {
    if (cause instanceof Error && /password|destroyed/i.test(cause.message))
      throw new Error("Remove the PDF password before importing.");
    throw cause;
  } finally {
    await task.destroy();
  }
}
