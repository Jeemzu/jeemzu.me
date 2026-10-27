import { describe, expect, it } from "vitest";
import { strToU8, unzipSync } from "fflate";
import {
  CHECKPOINTS,
  approveCheckpoint,
  draftFingerprint,
  newWorkflow,
  proposalDraft,
  readWorkflow,
  recentHistory,
  validateResponse,
  type AssistantResponse,
} from "./assistant";
import {
  defaultDraft,
  draftMarkdown,
  openProject,
  readDraft,
  saveProject,
} from "./editor";
import { markdownArchive } from "./importDocument";

function response(index = 0): AssistantResponse {
  return {
    message: "Review these decisions.",
    questions: ["What should the player feel?"],
    referenceRequests: ["An optional visual reference."],
    proposal: {
      title: index === 0 ? "Test game" : "",
      introduction: index === 0 ? "A focused game." : "",
      sections: CHECKPOINTS[index].sections.map((title) => ({
        title,
        items: [
          {
            heading: "Design",
            body: "A concrete design with explicit constraints.",
          },
        ],
      })),
    },
  };
}

describe("GDD assistant checkpoints", () => {
  it("does not alter document text until approval and advances only one checkpoint", async () => {
    const draft = defaultDraft();
    draft.assistant = newWorkflow();
    const fingerprint = await draftFingerprint(draft);
    draft.assistant.stages[0].response = response();
    draft.assistant.stages[0].baseFingerprint = fingerprint;
    expect(draft.title).toBe("");
    expect(await draftFingerprint(draft)).toBe(fingerprint);
    const changed = approveCheckpoint(draft);
    expect(changed.title).toBe("Test game");
    expect(changed.assistant?.current).toBe(1);
    expect(changed.assistant?.stages.map((stage) => stage.approved)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(draft.title).toBe("");
    expect(await draftFingerprint(changed)).not.toBe(fingerprint);
    expect(
      readDraft({ format: "jeemzu-gdd-editor", version: 1, draft: changed }),
    ).toEqual(changed);
  });

  it("finishes all six checkpoints and reopens downstream approvals after an earlier revision", async () => {
    let draft = defaultDraft();
    draft.assistant = newWorkflow();
    for (let index = 0; index < CHECKPOINTS.length; index++) {
      const stage = draft.assistant!.stages[index];
      stage.response = response(index);
      stage.baseFingerprint = await draftFingerprint(draft);
      draft = approveCheckpoint(draft);
      expect(() => readWorkflow(draft.assistant)).not.toThrow();
    }
    expect(draft.assistant!.stages.every((stage) => stage.approved)).toBe(true);
    expect(
      draft.sections.every((section) =>
        section.items.some((item) => item.type === "text" && item.body),
      ),
    ).toBe(true);
    expect(draftMarkdown(draft)).toContain("## Audience and release");
    draft.assistant!.current = 1;
    draft.assistant!.stages[1].response = response(1);
    draft.assistant!.stages[1].baseFingerprint = await draftFingerprint(draft);
    draft = approveCheckpoint(draft);
    expect(draft.assistant!.stages.map((stage) => stage.approved)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(draft.assistant!.current).toBe(2);
  });

  it("preserves unrelated sections, prototype fields and image categories", () => {
    const draft = defaultDraft();
    const images = {
      id: "image-group",
      type: "images" as const,
      heading: "References",
      images: [],
    };
    draft.sections[0].items.push(images);
    const changed = proposalDraft(draft, response().proposal);
    expect(changed.prototype).toEqual(draft.prototype);
    expect(changed.sections[1]).toBe(draft.sections[1]);
    expect(changed.sections[0].id).toBe(draft.sections[0].id);
    expect(changed.sections[0].items.at(-1)).toBe(images);
    draft.sections.push({ ...draft.sections[0], id: "duplicate" });
    expect(() => proposalDraft(draft, response().proposal)).toThrow(
      "duplicate",
    );
  });

  it("blocks malformed responses, out-of-checkpoint writes, skipped approvals, and incomplete checkpoints", () => {
    expect(() => validateResponse(response(1), 0)).toThrow("outside");
    const bad = response();
    bad.proposal.sections[0].items[0].body = "## Heading";
    expect(() => validateResponse(bad, 0)).toThrow("invalid");
    const workflow = newWorkflow();
    workflow.stages[2].approved = true;
    expect(() => readWorkflow(workflow)).toThrow("inconsistent");
    const draft = defaultDraft();
    draft.assistant = newWorkflow();
    draft.assistant.stages[0].response = {
      ...response(),
      proposal: { title: "", introduction: "", sections: [] },
    };
    expect(() => approveCheckpoint(draft)).toThrow("every section");
    expect(() => validateResponse({ message: "truncated" }, 0)).toThrow();
  });

  it("round-trips pending proposals, prompts and reference bytes through account and source ZIPs", async () => {
    const bytes = Uint8Array.from(
      atob(
        "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8qqKKKAP/2Q==",
      ),
      (character) => character.charCodeAt(0),
    );
    const draft = defaultDraft();
    draft.assistant = newWorkflow();
    draft.assistant.stages[0].prompt = "Help me refine this.";
    draft.assistant.stages[0].response = response();
    draft.assistant.stages[0].baseFingerprint = await draftFingerprint(draft);
    draft.assistant.references.push({
      id: crypto.randomUUID(),
      checkpoint: 0,
      name: "Mood",
      text: "Muted colors",
      url: "https://example.com",
      imagePath: "images/reference.jpg",
    });
    const project = { draft, assets: { "images/reference.jpg": bytes } };
    expect(openProject(saveProject(project))).toEqual(project);
    expect(openProject(markdownArchive(project))).toEqual(project);
    expect(unzipSync(markdownArchive(project))["editor.json"]).toBeDefined();
    expect(
      openProject(markdownArchive(project)).assets["images/reference.jpg"],
    ).toEqual(bytes);
    expect(
      openProject(
        saveProject({ ...project, draft: { ...draft, sections: [] } }),
      ).assets["images/reference.jpg"],
    ).toEqual(bytes);
    expect(() =>
      saveProject({
        draft,
        assets: { "images/reference.jpg": new Uint8Array(256 * 1024 + 1) },
      }),
    ).toThrow("256 KB");
    const corrupted = JSON.parse(
      new TextDecoder().decode(unzipSync(saveProject(project))["editor.json"]),
    );
    corrupted.draft.assistant.current = 5;
    expect(() => readDraft(corrupted)).toThrow();
  });

  it("keeps ordinary Markdown-only exports unchanged when the assistant is not enabled", () => {
    const draft = defaultDraft();
    draft.title = "Game";
    draft.sections[0].items[0] = {
      id: "text",
      type: "text",
      heading: "Vision",
      body: "Explore.",
    };
    const files = unzipSync(markdownArchive({ draft, assets: {} }));
    expect(files["editor.json"]).toBeUndefined();
    expect(files["gdd.md"]).toEqual(strToU8(draftMarkdown(draft)));
  });

  it("enforces history and reference budgets without truncating saved reference content", () => {
    const workflow = newWorkflow();
    workflow.references = Array.from({ length: 4 }, () => ({
      id: crypto.randomUUID(),
      checkpoint: 0,
      name: "Notes",
      text: "a".repeat(20000),
      url: "",
    }));
    expect(() => readWorkflow(workflow)).toThrow("oversized");
    const history = recentHistory(
      Array.from({ length: 20 }, () => ({
        role: "user" as const,
        content: "a".repeat(4000),
      })),
    );
    expect(history).toHaveLength(8);
    expect(
      history.reduce((total, message) => total + message.content.length, 0),
    ).toBe(32000);
  });
});
