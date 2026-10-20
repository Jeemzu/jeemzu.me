import { authFetch } from "./authFetch";

const URL_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api"}/gdd-documents`;
export const GDD_ACCOUNT_LIMIT = 100 * 1024 * 1024;
export const GDD_PDF_LIMIT = 20 * 1024 * 1024;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SavedGdd {
  id: string;
  title: string;
  revision: string;
  pdfBytes: number;
  draftBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface GddLibrary {
  documents: SavedGdd[];
  usedBytes: number;
  limitBytes: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function savedGdd(value: unknown): SavedGdd {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    typeof value.revision !== "string" ||
    !GUID.test(value.id) ||
    !GUID.test(value.revision) ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 100 ||
    typeof value.pdfBytes !== "number" ||
    typeof value.draftBytes !== "number" ||
    !Number.isSafeInteger(value.pdfBytes) ||
    value.pdfBytes < 0 ||
    !Number.isSafeInteger(value.draftBytes) ||
    value.draftBytes < 0 ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !Number.isFinite(Date.parse(value.updatedAt))
  ) {
    throw new Error("The server returned invalid GDD metadata.");
  }
  return {
    id: value.id,
    revision: value.revision,
    title: value.title,
    pdfBytes: value.pdfBytes,
    draftBytes: value.draftBytes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

async function checked(response: Response): Promise<Response> {
  if (response.ok) return response;
  if (response.status === 401 || response.status === 403)
    throw new Error(
      "Your session expired. Sign in again to access saved GDDs.",
    );
  if (response.status === 404)
    throw new Error(
      "This saved document is unavailable. Refresh the library; the account-storage API may also need deployment.",
    );
  if (response.status === 409)
    throw new Error(
      "This document changed elsewhere. Load its latest version or save as new.",
    );
  if (response.status === 429)
    throw new Error(
      "Too many account saves. Wait a few minutes and try again.",
    );
  if (response.headers.get("content-type")?.includes("json")) {
    const body: unknown = await response.json();
    if (record(body) && typeof body.detail === "string")
      throw new Error(body.detail);
  }
  if (response.status === 413)
    throw new Error(
      "The save exceeds your 100 MB account limit or file limits (20 MB PDF, 25 MB draft).",
    );
  throw new Error(
    `Account storage request failed (${response.status}). Try again.`,
  );
}

export async function listGdds(signal?: AbortSignal): Promise<GddLibrary> {
  const response = await checked(
    await authFetch(URL_BASE, { signal, cache: "no-store" }),
  );
  const body: unknown = await response.json();
  if (
    !record(body) ||
    !Array.isArray(body.documents) ||
    typeof body.usedBytes !== "number" ||
    !Number.isSafeInteger(body.usedBytes) ||
    body.usedBytes < 0 ||
    body.limitBytes !== GDD_ACCOUNT_LIMIT
  )
    throw new Error("The server returned invalid account storage usage.");
  const documents = body.documents.map(savedGdd);
  if (
    body.usedBytes > body.limitBytes ||
    documents.reduce(
      (sum, entry) => sum + entry.pdfBytes + entry.draftBytes,
      0,
    ) !== body.usedBytes ||
    new Set(documents.map((entry) => entry.id)).size !== documents.length
  )
    throw new Error("The server returned invalid account storage usage.");
  return {
    documents,
    usedBytes: body.usedBytes,
    limitBytes: body.limitBytes,
  };
}

export async function saveGdd(
  title: string,
  pdf: Blob,
  draft: Uint8Array,
  existing: SavedGdd | null,
  signal?: AbortSignal,
): Promise<SavedGdd> {
  const form = new FormData();
  form.set("title", title.trim());
  form.set("pdf", pdf, "document.pdf");
  form.set(
    "draft",
    new Blob([Uint8Array.from(draft).buffer], { type: "application/zip" }),
    "draft.zip",
  );
  if (existing) form.set("revision", existing.revision);
  const response = await checked(
    await authFetch(existing ? `${URL_BASE}/${existing.id}` : URL_BASE, {
      method: existing ? "PUT" : "POST",
      body: form,
      signal,
    }),
  );
  return savedGdd(await response.json());
}

export async function loadGddFile(
  document: SavedGdd,
  kind: "pdf" | "draft",
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await checked(
    await authFetch(
      `${URL_BASE}/${document.id}/${kind}?revision=${encodeURIComponent(document.revision)}`,
      { signal, cache: "no-store" },
    ),
  );
  const blob = await response.blob();
  if (kind === "pdf") {
    if (
      blob.size > GDD_PDF_LIMIT ||
      !new TextDecoder()
        .decode(await blob.slice(0, 5).arrayBuffer())
        .startsWith("%PDF-")
    ) {
      throw new Error("The saved PDF is invalid or exceeds 20 MB.");
    }
  } else if (blob.size > 25 * 1024 * 1024)
    throw new Error("The saved draft exceeds 25 MB.");
  return blob;
}

export async function deleteGdd(
  document: SavedGdd,
  signal?: AbortSignal,
): Promise<void> {
  await checked(
    await authFetch(
      `${URL_BASE}/${document.id}?revision=${encodeURIComponent(document.revision)}`,
      { method: "DELETE", signal },
    ),
  );
}
