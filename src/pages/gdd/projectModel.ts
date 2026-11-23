import { LIMITS, imagePath } from "./document";
import {
  projectAssets,
  readDraft,
  type EditorDraft,
  type EditorImage,
  type EditorItem,
  type EditorProject,
} from "./editor";
import { readGuidedAssistant, type GuidedAssistantState } from "./assistantGuided";
import { readWorkflow, type AssistantWorkflow } from "./assistant";
import {
  ENGINES,
  type PrototypeRequirements,
} from "./prototype";

export const GDD_SUBJECTS = [
  {
    id: "game-title-description",
    label: "Game Title and Description",
    subsections: [],
  },
  {
    id: "game-direction",
    label: "Game direction",
    subsections: [
      { id: "vision-player-experience", label: "Vision and player experience" },
      { id: "differentiators", label: "What distinguishes the game" },
    ],
  },
  {
    id: "world-progression",
    label: "World and progression",
    subsections: [
      { id: "setting-narrative", label: "Setting and narrative" },
      { id: "progression", label: "Progression" },
    ],
  },
  {
    id: "core-gameplay",
    label: "Core gameplay",
    subsections: [
      { id: "core-loop", label: "Core loop" },
      { id: "supporting-systems", label: "Supporting systems" },
    ],
  },
  {
    id: "combat-character-systems",
    label: "Combat and character systems",
    subsections: [
      { id: "combat", label: "Combat" },
      { id: "character-customization", label: "Character customization" },
    ],
  },
  {
    id: "presentation-interaction",
    label: "Presentation and interaction",
    subsections: [
      { id: "art-direction", label: "Art direction" },
      { id: "camera-interface", label: "Camera and interface" },
      { id: "audio-animation", label: "Audio and animation" },
      { id: "visual-references", label: "Visual references", kind: "images" },
    ],
  },
  {
    id: "implementation-overview",
    label: "Implementation overview",
    subsections: [
      { id: "systems-technology", label: "Systems and technology" },
      { id: "controls-save-data", label: "Controls and save data" },
    ],
  },
  {
    id: "first-playable-slice",
    label: "First playable slice",
    subsections: [
      { id: "scope", label: "Scope" },
      { id: "tutorial-sequence", label: "Tutorial sequence" },
      { id: "completion-requirements", label: "Completion requirements" },
    ],
  },
  {
    id: "audience-release",
    label: "Audience and release",
    subsections: [
      { id: "target-audience", label: "Target audience" },
      { id: "platforms-monetization", label: "Platforms and monetization" },
    ],
  },
  {
    id: "prototype-technical-requirements",
    label: "Prototype and Technical Requirements",
    subsections: [
      { id: "target-platforms", label: "Target platforms" },
      { id: "shared-requirements", label: "Shared requirements" },
      ...ENGINES.map((engine) => ({
        id: `engine-${engine.id}`,
        label: engine.label,
      })),
    ],
  },
] as const;

export type GddSubjectId = (typeof GDD_SUBJECTS)[number]["id"];
export type GddSubject = (typeof GDD_SUBJECTS)[number];
export type GddSubsectionSubjectId = GddSubject["subsections"][number]["id"];
export type GddBorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";
export type GddRotation = 0 | 90 | 180 | 270;

export const GDD_CANVAS_GRID_SIZE = 24;
export const GDD_CANVAS_CONTACT_EPSILON = 0.000001;
export const GDD_BLOCK_COLORS = [
  "#F5F1E8",
  "#E9EFE7",
  "#F9ECEB",
  "#E7F0F5",
  "#FAF3DC",
  "#F1EDF7",
] as const;

export interface GddBlockLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: GddRotation;
}

export interface GddBlockStyle {
  backgroundColor: string;
  borderStyle: GddBorderStyle;
}

export interface GddCanvasStructure<TBlock> {
  orderMode: "spatial" | "manual";
  blocks: TBlock[];
}

export interface GddSubsectionBlock {
  id: string;
  order: number;
  layout: GddBlockLayout;
  style: GddBlockStyle;
  heading: string;
  subjectId?: GddSubsectionSubjectId;
  headingMarkdown?: string;
  content: string | GddImageGroupContent;
}

