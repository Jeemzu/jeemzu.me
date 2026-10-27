import { draftMarkdown, validateAsset } from "./editor";
import { importDocument } from "./importDocument";
import { LIMITS } from "./document";
import type { AssistantReference } from "./assistant";

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
      const path = `images/assistant-${id}.jpg`;
      return {
        reference: { ...common, imagePath: path },
        assets: { [path]: new Uint8Array(await blob.arrayBuffer()) },
        warnings: [],
      };
    } finally {
      bitmap.close();
    }
  }
  if (!/\.(pdf|docx|md|markdown|txt)$/i.test(file.name))
    throw new Error(
      "Select PDF, DOCX, Markdown, text, PNG, or JPEG references.",
    );
  const imported = await importDocument(file);
  const draft = {
    ...imported.project.draft,
    prototype: undefined,
    sections: imported.project.draft.sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.type === "text"),
    })),
  };
  const text = draftMarkdown(draft, false);
  if (
    !draft.introduction.trim() &&
    !draft.sections.some((section) =>
      section.items.some((item) => item.type === "text" && item.body.trim()),
    )
  )
    throw new Error(
      "The reference has no readable text. Upload its images separately.",
    );
  if (text.length > 20000)
    throw new Error(
      "The reference exceeds 20,000 characters. Upload a focused excerpt instead.",
    );
  return {
    reference: { ...common, text },
    assets: {},
    warnings: imported.warnings.filter(
      (warning) => !warning.startsWith("Review imported headings"),
    ),
  };
}
