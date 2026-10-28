import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AssistantMarkdown from "./AssistantMarkdown";

function render(source: string) {
  return renderToStaticMarkup(
    createElement(AssistantMarkdown, { children: source }),
  );
}

describe("GDD assistant Markdown", () => {
  it("renders headings, separated paragraphs and inline formatting", () => {
    const html = render(
      "### Systems and technology\n\nBuild the **browser client**.\n\nUse *server-owned* state and `localStorage`.",
    );
    expect(html).toContain("<h3>Systems and technology</h3>");
    expect(html).toContain("<p>Build the <strong>browser client</strong>.</p>");
    expect(html).toContain(
      "<p>Use <em>server-owned</em> state and <code>localStorage</code>.</p>",
    );
  });

  it.each(["**Unresolved:**", "**Unresolved**:", "**Unresolved**"])(
    "separates appended %s labels without changing the content",
    (label) => {
      const html = render(
        `Treat 30 FPS as a target, not a validated result. ${label} supported browsers/devices and measurable performance criteria.`,
      );
      expect(html).toContain(
        "<p>Treat 30 FPS as a target, not a validated result. </p><h4>Unresolved</h4><p>supported browsers/devices and measurable performance criteria.</p>",
      );
      expect(html).not.toContain("**");
    },
  );

  it("preserves nested inline formatting after an unresolved label", () => {
    const html = render(
      "**Unresolved:** **Supported browsers** and *devices*.",
    );
    expect(html).toContain(
      "<h4>Unresolved</h4><p><strong>Supported browsers</strong> and <em>devices</em>.</p>",
    );
  });

  it("renders nested lists, tables, quotes and code blocks", () => {
    const html = render(
      "3. First\n   - Nested\n4. Second\n\n| Scope | Target |\n| --- | --- |\n| Players | Six |\n\n> A constraint.\n\n```text\n**Unresolved:** literal code\n```",
    );
    expect(html).toContain('<ol start="3">');
    expect(html).toContain("<ul><li><p>Nested</p></li></ul>");
    expect(html).toContain("<th>Scope</th>");
    expect(html).toContain("<td>Six</td>");
    expect(html).toContain("<blockquote><p>A constraint.</p></blockquote>");
    expect(html).toContain(
      "<pre><code>**Unresolved:** literal code</code></pre>",
    );
  });

  it("keeps HTML literal, blocks unsafe links and does not load images", () => {
    const html = render(
      '<script>alert("unsafe")</script>\n\n[Unsafe](javascript:alert)\n\n[Docs](https://example.com)\n\n![Reference](https://example.com/private.png)',
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("private.png");
  });

  it("keeps literal line breaks and does not promote inline code labels", () => {
    const html = render(
      "First line\nSecond line\n\n`**Unresolved:**` remains code.",
    );
    expect(html).toContain("<p>First line\nSecond line</p>");
    expect(html).toContain("<code>**Unresolved:**</code> remains code.");
    expect(html).not.toContain("<h4>");
  });

  it("renders escaped Markdown punctuation literally", () => {
    expect(render("\\*literal\\*")).toContain("<p>*literal*</p>");
  });
});
import { createElement } from "react";
