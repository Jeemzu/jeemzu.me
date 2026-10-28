import { z } from "zod";
import { Lexer } from "marked";
import type { EditorDraft, EditorSection } from "./editor";

export const CHECKPOINTS = [
  {
    id: "concept",
    label: "Concept",
    sections: ["Game direction"],
    reference: "Pitch, inspirations, player fantasy, and scope constraints",
  },
  {
    id: "gameplay",
    label: "Gameplay",
    sections: ["Core gameplay", "Combat and character systems"],
    reference:
      "Mechanic notes, comparable games, controls, and balance examples",
  },
  {
    id: "world",
    label: "World / progression",
    sections: ["World and progression"],
    reference: "World notes, story beats, progression maps, and replay goals",
  },
  {
    id: "presentation",
    label: "Presentation",
    sections: ["Presentation and interaction"],
    reference:
      "Art references, mood boards, camera/UI examples, and audio direction",
  },
  {
    id: "technical",
    label: "Technical scope",
    sections: ["Implementation overview"],
    reference:
      "Engine/platform constraints, architecture notes, and performance budgets",
  },
  {
    id: "release",
    label: "First playable / release",
    sections: ["First playable slice", "Audience and release"],
    reference:
      "Team capacity, milestones, audience research, and release constraints",
  },
] as const;

const line = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) =>
      [...value].every((character) => character.charCodeAt(0) >= 32),
    );
const itemSchema = z.object({
  heading: line(100).min(1),
  body: z
    .string()
    .min(1)
    .max(12000)
    .refine(
      (body) =>
        !Lexer.lex(body).some((token) => token.type === "heading") &&
        !/!\[|<\s*img\b/i.test(body),
      "Put headings and images in the editor controls.",
    ),
});
const proposalSchema = z.object({
  title: line(100),
  introduction: z.string().max(2000),
  sections: z
    .array(
      z.object({
        title: line(100).min(1),
        items: z.array(itemSchema).min(1).max(12),
      }),
    )
    .max(2),
  images: z
    .array(
      z.object({
        referenceId: z.string().uuid(),
        section: line(100).min(1),
        heading: line(100).min(1),
        caption: line(400).min(1),
      }),
    )
    .max(12)
    .optional(),
});
export const assistantResponseSchema = z.object({
  message: z.string().min(1).max(4000),
  questions: z.array(z.string().min(1).max(500)).max(5),
  referenceRequests: z.array(z.string().min(1).max(500)).max(5),
  unresolved: z.array(z.string().min(1).max(1000)).max(30).optional(),
  proposal: proposalSchema,
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AssistantProposal = AssistantResponse["proposal"];

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
  unresolved: z.array(z.string().min(1).max(1000)).max(30).optional(),
});
export type AssistantMessage = z.infer<typeof messageSchema>;
const referenceSchema = z.object({
  id: z.string().uuid(),
  checkpoint: z.number().int().min(0).max(5),
  name: line(200).min(1),
  text: z.string().max(20000),
  url: z
    .string()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }),
  imagePath: z
    .string()
    .regex(/^images\/[a-zA-Z0-9-]+\.jpg$/)
    .optional(),
});
export type AssistantReference = z.infer<typeof referenceSchema>;
const stageSchema = z.object({
  prompt: z.string().max(4000),
  history: z.array(messageSchema).max(12),
  response: assistantResponseSchema.nullable(),
  baseFingerprint: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  approved: z.boolean(),
});
const workflowSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["scratch", "fill"]).default("scratch"),
  current: z.number().int().min(0).max(5),
  stages: z.array(stageSchema).length(6),
  references: z.array(referenceSchema).max(12),
});
export type AssistantWorkflow = z.infer<typeof workflowSchema>;
export type AssistantMode = AssistantWorkflow["mode"];

export function newWorkflow(
  mode: AssistantMode = "scratch",
): AssistantWorkflow {
  return {
    version: 1,
    mode,
    current: 0,
    stages: CHECKPOINTS.map(() => ({
      prompt: "",
      history: [],
      response: null,
      baseFingerprint: null,
      approved: false,
    })),
    references: [],
  };
}