export interface GddImageGroupContent {
  type: "images";
  images: EditorImage[];
}

export interface GddSubjectBlock {
  id: string;
  subjectId: GddSubjectId;
  order: number;
  layout: GddBlockLayout;
  style: GddBlockStyle;
  fields: Record<string, string>;
  prototype?: PrototypeRequirements;
  subsections: GddCanvasStructure<GddSubsectionBlock>;
}

export interface GddProjectAsset {
  mediaType: "image/png" | "image/jpeg";
  base64: string;
}

export interface GddCanvasProject {
  format: "jeemzu-gdd-canvas";
  version: 1;
  blocks: GddCanvasStructure<GddSubjectBlock>;
  assets: Record<string, GddProjectAsset>;
  assistant?: AssistantWorkflow;
  guidedAssistant?: GuidedAssistantState;
}

export type GddSubjectMapping = Record<string, GddSubjectId>;

const SUBJECT_BY_LABEL = new Map<string, GddSubject>(
  GDD_SUBJECTS.map((subject) => [subject.label, subject]),
);

export function unmappedEditorSections(
  draft: EditorDraft,
): EditorDraft["sections"] {
  return draft.sections.filter(
    (section) => !SUBJECT_BY_LABEL.has(section.title),
  );
}

function getSubject(subjectId: GddSubjectId): GddSubject {
  const subject = GDD_SUBJECTS.find((entry) => entry.id === subjectId);
  if (!subject) throw new Error(`Unknown GDD subject: ${subjectId}`);
  return subject;
}

function defaultLayout(index: number, blockSize: "subject" | "subsection") {
  const width = blockSize === "subject" ? 280 : 220;
  const height = blockSize === "subject" ? 180 : 130;
  const columns = 3;
  const columnGap = blockSize === "subject" ? 320 : 260;
  const rowGap = blockSize === "subject" ? 220 : 170;
  return {
    x: width / 2 + (index % columns) * columnGap,
    y:
      height / 2 +
      Math.floor(index / columns) * rowGap,
    width,
    height,
    rotation: 0 as const,
  };
}

function defaultStyle(index: number): GddBlockStyle {
  return {
    backgroundColor: GDD_BLOCK_COLORS[index % GDD_BLOCK_COLORS.length],
    borderStyle: "solid",
  };
}

export function newGddCanvasProject(): GddCanvasProject {
  return {
    format: "jeemzu-gdd-canvas",
    version: 1,
    blocks: { orderMode: "spatial", blocks: [] },
    assets: {},
  };
}

export function newGddSubjectBlock(
  subjectId: GddSubjectId,
  index = 0,
): GddSubjectBlock {
  return {
    id: crypto.randomUUID(),
    subjectId,
    order: index,
    layout: defaultLayout(index, "subject"),
    style: defaultStyle(index),
    fields: {},
    ...(subjectId === "game-title-description"
      ? { fields: { title: "", description: "" } }
      : {}),
    ...(subjectId === "prototype-technical-requirements"
      ? {
          prototype: {
            engines: [],
            platforms: [],
            customPlatform: "",
            details: {},
            shared: "",
          },
        }
      : {}),
    subsections: { orderMode: "spatial", blocks: [] },
  };
}

export function newGddSubsectionBlock(
  subjectId: GddSubjectId,
  index: number,
  subsectionId?: GddSubsectionSubjectId,
  heading?: string,
): GddSubsectionBlock {
  const subject = getSubject(subjectId);
  const preset = subsectionId
    ? subject.subsections.find((entry) => entry.id === subsectionId)
    : undefined;
  if (subsectionId && !preset)
    throw new Error(
      `Subsection ${subsectionId} is not available for ${subject.label}.`,
    );
  const label = preset?.label ?? heading?.trim();
  if (!label)
    throw new Error("Custom subsections need a title.");
  const isImageGroup =
    preset && "kind" in preset && preset.kind === "images";
  return {
    id: crypto.randomUUID(),
    order: index,
    layout: defaultLayout(index, "subsection"),
    style: defaultStyle(index),
    heading: label,
    ...(preset ? { subjectId: preset.id } : {}),
    content: isImageGroup ? { type: "images", images: [] } : "",
  };
}

