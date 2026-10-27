import { afterEach, describe, expect, it, vi } from "vitest";
import { budgetChat, reportCapabilityGap } from "./budgetAgentApi";
import { authFetch } from "./authFetch";
import { emptyBudget } from "../pages/budgetize/types";
import { computeProjection } from "../pages/budgetize/lib/projection";

vi.mock("./authFetch", () => ({ authFetch: vi.fn() }));
afterEach(() => vi.resetAllMocks());

const budget = emptyBudget();
const projection = computeProjection(
  budget,
  new Date(2026, 9, 1),
  8,
  "suggested",
  "minimum",
);
const call = () =>
  budgetChat("Pause rent.", [], budget, projection, "suggested", "2026-10-01");

describe("native Budgetize API", () => {
  it("sends unsaved data, authoritative forecast and only the last six turns", async () => {
    const body = {
      answer: "Review your changes.",
      intent: "change_request",
      proposal: {
        summary: "Update balance.",
        ops: [
          {
            op: "set_balance",
            rationale: "You requested this.",
            balanceTarget: "essentials",
            amountCents: -1234,
          },
        ],
      },
      capabilityGap: null,
    };
    vi.mocked(authFetch).mockResolvedValue(new Response(JSON.stringify(body)));
    const history = Array.from({ length: 42 }, (_, index) => ({
      role: "user" as const,
      content: `Turn ${index}`,
    }));
    const result = await budgetChat(
      "Pause rent.",
      history,
      budget,
      projection,
      "suggested",
      "2026-10-01",
    );
    expect(result).toEqual({ status: "ok", ...body });
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/budget/chat"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          question: "Pause rent.",
          history: history.slice(-6),
          budget,
          projection,
          today: "2026-10-01",
          strategy: "suggested",
        }),
      }),
    );
  });

  it.each([401, 403])(
    "handles HTTP %i as expired authentication",
    async (status) => {
      vi.mocked(authFetch).mockResolvedValue(new Response("", { status }));
      expect(await call()).toEqual({ status: "unauthorized" });
    },
  );
  it.each([400, 502, 504])(
    "surfaces API problem details for HTTP %i",
    async (status) => {
      vi.mocked(authFetch).mockResolvedValue(
        new Response(JSON.stringify({ detail: "Your budget is unchanged." }), {
          status,
        }),
      );
      expect(await call()).toEqual({
        status: "error",
        message: "Your budget is unchanged.",
      });
    },
  );
  it("distinguishes missing dedicated configuration from busy capacity", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "Set the dedicated key." }), {
        status: 503,
      }),
    );
    expect(await call()).toEqual({
      status: "unavailable",
      message: "Set the dedicated key.",
    });
    vi.mocked(authFetch).mockResolvedValue(new Response("", { status: 429 }));
    expect(await call()).toMatchObject({ status: "busy" });
  });
  it("never treats transport failure as success", async () => {
    vi.mocked(authFetch).mockRejectedValue(
      new TypeError("Network unavailable"),
    );
    expect(await call()).toMatchObject({ status: "error" });
  });
  it.each([
    {},
    { answer: "", intent: "question", proposal: null, capabilityGap: null },
    {
      answer: "Review.",
      intent: "change_request",
      proposal: {
        summary: "Rename.",
        ops: [
          {
            op: "update_bill",
            rationale: "Rename.",
            targetId: "bill",
            name: "New name",
            amountCents: null,
          },
        ],
      },
      capabilityGap: null,
    },
    {
      answer: "Review.",
      intent: "unsupported",
      proposal: null,
      capabilityGap: null,
    },
  ])("rejects malformed or unsafe success bodies", async (body) => {
    vi.mocked(authFetch).mockResolvedValue(new Response(JSON.stringify(body)));
    expect(await call()).toMatchObject({ status: "error" });
  });
  it("reports gap persistence success and failure separately", async () => {
    const gap = {
      request: "Calculate interest",
      reason: "Not accrued",
      suggestedFeature: "interest accrual",
    };
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 204 }));
    expect(await reportCapabilityGap(gap)).toBe(true);
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 503 }));
    expect(await reportCapabilityGap(gap)).toBe(false);
  });
});