export function readWorkflow(value: unknown): AssistantWorkflow {
  const parsed = workflowSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("The draft contains invalid GDD assistant progress.");
  const workflow = parsed.data;
  const firstPending = workflow.stages.findIndex((stage) => !stage.approved);
  if (
    (workflow.mode === "scratch" &&
      firstPending >= 0 &&
      (workflow.current > firstPending ||
        workflow.stages.slice(firstPending).some((stage) => stage.approved))) ||
    new Set(workflow.references.map((reference) => reference.id)).size !==
      workflow.references.length ||
    workflow.references.reduce(
      (total, reference) => total + reference.text.length,
      0,
    ) > 60000 ||
    CHECKPOINTS.some(
      (_, index) =>
        workflow.references.filter(
          (reference) => reference.checkpoint === index && reference.imagePath,
        ).length > 4,
    )
  )
    throw new Error(
      "The draft contains inconsistent GDD checkpoints or oversized references.",
    );
  workflow.stages.forEach((stage, index) => {
    if (
      stage.history.reduce(
        (total, message) => total + message.content.length,
        0,
      ) > 32000 ||
      (stage.response !== null && stage.baseFingerprint === null)
    )
      throw new Error("The draft contains invalid checkpoint history.");
    if (stage.response) {
      validateResponse(stage.response, index);
      validateImageProposals(stage.response.proposal, workflow.references);
    }
  });
  return workflow;
}

export function validateResponse(
  value: unknown,
  checkpoint: number,
): AssistantResponse {
  const parsed = assistantResponseSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("The assistant returned an invalid proposal. Try again.");
  const response = parsed.data;
  const allowed: readonly string[] = CHECKPOINTS[checkpoint].sections;
  if (
    response.proposal.sections.some(
      (section) => !allowed.includes(section.title),
    ) ||
    response.proposal.images?.some(
      (image) => !allowed.includes(image.section),
    ) ||
    new Set(response.proposal.sections.map((section) => section.title)).size !==
      response.proposal.sections.length ||
    (checkpoint !== 0 &&
      (response.proposal.title || response.proposal.introduction))
  )
    throw new Error(
      "The assistant proposed changes outside the current checkpoint.",
    );
  if (
    response.proposal.sections.some(
      (section) =>
        new Set(section.items.map((item) => item.heading)).size !==
        section.items.length,
    )
  )
    throw new Error(
      "The assistant returned duplicate subsection headings. Request a revised proposal.",
    );
  return response;
}

export function validateImageProposals(
  proposal: AssistantProposal,
  references: AssistantReference[],
) {
  const images = proposal.images ?? [];
  if (new Set(images.map((image) => image.referenceId)).size !== images.length)
    throw new Error(
      "The assistant proposed the same reference image more than once.",
    );
  for (const image of images) {
    if (
      !references.some(
        (reference) =>
          reference.id === image.referenceId && reference.imagePath,
      )
    )
      throw new Error(
        "The assistant proposed an unavailable reference image. Request a revised proposal.",
      );
  }
}