export function snapGddCanvasPoint(x: number, y: number) {
  return {
    x: Math.round(x / GDD_CANVAS_GRID_SIZE) * GDD_CANVAS_GRID_SIZE,
    y: Math.round(y / GDD_CANVAS_GRID_SIZE) * GDD_CANVAS_GRID_SIZE,
  };
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function subsectionFromItem(
  parent: GddSubjectId,
  item: EditorItem,
  index: number,
): GddSubsectionBlock {
  const subject = getSubject(parent);
  const preset = subject.subsections.find(
    (entry) =>
      entry.label === item.heading &&
      (("kind" in entry && entry.kind === "images") ===
        (item.type === "images")),
  );
  return {
    id: item.id,
    order: index,
    layout: defaultLayout(index, "subsection"),
    style: defaultStyle(index),
    heading: item.heading,
    ...(preset ? { subjectId: preset.id } : {}),
    ...(item.headingMarkdown ? { headingMarkdown: item.headingMarkdown } : {}),
    content:
      item.type === "images"
        ? { type: "images", images: item.images }
        : item.body,
  };
}

function blockPosition(index: number) {
  return defaultLayout(index, "subject");
}

export function migrateEditorProject(
  project: EditorProject,
  mappings: GddSubjectMapping = {},
): GddCanvasProject {
  const mapped = new Map<GddSubjectId, EditorDraft["sections"]>();
  const pending: string[] = [];
  for (const section of project.draft.sections) {
    const mappedSubject = mappings[section.id];
    const subject =
      mappedSubject ?? SUBJECT_BY_LABEL.get(section.title)?.id;
    if (!subject) {
      pending.push(`${section.title || "Untitled"} (${section.id})`);
      continue;
    }
    if (!GDD_SUBJECTS.some((entry) => entry.id === subject))
      throw new Error(`Invalid subject mapping for "${section.title}".`);
    mapped.set(subject, [...(mapped.get(subject) ?? []), section]);
  }
  if (pending.length)
    throw new Error(
      `Map these sections to a GDD subject before continuing: ${pending.join(", ")}.`,
    );

  const projectAssetsData = projectAssets(project);
  const assets = Object.fromEntries(
    Object.entries(projectAssetsData).map(([path, bytes]) => [
      path,
      {
        mediaType: /\.png$/i.test(path)
          ? ("image/png" as const)
          : ("image/jpeg" as const),
        base64: encodeBase64(bytes),
      },
    ]),
  );
  const blockSubjects = [...mapped.keys()];
  const blocks = blockSubjects.map((subjectId, index): GddSubjectBlock => {
    const subject = getSubject(subjectId);
    const sourceSections = mapped.get(subjectId) ?? [];
    const subsections = sourceSections.flatMap((section) => {
      const retainMappedTitle =
        section.title !== subject.label
          ? [
              newGddSubsectionBlock(
                subjectId,
                0,
                undefined,
                section.title || "Untitled section",
              ),
            ]
          : [];
      return [
        ...retainMappedTitle,
        ...section.items.map((item, itemIndex) =>
          subsectionFromItem(
            subjectId,
            item,
            itemIndex + retainMappedTitle.length,
          ),
        ),
      ];
    });
    subsections.forEach((subsection, subsectionIndex) => {
      subsection.order = subsectionIndex;
      subsection.layout = defaultLayout(subsectionIndex, "subsection");
    });
    return {
      ...newGddSubjectBlock(subjectId, index),
      layout: blockPosition(index),
      subsections: { orderMode: "manual", blocks: subsections },
    };
  });

  const hasTitleOrDescription =
    project.draft.title.trim() || project.draft.introduction.trim();
  if (hasTitleOrDescription) {
    const existing = blocks.findIndex(
      (block) => block.subjectId === "game-title-description",
    );
    const titleBlock =
      existing >= 0
        ? blocks.splice(existing, 1)[0]
        : newGddSubjectBlock("game-title-description");
    titleBlock.fields = {
      title: project.draft.title,
      description: project.draft.introduction,
    };
    blocks.unshift(titleBlock);
  }
  if (project.draft.prototype) {
    const existing = blocks.findIndex(
      (block) =>
        block.subjectId === "prototype-technical-requirements",
    );
    const technicalBlock =
      existing >= 0
        ? blocks.splice(existing, 1)[0]
        : newGddSubjectBlock("prototype-technical-requirements");
    technicalBlock.prototype = project.draft.prototype;
    const sourceIndex =
      project.draft.prototype.sectionIndex ??
      project.draft.sections.findIndex(
        (section) => section.title === "First playable slice",
      );
    const precedingSubjects = new Set(
      (sourceIndex < 0
        ? project.draft.sections
        : project.draft.sections.slice(0, sourceIndex)
      )
        .map(
          (section) =>
            mappings[section.id] ??
            SUBJECT_BY_LABEL.get(section.title)?.id,
        )
        .filter(
          (subjectId): subjectId is GddSubjectId =>
            subjectId !== undefined &&
            subjectId !== "game-title-description" &&
            subjectId !== "prototype-technical-requirements",
        ),
    );
    const titleOffset = blocks.some(
      (block) => block.subjectId === "game-title-description",
    )
      ? 1
      : 0;
    blocks.splice(
      Math.min(titleOffset + precedingSubjects.size, blocks.length),
      0,
      technicalBlock,
    );
  }

  blocks.forEach((block, index) => {
    block.order = index;
    block.layout = blockPosition(index);
  });
  return {
    format: "jeemzu-gdd-canvas",
    version: 1,
    blocks: { orderMode: "manual", blocks },
    assets,
    ...(project.draft.assistant
      ? { assistant: project.draft.assistant }
      : {}),
    ...(project.draft.guidedAssistant
      ? { guidedAssistant: project.draft.guidedAssistant }
      : {}),
  };
}

export function orderedGddBlocks<T extends { order: number }>(
  structure: GddCanvasStructure<T>,
): T[] {
  return [...structure.blocks].sort((a, b) => a.order - b.order);
}

export function spatiallyOrderGddBlocks<
  T extends { order: number; layout: GddBlockLayout },
>(structure: GddCanvasStructure<T>): GddCanvasStructure<T> {
  const ordered = [...structure.blocks].sort((a, b) => {
    const verticalDifference = b.layout.y - a.layout.y;
    return verticalDifference || a.layout.x - b.layout.x;
  });
  return {
    orderMode: "spatial",
    blocks: ordered.map((entry, order) => ({ ...entry, order })),
  };
}

export function reorderGddBlocks<T extends { id: string; order: number }>(
  structure: GddCanvasStructure<T>,
  blockId: string,
  destination: number,
): GddCanvasStructure<T> {
  const ordered = orderedGddBlocks(structure);
  const source = ordered.findIndex((block) => block.id === blockId);
  if (
    source < 0 ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= ordered.length
  )
    throw new Error("Cannot move this block to the requested document order.");
  const [block] = ordered.splice(source, 1);
  ordered.splice(destination, 0, block);
  return {
    orderMode: "manual",
    blocks: ordered.map((entry, order) => ({ ...entry, order })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    ![...value].some((character) => character.charCodeAt(0) < 32)
  );
}

function readLayout(value: unknown): GddBlockLayout {
  if (!isRecord(value))
    throw new Error("The project contains an invalid block layout.");
  const { x, y, width, height, rotation } = value;
  if (
    ![x, y, width, height].every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    ) ||
    (x as number) < 0 ||
    (y as number) < 0 ||
    (x as number) > 1_000_000 ||
    (y as number) > 1_000_000 ||
    (width as number) < 40 ||
    (height as number) < 40 ||
    (width as number) > 5000 ||
    (height as number) > 5000 ||
    ![0, 90, 180, 270].includes(rotation as number)
  )
    throw new Error("The project contains an invalid block layout.");
  return {
    x: x as number,
    y: y as number,
    width: width as number,
    height: height as number,
    rotation: rotation as GddRotation,
  };
}

function readStyle(value: unknown): GddBlockStyle {
  if (
    !isRecord(value) ||
    typeof value.backgroundColor !== "string" ||
    !/^#[0-9a-f]{6}$/i.test(value.backgroundColor) ||
    !["solid", "dashed", "dotted", "double", "none"].includes(
      value.borderStyle as string,
    )
  )
    throw new Error("The project contains an invalid block style.");
  return {
    backgroundColor: value.backgroundColor,
    borderStyle: value.borderStyle as GddBorderStyle,
  };
}

function rotatedSize(layout: GddBlockLayout) {
  return layout.rotation % 180 === 0
    ? { width: layout.width, height: layout.height }
    : { width: layout.height, height: layout.width };
}

export function placeGddSubjectBlockOnTop(
  layout: GddBlockLayout,
  blocks: readonly { id: string; layout: GddBlockLayout }[],
  platform: { x: number; top: number },
): { layout: GddBlockLayout; supportId: string | null; shiftDown: number } {
  const support = [...blocks].sort(
    (left, right) => {
      const leftTop = left.layout.y - rotatedSize(left.layout).height / 2;
      const rightTop = right.layout.y - rotatedSize(right.layout).height / 2;
      return leftTop - rightTop;
    },
  )[0];
  const supportSize = support ? rotatedSize(support.layout) : null;
  const placedLayout = {
    ...layout,
    ...(support && supportSize
      ? {
          x: support.layout.x,
          width: Math.min(layout.width, supportSize.width),
        }
      : { x: platform.x }),
  };
  const size = rotatedSize(placedLayout);
  let y = support && supportSize
    ? support.layout.y - supportSize.height / 2 - size.height / 2
    : platform.top - size.height / 2;

  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = { ...placedLayout, y };
    if (!structureHasOverlap([...blocks, { id: "new-block", layout: candidate }]))
      break;
    y -= 24;
    if (attempt === 999)
      throw new Error("Could not place a new block on top of the structure.");
  }

  const minimumCenter = size.height / 2 + 24;
  const shiftDown =
    y < minimumCenter
      ? Math.ceil((minimumCenter - y) / 24) * 24
      : 0;
  return {
    layout: { ...placedLayout, y: y + shiftDown },
    supportId: support?.id ?? null,
    shiftDown,
  };
}

