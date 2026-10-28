import { authFetch } from "./authFetch";
import {
  validateResponse,
  type AssistantMode,
  type AssistantMessage,
  type AssistantResponse,
} from "../pages/gdd/assistant";

export interface GddAssistantRequest {
  mode?: AssistantMode;
  checkpoint: string;
  prompt: string;
  document: string;
  history: AssistantMessage[];
  references: {
    name: string;
    text: string;
    url: string;
    imageBase64: string;
  }[];
}

const URL_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api"}/gdd-assistant`;

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
    throw new Error(
      `GDD assistant request failed (${response.status}). Your draft is unchanged.`,
    );
  }
  return validateResponse(await response.json(), checkpoint);
}
