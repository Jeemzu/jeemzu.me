import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import GddAssistant from "./GddAssistant";
import { CHECKPOINTS, newWorkflow } from "./assistant";
import { defaultDraft } from "./editor";

it("renders one unresolved list and image preview across a multi-section response", () => {
  const draft = defaultDraft();
  const workflow = newWorkflow("fill");
  draft.assistant = workflow;
  workflow.current = 1;
  const referenceId = crypto.randomUUID();
  workflow.references = [
    {
      id: referenceId,
      checkpoint: 1,
      name: "Test",
      text: "",
      url: "",
      imagePath: "images/reference.jpg",
    },
  ];
  const response = {
    message: "Review this. **Unresolved:** Confirm audience.",
    questions: [],
    referenceRequests: [],
    unresolved: ["Confirm budget."],
    proposal: {
      title: "",
      introduction: "",
      sections: CHECKPOINTS[1].sections.map((title) => ({
        title,
        items: [
          {
            heading: title,
            body: `Approved details. **Unresolved:** ${title} decision.`,
          },
        ],
      })),
      images: [
        {
          referenceId,
          section: "Core gameplay",
          heading: "Mood",
          caption: "Test reference",
        },
      ],
    },
  };
  workflow.stages[1].response = response;
  workflow.stages[1].history = [
    {
      role: "assistant",
      content: response.message,
      unresolved: response.unresolved,
    },
  ];
  const html = renderToStaticMarkup(
    createElement(GddAssistant, {
      project: {
        draft,
        assets: {
          "images/reference.jpg": new Uint8Array([255, 216, 255, 217]),
        },
      },
      disabled: false,
      onChange: () => {},
      onBusyChange: () => {},
      onComplete: () => {},
      onImagesPrepared: () => {},
    }),
  );
  expect(html.match(/>Unresolved<\/h4>/g)).toHaveLength(1);
  expect(html.match(/alt="Test reference"/g)).toHaveLength(1);
  expect(html).toContain("Core gameplay: Core gameplay decision.");
  expect(html).toContain(
    "Combat and character systems: Combat and character systems decision.",
  );
});