export function structureHasOverlap(
  blocks: readonly { layout: GddBlockLayout }[],
): boolean {
  const bounds = blocks.map(({ layout }) => {
    const size = rotatedSize(layout);
    return {
      left: layout.x - size.width / 2,
      top: layout.y - size.height / 2,
      right: layout.x + size.width / 2,
      bottom: layout.y + size.height / 2,
    };
  });
  return bounds.some((a, index) =>
    bounds.slice(index + 1).some(
      (b) =>
        a.left < b.right - GDD_CANVAS_CONTACT_EPSILON &&
        a.right > b.left + GDD_CANVAS_CONTACT_EPSILON &&
        a.top < b.bottom - GDD_CANVAS_CONTACT_EPSILON &&
        a.bottom > b.top + GDD_CANVAS_CONTACT_EPSILON,
    ),
  );
}

function readStructureOrder(value: unknown): "spatial" | "manual" {
  if (value !== "spatial" && value !== "manual")
    throw new Error("The project contains an invalid block order mode.");
  return value;
}

function readFields(value: unknown): Record<string, string> {
  if (!isRecord(value) || Object.keys(value).length > 100)
    throw new Error("The project contains invalid block form fields.");
  const fields: Record<string, string> = {};
  for (const [key, body] of Object.entries(value)) {
    if (
      !key ||
      key.length > 100 ||
      typeof body !== "string" ||
      body.length > LIMITS.characters
    )
      throw new Error("The project contains invalid block form fields.");
    fields[key] = body;
  }
  return fields;
}

