/**
 * Budget Assistant API Service
 * Calls the native .NET Budgetize workflow.
 *
 * The current in-memory budget and its projection are sent with every turn, so the
 * assistant sees unsaved edits and there is only ever one projection engine — this one.
 * The assistant never writes anything: it returns ops the user reviews and applies.
 */

import type { BudgetData } from "../pages/budgetize/types";
import type { Projection } from "../pages/budgetize/lib/projection";
import { authFetch } from "./authFetch";
import { z } from "zod";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050/api";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const cents = z.number().int().min(-2147483648).max(2147483647);
/** Mirrors the native API's BudgetOp contract. */
const budgetOpSchema = z.strictObject({
  op: z.enum([
    "add_override",
    "remove_override",
    "add_one_off",
    "remove_one_off",
    "add_bill",
    "update_bill",
    "remove_bill",
    "update_debt",
    "update_person",
    "set_month_income",
    "set_balance",
  ]),
  rationale: z.string().min(1).max(1000),
  targetId: z.string().optional(),
  targetKind: z.enum(["bill", "debt"]).optional(),
  fromISO: z.iso.date().optional(),
  toISO: z.iso.date().optional(),
  dateISO: z.iso.date().optional(),
  mode: z.enum(["skip", "amount"]).optional(),
  name: z.string().min(1).max(200).optional(),
  amountCents: cents.optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  paidFrom: z.enum(["shared", "autopay"]).optional(),
  frequency: z
    .enum(["monthly", "weekly", "biweekly", "quarterly", "annual"])
    .optional(),
  anchorISO: z.iso.date().optional(),
  startISO: z.iso.date().optional(),
  endISO: z.iso.date().optional(),
  kind: z.enum(["expense", "income"]).optional(),
  account: z.enum(["shared", "autopay", "personal"]).optional(),
  personId: z.string().optional(),
  note: z.string().max(500).optional(),
  balanceTarget: z.enum(["essentials", "autopay", "personal"]).optional(),
  year: z.number().int().min(1900).max(2999).optional(),
  month: z.number().int().min(0).max(11).optional(),
  paycheckCount: z.number().int().min(1).max(6).optional(),
  perPaycheckCents: cents.nonnegative().optional(),
});
const proposalSchema = z.strictObject({
  summary: z.string().min(1).max(4000),
  ops: z.array(budgetOpSchema).min(1).max(25),
});
const capabilityGapSchema = z.strictObject({
  request: z.string().min(1).max(2000),
  reason: z.string().min(1).max(2000),
  suggestedFeature: z.string().min(1).max(120),
});
const responseSchema = z
  .strictObject({
    answer: z.string().min(1),
    intent: z.enum(["question", "change_request", "unsupported"]),
    proposal: proposalSchema.nullable(),
    capabilityGap: capabilityGapSchema.nullable(),
  })
  .refine((value) =>
    value.intent === "unsupported"
      ? value.proposal === null && value.capabilityGap !== null
      : value.capabilityGap === null &&
        (value.intent === "change_request" || value.proposal === null),
  );

export type BudgetOp = z.infer<typeof budgetOpSchema>;
export type BudgetProposal = z.infer<typeof proposalSchema>;
export type CapabilityGap = z.infer<typeof capabilityGapSchema>;

export type BudgetChatResult =
  | {
      status: "ok";
      answer: string;
      intent: string;
      proposal: BudgetProposal | null;
      capabilityGap: CapabilityGap | null;
    }
  | { status: "unauthorized" }
  | { status: "unavailable"; message: string }
  | { status: "busy"; message: string }
  | { status: "error"; message: string };

export async function budgetChat(
  question: string,
  history: AssistantMessage[],
  budget: BudgetData,
  projection: Projection,
  strategy: "suggested" | "minimum",
  today: string,
): Promise<BudgetChatResult> {
  try {
    const response = await authFetch(`${API_BASE_URL}/budget/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: history.slice(-6),
        budget,
        projection,
        today,
        strategy,
      }),
    });
    if (response.status === 401 || response.status === 403)
      return { status: "unauthorized" };
    if (!response.ok) {
      const problem: unknown = await response.json().catch(() => null);
      const message =
        typeof problem === "object" &&
        problem !== null &&
        "detail" in problem &&
        typeof problem.detail === "string"
          ? problem.detail
          : "The assistant could not respond. Your budget is unchanged; try again.";
      if (response.status === 503) return { status: "unavailable", message };
      if (response.status === 429)
        return {
          status: "busy",
          message: "The assistant is busy. Wait a moment and try again.",
        };
      return { status: "error", message };
    }

    const parsed = responseSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success)
      return {
        status: "error",
        message:
          "The assistant returned an invalid response. Your budget is unchanged; try again.",
      };
    return {
      status: "ok",
      ...parsed.data,
    };
  } catch {
    return {
      status: "error",
      message:
        "The assistant could not be reached. Your budget is unchanged; try again.",
    };
  }
}

/** Failure is reported alongside the gap without discarding the assistant's answer. */
export async function reportCapabilityGap(
  gap: CapabilityGap,
): Promise<boolean> {
  try {
    const response = await authFetch(`${API_BASE_URL}/budget/gaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request: gap.request,
        reason: gap.reason,
        suggestedFeature: gap.suggestedFeature,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
