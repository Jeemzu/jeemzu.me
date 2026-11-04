import { afterEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "./authFetch";
import {
  deleteFile,
  downloadFile,
  listFiles,
  MAX_FILE_BYTES,
  uploadFile,
  type StoredFile,
} from "./adminFilesApi";

vi.mock("./authFetch", () => ({ authFetch: vi.fn() }));

const stored: StoredFile = {
  id: "file-1",
  name: "example.bin",
  sizeBytes: 3,
  createdAt: "2026-11-04T00:00:00Z",
};

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("admin file storage", () => {
  it("lists file metadata through authenticated fetch", async () => {
    vi.mocked(authFetch).mockResolvedValue(Response.json([stored]));
    const controller = new AbortController();
    expect(await listFiles(controller.signal)).toEqual([stored]);
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/files$/),
      { signal: controller.signal },
    );
  });

  it.each([0, MAX_FILE_BYTES])("accepts a file containing %i bytes", async (size) => {
    vi.mocked(authFetch).mockResolvedValue(Response.json(stored, { status: 201 }));
    const file = new File([new Uint8Array(size)], "arbitrary.bin");
    expect(await uploadFile(file)).toEqual(stored);
    const [url, init] = vi.mocked(authFetch).mock.calls[0];
    expect(url).toMatch(/\/admin\/files$/);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
    expect(init?.headers).toBeUndefined();
  });

  it("rejects one byte over the limit without sending a request", async () => {
    const file = new File([new Uint8Array(MAX_FILE_BYTES + 1)], "too-large.bin");
    await expect(uploadFile(file)).rejects.toThrow("25 MB");
    expect(authFetch).not.toHaveBeenCalled();
  });

  it.each([401, 403])("reports an authorization failure (%i)", async (status) => {
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status }));
    await expect(listFiles()).rejects.toThrow("admin account");
  });

  it("surfaces server-side upload size rejection", async () => {
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 413 }));
    await expect(uploadFile(new File(["x"], "example.txt"))).rejects.toThrow("25 MB");
  });

  it("reports missing files instead of treating deletion as successful", async () => {
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 404 }));
    await expect(deleteFile(stored.id)).rejects.toThrow("no longer exists");
  });

  it("surfaces problem details and generic server errors", async () => {
    vi.mocked(authFetch).mockResolvedValue(Response.json(
      { detail: "Invalid file name." },
      { status: 400, headers: { "Content-Type": "application/problem+json" } },
    ));
    await expect(listFiles()).rejects.toThrow("Invalid file name.");
    vi.mocked(authFetch).mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(listFiles()).rejects.toThrow("503");
  });

  it("preserves network failures", async () => {
    vi.mocked(authFetch).mockRejectedValue(new Error("offline"));
    await expect(listFiles()).rejects.toThrow("offline");
  });

  it("deletes through authenticated fetch", async () => {
    vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 204 }));
    await deleteFile(stored.id);
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/files\/file-1$/),
      { method: "DELETE" },
    );
  });

  it("downloads binary bytes with an authenticated request and revokes the blob URL", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue("blob:private-file");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", { setTimeout });
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(link),
      body: { appendChild: vi.fn() },
    });
    const bytes = new Uint8Array([0, 128, 255]);
    vi.mocked(authFetch).mockResolvedValue(new Response(bytes));

    await downloadFile(stored);

    expect(authFetch).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/files\/file-1$/));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(link.download).toBe(stored.name);
    expect(link.href).toBe("blob:private-file");
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:private-file");
  });
});
