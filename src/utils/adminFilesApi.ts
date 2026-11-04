import { authFetch } from "./authFetch";

const FILES_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api"}/admin/files`;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface StoredFile {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

async function checkResponse(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 413)
    throw new Error("Files must be 25 MB or smaller.");
  if (response.status === 401 || response.status === 403)
    throw new Error("Sign in with your admin account to access your files.");
  if (response.status === 404)
    throw new Error("This file no longer exists. Refresh the file list.");

  if (response.headers.get("content-type")?.includes("json")) {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null &&
        "detail" in body && typeof body.detail === "string")
      throw new Error(body.detail);
  }
  throw new Error(`File request failed (${response.status}). Please try again.`);
}

export async function listFiles(signal?: AbortSignal): Promise<StoredFile[]> {
  const response = await authFetch(FILES_URL, { signal });
  await checkResponse(response);
  return response.json();
}

export async function uploadFile(file: File): Promise<StoredFile> {
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Files must be 25 MB or smaller.");
  const body = new FormData();
  body.append("file", file);
  const response = await authFetch(FILES_URL, { method: "POST", body });
  await checkResponse(response);
  return response.json();
}

export async function fetchFileBlob(id: string, signal?: AbortSignal): Promise<Blob> {
  const response = await authFetch(`${FILES_URL}/${encodeURIComponent(id)}`, { signal });
  await checkResponse(response);
  return response.blob();
}

export async function downloadFile(file: StoredFile): Promise<void> {
  const url = URL.createObjectURL(await fetchFileBlob(file.id));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deleteFile(id: string): Promise<void> {
  const response = await authFetch(`${FILES_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await checkResponse(response);
}