export function proposalDraft(
  draft: EditorDraft,
  proposal: AssistantProposal,
): EditorDraft {
  const sections = [...draft.sections];
  for (const proposed of proposal.sections) {
    const matches = sections.filter(
      (section) => section.title === proposed.title,
    );
    if (matches.length > 1)
      throw new Error(
        `Rename duplicate "${proposed.title}" sections before applying the proposal.`,
      );
    const existing = matches[0];
    const fill = draft.assistant?.mode === "fill";
    const items = fill ? [...(existing?.items ?? [])] : [];
    for (const item of proposed.items) {
      const matches = items.filter(
        (entry) => entry.type === "text" && entry.heading === item.heading,
      );
      if (matches.length > 1)
        throw new Error(
          `Rename duplicate "${item.heading}" subsections before applying the proposal.`,
        );
      const previous = matches[0];
      const replacement = {
        id: previous?.id ?? crypto.randomUUID(),
        type: "text" as const,
        heading: item.heading,
        body: item.body,
        ...(previous?.headingMarkdown
          ? { headingMarkdown: previous.headingMarkdown }
          : {}),
      };
      if (previous) items[items.indexOf(previous)] = replacement;
      else items.push(replacement);
    }
    const replacement: EditorSection = {
      id: existing?.id ?? crypto.randomUUID(),
      title: proposed.title,
      items: [
        ...items,
        ...(!fill
          ? (existing?.items.filter((item) => item.type === "images") ?? [])
          : []),
      ],
    };
    if (existing) sections[sections.indexOf(existing)] = replacement;
    else sections.push(replacement);
  }
  validateImageProposals(proposal, draft.assistant?.references ?? []);
  for (const image of proposal.images ?? []) {
    const reference = draft.assistant?.references.find(
      (entry) => entry.id === image.referenceId,
    );
    if (!reference?.imagePath)
      throw new Error("The proposed reference image is unavailable.");
    let section = sections.find((entry) => entry.title === image.section);
    if (sections.filter((entry) => entry.title === image.section).length > 1)
      throw new Error(
        `Rename duplicate "${image.section}" sections before applying the proposal.`,
      );
    if (!section) {
      section = { id: crypto.randomUUID(), title: image.section, items: [] };
      sections.push(section);
    }
    const items = section.items.map((item) =>
      item.type === "images"
        ? {
            ...item,
            images: item.images.filter(
              (entry) => entry.path !== reference.imagePath,
            ),
          }
        : item,
    );
    const group = items.find(
      (item) => item.type === "images" && item.heading === image.heading,
    );
    const addition = {
      id: crypto.randomUUID(),
      path: reference.imagePath,
      caption: image.caption,
    };
    if (group?.type === "images") group.images.push(addition);
    else
      items.push({
        id: crypto.randomUUID(),
        type: "images",
        heading: image.heading,
        images: [addition],
      });
    sections[sections.indexOf(section)] = { ...section, items };
  }
  return {
    ...draft,
    title: proposal.title || draft.title,
    introduction: proposal.introduction || draft.introduction,
    sections,
  };
}

export function approveCheckpoint(draft: EditorDraft): EditorDraft {
  const workflow = draft.assistant;
  const index = workflow?.current ?? 0;
  const stage = workflow?.stages[index];
  if (!workflow || !stage?.response)
    throw new Error("Request a proposal before approving this checkpoint.");
  const changed = proposalDraft(draft, stage.response.proposal);
  if (
    workflow.mode === "fill" &&
    !stage.response.proposal.title &&
    !stage.response.proposal.introduction &&
    !stage.response.proposal.sections.length &&
    !stage.response.proposal.images?.length
  )
    throw new Error(
      "Request proposed changes before approving this checkpoint.",
    );
  if (
    workflow.mode === "scratch" &&
    (!changed.title.trim() ||
      CHECKPOINTS[index].sections.some(
        (title) =>
          !changed.sections.some(
            (section) =>
              section.title === title &&
              section.items.some(
                (item) => item.type === "text" && item.body.trim(),
              ),
          ),
      ))
  )
    throw new Error(
      "Request a proposal covering every section in this checkpoint and a game title before approving. Mark non-applicable systems explicitly.",
    );
  changed.assistant = {
    ...workflow,
    current:
      workflow.mode === "fill"
        ? Math.max(
            0,
            workflow.stages.findIndex(
              (entry, current) => current !== index && !entry.approved,
            ),
          )
        : Math.min(5, index + 1),
    stages: workflow.stages.map((entry, current) =>
      current === index
        ? { ...entry, approved: true, response: null, baseFingerprint: null }
        : workflow.mode === "scratch" && current > index
          ? {
              ...entry,
              approved: false,
              response: null,
              baseFingerprint: null,
              history: [],
            }
          : entry,
    ),
  };
  return changed;
}

export async function draftFingerprint(draft: EditorDraft): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      title: draft.title,
      introduction: draft.introduction,
      sections: draft.sections,
      prototype: draft.prototype,
    }),
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function recentHistory(history: AssistantMessage[]): AssistantMessage[] {
  const result = history.slice(-12);
  while (
    result.reduce((total, message) => total + message.content.length, 0) > 32000
  )
    result.shift();
  return result;
}

export function imageBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
}
