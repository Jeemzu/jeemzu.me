import { authFetch } from "./authFetch";
import {
  validateResponse,
  type AssistantMode,
  type AssistantMessage,
  type AssistantResponse,
  type AssistantReference,
} from "../pages/gdd/assistant";
import {
  guidedAssistantResponseSchema,
  type GuidedAssistantResponse,
} from "../pages/gdd/assistantGuided";

export interface GddAssistantRequest {
  mode?: AssistantMode;
  checkpoint: string;
  prompt: string;
  document: string;
  history: AssistantMessage[];
  references: {
    id?: string;
    imagePath?: string;
    name: string;
    text: string;
    url: string;
    imageBase64: string;
  }[];
}

export interface GddGuidedAssistantRequest {
  action: "clarify" | "draft";
  prompt: string;
  document: string;
  history: AssistantMessage[];
  references: (AssistantReference & { imageBase64: string })[];
}

const URL_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api"}/gdd-assistant`;

function throwAssistantError(response: Response): never {
  if (response.status === 401 || response.status === 403)
    throw new Error("Sign in again to use the GDD assistant.");
  if (response.status === 429)
    throw new Error(
      "Assistant limit reached. Wait five minutes and try again.",
    );
  if (response.status === 413)
    throw new Error(
      "Assistant context is too large. Reduce reference text or images.",
    );
  throw new Error(
    `GDD assistant request failed (${response.status}). Your draft is unchanged.`,
  );
}

export async function completeGddCheckpoint(
  request: GddAssistantRequest,
  checkpoint: number,
  signal: AbortSignal,
): Promise<AssistantResponse> {
  const response = await authFetch(URL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.headers.get("content-type")?.includes("json")) {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      )
        throw new Error(body.detail);
    }
    throwAssistantError(response);
  }
  return validateResponse(await response.json(), checkpoint);
}

export async function completeGuidedGdd(
  request: GddGuidedAssistantRequest,
  signal: AbortSignal,
): Promise<GuidedAssistantResponse> {
  const response = await authFetch(`${URL_BASE}/guided`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.headers.get("content-type")?.includes("json")) {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      )
        throw new Error(body.detail);
    }
    throwAssistantError(response);
  }
  const parsed = guidedAssistantResponseSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error("The assistant returned an invalid response. Try again.");
  if (
    (request.action === "clarify" && parsed.data.proposal !== null) ||
    (parsed.data.questions.length > 0 &&
      (parsed.data.readyForDraft || parsed.data.proposal !== null)) ||
    (parsed.data.proposal !== null && !parsed.data.readyForDraft) ||
    (parsed.data.questions.length === 0 &&
      parsed.data.proposal === null &&
      !parsed.data.readyForDraft)
  )
    throw new Error(
      "The assistant returned an inconsistent clarification or draft.",
    );
  return parsed.data;
}
