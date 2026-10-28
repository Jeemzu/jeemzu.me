import { describe, expect, it } from "vitest";
import { reviewResponse, splitUnresolved } from "./assistantReview";

describe("consolidated assistant unresolved items", () => {
  it("extracts inline labels without removing resolved text", () => {
    expect(
      splitUnresolved("Use WebGL 2. **Unresolved:** Browser support."),
    ).toEqual({
      text: "Use WebGL 2.",
      unresolved: ["Browser support."],
    });
  });

  it("compiles repeated labels and heading lists without nested unresolved sections", () => {
    expect(
      splitUnresolved(
        "**Unresolved:** A. **Unresolved:** B.\n\n### Unresolved\n\n- C\n- D\n\n### Scope\n\nOne course.",
      ),
    ).toEqual({
      text: "### Scope\n\nOne course.",
      unresolved: ["A.", "B.", "C", "D"],
    });
  });

  it("leaves code, escaped labels and ordinary bold text unchanged", () => {
    const source =
      "`**Unresolved:** code`\n\n**Controls** are mouse-only.\n\n\\*\\*Unresolved:\\*\\* literal";
    expect(splitUnresolved(source)).toEqual({ text: source, unresolved: [] });
  });

  it("aggregates the message, introduction and subsections into one response list", () => {
    const response = {
      message: "Review this. **Unresolved:** Budget.",
      questions: ["Which target?"],
      referenceRequests: [],
      unresolved: ["Team size."],
      proposal: {
        title: "",
        introduction: "A game. **Unresolved:** Audience.",
        sections: [
          {
            title: "Implementation overview",
            items: [
              {
                heading: "Systems",
                body: "WebGL 2. **Unresolved:** Browsers.",
              },
              {
                heading: "Controls",
                body: "Mouse. **Unresolved:** Touch support.",
              },
            ],
          },
        ],
      },
    };
    const result = reviewResponse(response);
    expect(result.unresolved).toEqual([
      "Team size.",
      "Budget.",
      "Audience.",
      "Systems: Browsers.",
      "Controls: Touch support.",
    ]);
    expect(result.proposal.sections[0].items.map((item) => item.body)).toEqual([
      "WebGL 2.",
      "Mouse.",
    ]);
    expect(response.proposal.sections[0].items[0].body).toContain("Unresolved");
  });
});
