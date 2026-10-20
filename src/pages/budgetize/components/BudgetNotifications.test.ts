import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BudgetNotifications,
  type BudgetNotification,
} from "./BudgetNotifications";

function renderNotifications(messages: BudgetNotification[]) {
  return renderToStaticMarkup(createElement(BudgetNotifications, { messages }));
}

describe("budget notification launcher", () => {
  it("remains available when there are no messages", () => {
    const html = renderNotifications([]);
    expect(html).toContain("Budget notifications, 0 unread");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("errors need attention");
  });

  it("counts warnings and guidance without exposing the closed conversation", () => {
    const html = renderNotifications([
      { id: "warning", kind: "warn", content: "Check opening funds." },
      { id: "guidance", kind: "info", content: "Extra payment guidance." },
    ]);
    expect(html).toContain("Budget notifications, 2 unread");
    expect(html).toContain("2 unread budget notifications.");
    expect(html).not.toContain("Check opening funds.");
    expect(html).not.toContain("errors need attention");
  });

  it("announces errors even while the conversation is closed", () => {
    const html = renderNotifications([
      { id: "save-error", kind: "error", content: "Nothing was saved." },
    ]);
    expect(html).toContain(
      "Budget notifications, 1 unread, errors need attention",
    );
    expect(html).toContain("Errors need attention.");
  });
});