function readPrototype(value: unknown): PrototypeRequirements {
  const parsed = readDraft({
    format: "jeemzu-gdd-editor",
    version: 1,
    draft: {
      title: "",
      introduction: "",
      sections: [],
      prototype: value,
    },
  });
  if (!parsed.prototype)
    throw new Error("The project contains invalid prototype requirements.");
  return parsed.prototype;
}

function readSubsection(
  value: unknown,
  parent: GddSubjectId,
  seenIds: Set<string>,
): GddSubsectionBlock {
  if (
    !isRecord(value) ||
    !validId(value.id) ||
    seenIds.has(value.id) ||
    !Number.isInteger(value.order) ||
    (value.order as number) < 0 ||
    typeof value.heading !== "string" ||
    value.heading.length > 100
  )
    throw new Error("The project contains an invalid subsection block.");
  seenIds.add(value.id);
  const layout = readLayout(value.layout);
  const style = readStyle(value.style);
  const subject = getSubject(parent);
  let subjectId: GddSubsectionSubjectId | undefined;
  if (value.subjectId !== undefined) {
    const preset = subject.subsections.find(
      (entry) => entry.id === value.subjectId,
    );
    if (
      !preset ||
      value.heading !== preset.label ||
      (("kind" in preset && preset.kind === "images") !==
        (isRecord(value.content) && value.content.type === "images"))
    )
      throw new Error("The project contains an invalid subsection subject.");
    subjectId = preset.id;
  }
  let content: GddSubsectionBlock["content"];
  if (typeof value.content === "string") {
    if (value.content.length > LIMITS.characters)
      throw new Error("A subsection exceeds the character limit.");
    content = value.content;
  } else if (
    isRecord(value.content) &&
    value.content.type === "images" &&
    Array.isArray(value.content.images) &&
    value.content.images.length <= 97
  ) {
    content = {
      type: "images",
      images: value.content.images.map((image) => {
        if (
          !isRecord(image) ||
          !validId(image.id) ||
          seenIds.has(image.id) ||
          typeof image.path !== "string" ||
          typeof image.caption !== "string" ||
          image.caption.length > 400
        )
          throw new Error("The project contains an invalid image reference.");
        seenIds.add(image.id);
        return {
          id: image.id,
          path: imagePath(image.path),
          caption: image.caption,
        };
      }),
    };
  } else {
    throw new Error("The project contains invalid subsection content.");
  }
  return {
    id: value.id,
    order: value.order as number,
    layout,
    style,
    heading: value.heading,
    ...(subjectId ? { subjectId } : {}),
    ...(typeof value.headingMarkdown === "string"
      ? { headingMarkdown: value.headingMarkdown }
      : {}),
    content,
  };
}

