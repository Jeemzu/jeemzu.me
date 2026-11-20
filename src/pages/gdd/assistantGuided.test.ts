import { describe, expect, it } from "vitest";
import {
  guidedProposalDraft,
  newGuidedAssistant,
  readGuidedAssistant,
} from "./assistantGuided";
import {
  defaultDraft,
  draftMarkdown,
  openProject,
  saveProject,
} from "./editor";

describe("guided GDD assistant", () => {
  it("preserves clarification progress and proposals in editable ZIPs", () => {
    const draft = defaultDraft();
    const state = newGuidedAssistant("A cozy exploration game.");
    state.history = [
      {
        role: "assistant",
        content: "Question: What should exploration feel like?",
      },
    ];
    state.response = {
      message: "Ready to draft.",
      questions: [],
      readyForDraft: true,
      proposal: null,
    };
    state.baseFingerprint = "a".repeat(64);
    state.readyForDraft = true;
    draft.guidedAssistant = readGuidedAssistant(state);

    const restored = openProject(saveProject({ draft, assets: {} }));
    expect(restored.draft.guidedAssistant).toEqual(state);
  });

  it("applies a complete document at once while retaining technical settings", () => {
    const draft = defaultDraft();
    draft.title = "Old title";
    const prototype = draft.prototype;
    const next = guidedProposalDraft(
      draft,
      {
        title: "New game",
        introduction: "A focused design.",
        sections: [
          {
            title: "Game direction",
            items: [{ heading: "Vision", body: "Explore a quiet island." }],
          },
          {
            title: "First playable",
            items: [
              { heading: "Scope", body: "One island and one objective." },
            ],
          },
        ],
      },
      [],
    );

    expect(next.title).toBe("New game");
    expect(next.sections.map((section) => section.title)).toEqual([
      "Game direction",
      "First playable",
    ]);
    expect(next.prototype).toEqual(prototype);
    expect(draftMarkdown(next)).toContain("Explore a quiet island.");
    expect(draft.sections).not.toEqual(next.sections);
  });
});
