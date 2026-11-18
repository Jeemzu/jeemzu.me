import { draftMarkdown, validateAsset, type EditorProject } from "./editor";
import { importDocument } from "./importDocument";
import { LIMITS } from "./document";
import type { AssistantReference } from "./assistant";

export const SOURCE_DOCUMENT_ACCEPT = ".pdf,.docx";

async function compressReferenceImage(file: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Reference images require canvas support.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Cannot encode reference image.")),
        "image/jpeg",
        0.75,
      ),
    );
    if (blob.size > 256 * 1024)
      throw new Error(
        "The compressed reference exceeds 256 KB. Select a smaller image.",
      );
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

function referenceText(project: EditorProject): string {
  const { draft } = project;
  const sections = draft.sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.type === "text"),
  }));
  if (
    !draft.introduction.trim() &&
    !sections.some((section) => section.items.some((item) => item.body.trim()))
  )
    return "";
  const text = draftMarkdown(
    { ...draft, prototype: undefined, sections },
    false,
  );
  if (text.length > 20000)
    throw new Error(
      "The reference exceeds 20,000 characters. Upload a focused excerpt instead.",
    );
  return text;
}

function referenceWarnings(warnings: string[]) {
  return warnings.filter(
    (warning) => !warning.startsWith("Review imported headings"),
  );
}

export async function importAssistantSourceDocument(file: File): Promise<{
  references: AssistantReference[];
  assets: Record<string, Uint8Array>;
  warnings: string[];
}> {
  if (!/\.(pdf|docx)$/i.test(file.name))
    throw new Error("Select a PDF or DOCX reference document.");
  if (file.name.length > 200)
    throw new Error("Reference filenames support up to 200 characters.");
  const { project, warnings } = await importDocument(file);
  const figures = project.draft.sections.flatMap((section) =>
    section.items.flatMap((item) =>
      item.type === "images"
        ? item.images.map((image) => ({
            path: image.path,
            context: `Source section: ${section.title}\nSource subsection: ${item.heading}\nSource caption: ${image.caption}`,
          }))
        : [],
    ),
  );
  if (figures.length > 4)
    throw new Error(
      "The reference document contains more than four images. Upload a focused excerpt instead.",
    );
  const common = { checkpoint: "document" as const, url: "" };
  const references: AssistantReference[] = [
    {
      ...common,
      id: crypto.randomUUID(),
      name: file.name,
      text: referenceText(project),
    },
  ];
  const assets: Record<string, Uint8Array> = {};
  for (const [index, figure] of figures.entries()) {
    const id = crypto.randomUUID();
    const imagePath = `images/assistant-${id}.jpg`;
    const mime = figure.path.endsWith(".png") ? "image/png" : "image/jpeg";
    assets[imagePath] = await compressReferenceImage(
      new Blob([Uint8Array.from(project.assets[figure.path]).buffer], {
        type: mime,
      }),
    );
    references.push({
      ...common,
      id,
      name: `Document image ${index + 1}`,
      text: figure.context,
      imagePath,
    });
  }
  return { references, assets, warnings: referenceWarnings(warnings) };
}

export async function importAssistantReference(
  file: File,
  checkpoint: number,
): Promise<{
  reference: AssistantReference;
  assets: Record<string, Uint8Array>;
  warnings: string[];
}> {
  const id = crypto.randomUUID();
  const common = { id, checkpoint, name: file.name, text: "", url: "" };
  if (file.name.length > 200)
    throw new Error("Reference filenames support up to 200 characters.");
  if (/\.(png|jpe?g)$/i.test(file.name)) {
    if (file.size > LIMITS.image)
      throw new Error("Reference images support up to 10 MB.");
    const original = new Uint8Array(await file.arrayBuffer());
    validateAsset(original, file.name);
    const path = `images/assistant-${id}.jpg`;
    return {
      reference: { ...common, imagePath: path },
      assets: { [path]: await compressReferenceImage(file) },
      warnings: [],
    };
  }
  if (!/\.(pdf|docx|md|markdown|txt)$/i.test(file.name))
    throw new Error(
      "Select PDF, DOCX, Markdown, text, PNG, or JPEG references.",
    );
  const imported = await importDocument(file);
  const text = referenceText(imported.project);
  if (!text)
    throw new Error(
      "The reference has no readable text. Upload its images separately.",
    );
  return {
    reference: { ...common, text },
    assets: {},
    warnings: referenceWarnings(imported.warnings),
  };
}
