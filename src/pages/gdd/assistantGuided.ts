import { z } from "zod";
import type { AssistantReference, AssistantMessage } from "./assistant";
import type { EditorDraft, EditorSection } from "./editor";

const questionSchema = z.object({
  question: z.string().min(1).max(500),
  suggestions: z.array(z.string().min(1).max(500)).min(2).max(4),
});

const proposalSchema = z.object({
  title: z.string().min(1).max(100),
  introduction: z.string().max(2000),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        items: z
          .array(
            z.object({
              heading: z.string().min(1).max(100),
              body: z.string().min(1).max(12000),
            }),
          )
          .min(1)
          .max(12),
      }),
    )
    .min(1)
    .max(39),
  images: z
    .array(
      z.object({
        referenceId: z.string().uuid(),
        section: z.string().min(1).max(100),
        heading: z.string().min(1).max(100),
        caption: z.string().min(1).max(400),
      }),
    )
    .max(97)
    .optional(),
});

export const guidedAssistantResponseSchema = z.object({
  message: z.string().min(1).max(4000),
  questions: z.array(questionSchema).max(1),
  readyForDraft: z.boolean(),
  proposal: proposalSchema.nullable(),
});

const guidedReferenceSchema = z.object({
  id: z.string().uuid(),
  checkpoint: z.union([z.number().int().min(0).max(5), z.literal("document")]),
  name: z.string().min(1).max(200),
  text: z.string().max(20000),
  url: z.string().max(2000),
  imagePath: z
    .string()
    .regex(/^images\/[a-zA-Z0-9-]+\.jpg$/)
    .optional(),
});

const guidedMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const guidedStateSchema = z.object({
  prompt: z.string().max(4000),
  history: z.array(guidedMessageSchema).max(30),
  references: z.array(guidedReferenceSchema).max(12),
  response: guidedAssistantResponseSchema.nullable(),
  baseFingerprint: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  readyForDraft: z.boolean(),
  approved: z.boolean(),
});

export type GuidedAssistantResponse = z.infer<
  typeof guidedAssistantResponseSchema
>;
export type GuidedAssistantQuestion =
  GuidedAssistantResponse["questions"][number];
export type GuidedAssistantState = z.infer<typeof guidedStateSchema>;

export function newGuidedAssistant(prompt = ""): GuidedAssistantState {
  return {
    prompt,
    history: [],
    references: [],
    response: null,
    baseFingerprint: null,
    readyForDraft: false,
    approved: false,
  };
}

export function readGuidedAssistant(value: unknown): GuidedAssistantState {
  const parsed = guidedStateSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("The draft contains invalid guided assistant progress.");
  const state = parsed.data;
  const proposal = state.response?.proposal ?? null;
  const proposalTextLength = proposal ? JSON.stringify(proposal).length : 0;
  const images = proposal?.images ?? [];
  const proposalItems = proposal
    ? proposal.sections.reduce(
        (total, section) => total + section.items.length,
        0,
      )
    : 0;
  const imageGroups = new Set(
    images.map((image) => `${image.section}\u0000${image.heading}`),
  );
  if (
    state.history.reduce(
      (total, message) => total + message.content.length,
      0,
    ) > 32000 ||
    state.references.reduce(
      (total, reference) => total + reference.text.length,
      0,
    ) > 60000 ||
    new Set(state.references.map((reference) => reference.id)).size !==
      state.references.length ||
    state.references.filter((reference) => reference.imagePath).length > 4 ||
    state.references.some((reference) => reference.checkpoint !== 0) ||
    state.references.some((reference) => {
      if (!reference.url) return false;
      try {
        return !["http:", "https:"].includes(new URL(reference.url).protocol);
      } catch {
        return true;
      }
    }) ||
    proposalTextLength > 100000 ||
    proposalItems + imageGroups.size > 400 ||
    (state.response !== null &&
      ((state.response.questions.length > 0 &&
        (state.readyForDraft || proposal !== null)) ||
        (state.response.questions.length === 0 &&
          proposal === null &&
          !state.readyForDraft) ||
        (proposal !== null && !state.readyForDraft) ||
        state.baseFingerprint === null)) ||
    (proposal !== null &&
      (new Set(proposal.sections.map((section) => section.title)).size !==
        proposal.sections.length ||
        proposal.sections.some(
          (section) =>
            new Set(section.items.map((item) => item.heading)).size !==
              section.items.length ||
            section.items.some((item) =>
              /(^|\n)\s{0,3}#{1,6}\s|!\[|<\s*img\b/i.test(item.body),
            ),
        ) ||
        new Set(images.map((image) => image.referenceId)).size !==
          images.length ||
        images.some(
          (image) =>
            !proposal.sections.some(
              (section) => section.title === image.section,
            ) ||
            !state.references.some(
              (reference) =>
                reference.id === image.referenceId && reference.imagePath,
            ),
        ))) ||
    (state.approved && proposal !== null)
  )
    throw new Error(
      "The draft contains inconsistent guided assistant progress.",
    );
  return state;
}

export function guidedHistoryContent(
  message: string,
  question?: GuidedAssistantQuestion,
): string {
  if (!question) return message;
  return [
    message,
    `Question: ${question.question}`,
    `Suggested answers: ${question.suggestions.join(" | ")}`,
  ].join("\n");
}

export function guidedProposalDraft(
  draft: EditorDraft,
  proposal: NonNullable<GuidedAssistantResponse["proposal"]>,
  references: AssistantReference[],
): EditorDraft {
  const ids = new Set<string>();
  const sections: EditorSection[] = proposal.sections.map((section) => ({
    id: crypto.randomUUID(),
    title: section.title,
    items: section.items.map((item) => ({
      id: crypto.randomUUID(),
      type: "text" as const,
      heading: item.heading,
      body: item.body,
    })),
  }));
  for (const image of proposal.images ?? []) {
    if (ids.has(image.referenceId))
      throw new Error(
        "The proposal places the same reference image more than once.",
      );
    ids.add(image.referenceId);
    const reference = references.find(
      (entry) => entry.id === image.referenceId && entry.imagePath,
    );
    if (!reference?.imagePath)
      throw new Error("A proposed reference image is unavailable.");
    const section = sections.find((entry) => entry.title === image.section);
    if (!section)
      throw new Error("A proposed image refers to an unavailable section.");
    const existing = section.items.find(
      (item) => item.type === "images" && item.heading === image.heading,
    );
    if (existing?.type === "images") {
      existing.images.push({
        id: crypto.randomUUID(),
        path: reference.imagePath,
        caption: image.caption,
      });
    } else {
      section.items.push({
        id: crypto.randomUUID(),
        type: "images",
        heading: image.heading,
        images: [
          {
            id: crypto.randomUUID(),
            path: reference.imagePath,
            caption: image.caption,
          },
        ],
      });
    }
  }
  return {
    ...draft,
    title: proposal.title,
    introduction: proposal.introduction,
    sections,
  };
}

export function assistantMessages(
  history: AssistantMessage[],
  additions: AssistantMessage[],
): AssistantMessage[] {
  const result = [...history, ...additions].slice(-30);
  while (
    result.reduce((total, message) => total + message.content.length, 0) > 32000
  )
    result.shift();
  return result;
}
