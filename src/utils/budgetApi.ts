/**
 * Budget API Service
 * Loads and saves the signed-in user's budget. The owner is resolved from the
 * JWT on the server, so no user identifier is ever sent from here.
 *
 * Responses carry a `revision` that must be echoed back on the next save. The
 * server rejects a stale revision with 409 so a second machine cannot silently
 * overwrite a newer save.
 */

import type { BudgetData } from "../pages/budgetize/types";
import { useAuthStore } from "../stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const BUDGET_URL = `${API_BASE_URL}/budget`;

export type LoadBudgetResult =
  /** `data` stays unknown here — the caller validates it before use. */
  | { status: "ok"; data: unknown; revision: string }
  | { status: "empty" }
  | { status: "unauthorized" }
  | { status: "error" };

export type SaveBudgetResult =
  | { status: "ok"; revision: string }
  | { status: "conflict" }
  | { status: "unauthorized" }
  | { status: "error" };

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loadBudget(): Promise<LoadBudgetResult> {
  try {
    const response = await fetch(BUDGET_URL, { headers: { ...authHeader() } });
    if (response.status === 404) return { status: "empty" };
    if (response.status === 401 || response.status === 403)
      return { status: "unauthorized" };
    if (!response.ok) return { status: "error" };

    const body = (await response.json()) as {
      data?: unknown;
      revision?: string;
    };
    if (!body.revision) return { status: "error" };
    return { status: "ok", data: body.data, revision: body.revision };
  } catch {
    return { status: "error" };
  }
}

/** Pass the revision from the last load or save; null creates the first budget. */
export async function saveBudget(
  data: BudgetData,
  revision: string | null,
): Promise<SaveBudgetResult> {
  try {
    const response = await fetch(BUDGET_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ data, revision }),
    });
    if (response.status === 409) return { status: "conflict" };
    if (response.status === 401 || response.status === 403)
      return { status: "unauthorized" };
    if (!response.ok) return { status: "error" };

    const body = (await response.json()) as { revision?: string };
    if (!body.revision) return { status: "error" };
    return { status: "ok", revision: body.revision };
  } catch {
    return { status: "error" };
  }
}
