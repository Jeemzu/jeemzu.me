import type { EditorDraft, EditorItem, EditorProject } from "./editor";
import {
  GDD_SUBJECTS,
  migrateEditorProject,
  orderedGddBlocks,
  readGddCanvasProject,
  structureHasOverlap,
  type GddBlockLayout,
  type GddCanvasProject,
  type GddProjectAsset,
  type GddSubjectBlock,
  type GddSubjectMapping,
  type GddSubsectionBlock,
} from "./projectModel";

function decodeBase64(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("The project contains an invalid embedded image.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  return btoa(binary);
}

function subjectLabel(subjectId: string): string {
  return (
    GDD_SUBJECTS.find((subject) => subject.id === subjectId)?.label ??
    "Imported content"
  );
}

export function gddProjectTitle(project: GddCanvasProject): string {
  const block = project.blocks.blocks.find(
    (entry) => entry.subjectId === "game-title-description",
  );
  return block?.fields.title?.trim() || "Untitled GDD";
}

export function canvasToEditorProject(
  project: GddCanvasProject,
): EditorProject {
  const ordered = orderedGddBlocks(project.blocks);
  const titleBlock = ordered.find(
    (block) => block.subjectId === "game-title-description",
  );
  const technicalIndex = ordered.findIndex(
    (block) => block.subjectId === "prototype-technical-requirements",
  );
  const contentBlocks = ordered.filter(
    (block) =>
      block.subjectId !== "game-title-description" &&
      block.subjectId !== "prototype-technical-requirements",
  );
  const sections = contentBlocks.map(
    (block): EditorDraft["sections"][number] => {
      const items: EditorItem[] = Object.entries(block.fields).map(
        ([heading, body]) => ({
          id: `main-field:${block.id}:${Object.keys(block.fields).indexOf(heading)}`,
          type: "text",
          heading,
          body,
        }),
      );
      for (const subsection of orderedGddBlocks(block.subsections)) {
        items.push(
          typeof subsection.content === "string"
            ? {
                id: subsection.id,
                heading: subsection.heading,
                ...(subsection.headingMarkdown
                  ? { headingMarkdown: subsection.headingMarkdown }
                  : {}),
                type: "text",
                body: subsection.content,
              }
            : {
                id: subsection.id,
                heading: subsection.heading,
                ...(subsection.headingMarkdown
                  ? { headingMarkdown: subsection.headingMarkdown }
                  : {}),
                type: "images",
                images: subsection.content.images,
              },
        );
      }
      return {
        id: block.id,
        title: subjectLabel(block.subjectId),
        items,
      };
    },
  );
  const prototypeBlock = ordered.find(
    (block) => block.subjectId === "prototype-technical-requirements",
  );
  const prototypeSectionIndex =
    technicalIndex < 0
      ? contentBlocks.length
      : ordered
          .slice(0, technicalIndex)
          .filter(
            (block) =>
              block.subjectId !== "game-title-description" &&
              block.subjectId !== "prototype-technical-requirements",
          ).length;
  const prototype = prototypeBlock?.prototype
    ? {
        ...prototypeBlock.prototype,
        sectionIndex: prototypeSectionIndex,
      }
    : undefined;
  const assets = Object.fromEntries(
    Object.entries(project.assets).map(([path, asset]) => [
      path,
      decodeBase64(asset.base64),
    ]),
  );
  return {
    draft: {
      title: titleBlock?.fields.title ?? "",
      introduction: titleBlock?.fields.description ?? "",
      sections,
      ...(prototype ? { prototype } : {}),
      ...(project.assistant ? { assistant: project.assistant } : {}),
      ...(project.guidedAssistant
        ? { guidedAssistant: project.guidedAssistant }
        : {}),
    },
    assets,
  };
}

function freeLayout(
  layout: GddBlockLayout,
  blocks: readonly { layout: GddBlockLayout }[],
): GddBlockLayout {
  if (!structureHasOverlap([...blocks, { layout }])) return layout;
  const width = layout.width;
  const height = layout.height;
  for (let index = 0; index < 1000; index++) {
    const candidate = {
      ...layout,
      x: width / 2 + (index % 3) * (width + 40),
      y: height / 2 + Math.floor(index / 3) * (height + 40),
    };
    if (!structureHasOverlap([...blocks, { layout: candidate }]))
      return candidate;
  }
  throw new Error("Could not place an imported block without overlap.");
}

function preserveSubsectionLayout(
  previous: readonly GddSubsectionBlock[],
  next: GddSubsectionBlock[],
): GddSubsectionBlock[] {
  const used = new Set<string>();
  const arranged: GddSubsectionBlock[] = [];
  for (const block of next) {
    const match = previous.find(
      (candidate) =>
        !used.has(candidate.id) &&
        (candidate.id === block.id ||
          (block.subjectId
            ? candidate.subjectId === block.subjectId
            : candidate.heading === block.heading)),
    );
    if (match) used.add(match.id);
    const layout = freeLayout(match?.layout ?? block.layout, arranged);
    arranged.push({
      ...block,
      ...(match ? { style: match.style } : {}),
      layout,
    });
  }
  return arranged.map((block, order) => ({ ...block, order }));
}

export function mergeEditorProjectIntoCanvas(
  current: GddCanvasProject,
  updated: EditorProject,
  mappings: GddSubjectMapping = {},
): GddCanvasProject {
  const migrated = migrateEditorProject(updated, mappings);
  const previousBlocks = new Map(
    current.blocks.blocks.map((block) => [block.subjectId, block]),
  );
  const arranged: GddSubjectBlock[] = [];
  for (const block of orderedGddBlocks(migrated.blocks)) {
    const previous = previousBlocks.get(block.subjectId);
    const fields = { ...(previous?.fields ?? {}), ...block.fields };
    const contentSubsections = [...block.subsections.blocks];
    if (previous) {
      for (const [heading, value] of Object.entries(previous.fields)) {
        const index = contentSubsections.findIndex(
          (subsection) =>
            subsection.heading === heading &&
            typeof subsection.content === "string",
        );
        if (index >= 0) {
          fields[heading] = contentSubsections[index].content as string;
          contentSubsections.splice(index, 1);
        } else {
          fields[heading] = value;
        }
      }
    }
    const subsections = preserveSubsectionLayout(
      previous?.subsections.blocks ?? [],
      contentSubsections,
    );
    const layout = freeLayout(
      previous?.layout ?? block.layout,
      arranged,
    );
    arranged.push({
      ...block,
      fields,
      ...(previous ? { style: previous.style } : {}),
      layout,
      subsections: {
        orderMode: previous?.subsections.orderMode ?? block.subsections.orderMode,
        blocks: subsections,
      },
    });
  }
  return {
    ...migrated,
    blocks: {
      orderMode: current.blocks.orderMode,
      blocks: arranged.map((block, order) => ({ ...block, order })),
    },
  };
}

export function canvasToJson(project: GddCanvasProject): string {
  return JSON.stringify(project, null, 2);
}

export function canvasFromJson(json: string): GddCanvasProject {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("The project file is not valid JSON.");
  }
  return readGddCanvasProject(value);
}

export function assetsForCanvasProject(
  assets: Record<string, Uint8Array>,
): Record<string, GddProjectAsset> {
  return Object.fromEntries(
    Object.entries(assets).map(([path, bytes]) => [
      path,
      {
        mediaType: /\.png$/i.test(path)
          ? ("image/png" as const)
          : ("image/jpeg" as const),
        base64: encodeBase64(bytes),
      },
    ]),
  );
}