export function readGddCanvasProject(value: unknown): GddCanvasProject {
  if (
    !isRecord(value) ||
    value.format !== "jeemzu-gdd-canvas" ||
    value.version !== 1 ||
    !isRecord(value.blocks) ||
    !Array.isArray(value.blocks.blocks) ||
    !isRecord(value.assets)
  )
    throw new Error("This is not a supported GDD canvas project.");
  const orderMode = readStructureOrder(value.blocks.orderMode);
  if (value.blocks.blocks.length > GDD_SUBJECTS.length)
    throw new Error("A project contains too many main subject blocks.");
  const seenIds = new Set<string>();
  const seenSubjects = new Set<string>();
  let subsectionCount = 0;
  const blocks = value.blocks.blocks.map((entry): GddSubjectBlock => {
    if (
      !isRecord(entry) ||
      !validId(entry.id) ||
      seenIds.has(entry.id) ||
      !GDD_SUBJECTS.some((subject) => subject.id === entry.subjectId) ||
      seenSubjects.has(entry.subjectId as string) ||
      !Number.isInteger(entry.order) ||
      (entry.order as number) < 0 ||
      !isRecord(entry.subsections) ||
      !Array.isArray(entry.subsections.blocks)
    )
      throw new Error("The project contains an invalid main subject block.");
    seenIds.add(entry.id);
    seenSubjects.add(entry.subjectId as string);
    const subjectId = entry.subjectId as GddSubjectId;
    const childOrderMode = readStructureOrder(entry.subsections.orderMode);
    subsectionCount += entry.subsections.blocks.length;
    if (subsectionCount > 400)
      throw new Error("Projects support up to 400 subsection blocks.");
    const subsections = entry.subsections.blocks.map((child) =>
      readSubsection(child, subjectId, seenIds),
    );
    if (
      new Set(subsections.map((block) => block.order)).size !==
        subsections.length ||
      subsections.some((block, index) => block.order !== index)
    )
      throw new Error("Subsection block order must be unique and sequential.");
    if (structureHasOverlap(subsections))
      throw new Error("Subsection blocks cannot overlap.");
    return {
      id: entry.id,
      subjectId,
      order: entry.order as number,
      layout: readLayout(entry.layout),
      style: readStyle(entry.style),
      fields: readFields(entry.fields),
      ...(entry.prototype !== undefined
        ? { prototype: readPrototype(entry.prototype) }
        : {}),
      subsections: { orderMode: childOrderMode, blocks: subsections },
    };
  });
  if (
    new Set(blocks.map((block) => block.order)).size !== blocks.length ||
    blocks.some((block, index) => block.order !== index)
  )
    throw new Error("Main subject block order must be unique and sequential.");
  if (structureHasOverlap(blocks))
    throw new Error("Main subject blocks cannot overlap.");

  const assets: Record<string, GddProjectAsset> = {};
  if (Object.keys(value.assets).length > 97)
    throw new Error("Projects support up to 97 embedded images.");
  for (const [path, asset] of Object.entries(value.assets)) {
    if (
      !isRecord(asset) ||
      (asset.mediaType !== "image/png" && asset.mediaType !== "image/jpeg") ||
      typeof asset.base64 !== "string" ||
      !asset.base64 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        asset.base64,
      ) ||
      asset.base64.length > Math.ceil((LIMITS.image + 2) / 3) * 4
    )
      throw new Error("The project contains an invalid embedded image.");
    const safePath = imagePath(path);
    if (
      (/\.png$/i.test(safePath) && asset.mediaType !== "image/png") ||
      (!/\.png$/i.test(safePath) && asset.mediaType !== "image/jpeg")
    )
      throw new Error("Embedded image types must match their file names.");
    assets[safePath] = {
      mediaType: asset.mediaType,
      base64: asset.base64,
    };
  }
  const imagePaths = new Set<string>();
  for (const block of blocks) {
    for (const child of block.subsections.blocks) {
      if (typeof child.content !== "string") {
        for (const image of child.content.images) {
          if (!assets[image.path])
            throw new Error(
              `The project is missing embedded image ${image.path}.`,
            );
          imagePaths.add(image.path);
        }
      }
    }
  }
  for (const path of [
    ...(isRecord(value.assistant) && Array.isArray(value.assistant.references)
      ? value.assistant.references.flatMap((reference) =>
          isRecord(reference) && typeof reference.imagePath === "string"
            ? [imagePath(reference.imagePath)]
            : [],
        )
      : []),
    ...(isRecord(value.guidedAssistant) &&
    Array.isArray(value.guidedAssistant.references)
      ? value.guidedAssistant.references.flatMap((reference) =>
          isRecord(reference) && typeof reference.imagePath === "string"
            ? [imagePath(reference.imagePath)]
            : [],
        )
      : []),
  ]) {
    if (!assets[path])
      throw new Error(`The project is missing embedded image ${path}.`);
    imagePaths.add(path);
  }
  return {
    format: "jeemzu-gdd-canvas",
    version: 1,
    blocks: { orderMode, blocks },
    assets: Object.fromEntries(
      [...imagePaths].map((path) => [path, assets[path]]),
    ),
    ...(value.assistant !== undefined
      ? { assistant: readWorkflow(value.assistant) }
      : {}),
    ...(value.guidedAssistant !== undefined
      ? { guidedAssistant: readGuidedAssistant(value.guidedAssistant) }
      : {}),
  };
}
