import { authFetch } from "./authFetch";

const URL_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api"}/gdd-documents`;
export const GDD_ACCOUNT_LIMIT = 100 * 1024 * 1024;
export const GDD_PDF_LIMIT = 20 * 1024 * 1024;
export const GDD_DRAFT_LIMIT = 50 * 1024 * 1024;
const GDD_PROJECT_JSON_LIMIT = 60 * 1024 * 1024;
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
      "The save exceeds your 100 MB account limit or file limits (20 MB PDF, 50 MB project).",
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
  pdf: Blob | null,
  draft: Uint8Array,
  existing: SavedGdd | null,
  signal?: AbortSignal,
): Promise<SavedGdd> {
  if (draft.byteLength > GDD_DRAFT_LIMIT)
    throw new Error("Compressed GDD projects must be no larger than 50 MB.");
  const form = new FormData();
  form.set("title", title.trim());
  if (pdf) form.set("pdf", pdf, "document.pdf");
  form.set(
    "draft",
    new Blob([Uint8Array.from(draft).buffer], { type: "application/gzip" }),
    "project.json.gz",
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
  } else if (blob.size > GDD_DRAFT_LIMIT)
    throw new Error("The saved project exceeds 50 MB.");
  return blob;
}

export async function compressGddProject(json: string): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined")
    throw new Error("Compressed account saves are not supported in this browser.");
  const source = new TextEncoder().encode(json);
  if (source.byteLength > GDD_PROJECT_JSON_LIMIT)
    throw new Error("GDD project JSON must be no larger than 60 MB.");
  const stream = new Blob([Uint8Array.from(source).buffer]).stream().pipeThrough(
    new CompressionStream("gzip"),
  );
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  if (compressed.byteLength > GDD_DRAFT_LIMIT)
    throw new Error("Compressed GDD projects must be no larger than 50 MB.");
  return compressed;
}

export async function decompressGddProject(
  compressed: Uint8Array,
): Promise<string> {
  if (typeof DecompressionStream === "undefined")
    throw new Error("Compressed account loads are not supported in this browser.");
  const stream = new Blob([
    Uint8Array.from(compressed).buffer,
  ]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > GDD_PROJECT_JSON_LIMIT) {
        await reader.cancel();
        throw new Error("The saved GDD project expands beyond 60 MB.");
      }
      chunks.push(value);
    }
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message === "The saved GDD project expands beyond 60 MB."
    )
      throw cause;
    throw new Error("The saved compressed GDD project is invalid.");
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The saved GDD project is not valid UTF-8.");
  }
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
