/**
 * Budget Assistant API Service
 * Talks to the assistant through the .NET API, which proxies the LangGraph service.
 *
 * The current in-memory budget and its projection are sent with every turn, so the
 * assistant sees unsaved edits and there is only ever one projection engine — this one.
 * The assistant never writes anything: it returns ops the user reviews and applies.
 */

import type { BudgetData } from "../pages/budgetize/types";
import type { Projection } from "../pages/budgetize/lib/projection";
import { authFetch } from "./authFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050/api";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/** Mirrors the BudgetOp model in agents/budget/models.py. */
export interface BudgetOp {
  op:
    | "add_override"
    | "remove_override"
    | "add_one_off"
    | "remove_one_off"
    | "add_bill"
    | "update_bill"
    | "remove_bill"
    | "update_debt"
    | "update_person"
    | "set_month_income"
    | "set_balance";
  rationale: string;
  targetId?: string;
  targetKind?: "bill" | "debt";
  fromISO?: string;
  toISO?: string;
  dateISO?: string;
  mode?: "skip" | "amount";
  name?: string;
  amountCents?: number;
  dueDay?: number;
  paidFrom?: "shared" | "autopay";
  frequency?: "monthly" | "weekly" | "biweekly" | "quarterly" | "annual";
  anchorISO?: string;
  startISO?: string;
  endISO?: string;
  kind?: "expense" | "income";
  account?: "shared" | "autopay" | "personal";
  personId?: string;
  note?: string;
  balanceTarget?: "essentials" | "autopay" | "personal";
  year?: number;
  /** 0-based month index. */
  month?: number;
  paycheckCount?: number;
  perPaycheckCents?: number;
}

export interface BudgetProposal {
  summary: string;
  ops: BudgetOp[];
}

export interface CapabilityGap {
  request: string;
  reason: string;
  suggestedFeature: string;
}

export type BudgetChatResult =
  | {
      status: "ok";
      answer: string;
      intent: string;
      proposal: BudgetProposal | null;
      capabilityGap: CapabilityGap | null;
    }
  | { status: "unauthorized" }
  | { status: "unavailable" }
  | { status: "error" };

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
        history,
        budget,
        projection,
        today,
        strategy,
      }),
    });
    if (response.status === 401 || response.status === 403)
      return { status: "unauthorized" };
    if (response.status === 503) return { status: "unavailable" };
    if (!response.ok) return { status: "error" };

    const body = (await response.json()) as {
      answer?: string;
      intent?: string;
      proposal?: BudgetProposal | null;
      capabilityGap?: CapabilityGap | null;
    };
    return {
      status: "ok",
      answer: body.answer ?? "",
      intent: body.intent ?? "",
      proposal: body.proposal ?? null,
      capabilityGap: body.capabilityGap ?? null,
    };
  } catch {
    return { status: "error" };
  }
}

/** Fire-and-forget: a failure here must never interrupt the conversation. */
export async function reportCapabilityGap(gap: CapabilityGap): Promise<boolean> {
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
