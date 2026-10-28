import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteGdd,
  GDD_ACCOUNT_LIMIT,
  GDD_PDF_LIMIT,
  listGdds,
  loadGddFile,
  saveGdd,
  type SavedGdd,
} from "./gddApi";

const saved: SavedGdd = {
  id: "cbe2a33c-d42d-4328-a95b-c2b82e6edaf5",
  title: "My game",
  revision: "45e1ea75-3f90-430f-a4af-e9d132e6d702",
  pdfBytes: 100,
  draftBytes: 200,
  createdAt: "2026-10-20T00:00:00Z",
  updatedAt: "2026-10-20T00:00:00Z",
};

function reply(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("GDD account library", () => {
  it("saves editable progress without uploading a PDF", async () => {
    const draftOnly = { ...saved, pdfBytes: 0 };
    const fetch = reply(draftOnly, 201);
    expect(
      await saveGdd(saved.title, null, new Uint8Array([80, 75]), null),
    ).toEqual(draftOnly);
    const form: FormData = fetch.mock.calls[0][1].body;
    expect(form.has("pdf")).toBe(false);
    expect(form.has("draft")).toBe(true);
    reply({
      documents: [draftOnly],
      usedBytes: saved.draftBytes,
      limitBytes: GDD_ACCOUNT_LIMIT,
    });
    expect((await listGdds()).documents[0].pdfBytes).toBe(0);
  });
  it("loads validated metadata and combined PDF/draft usage without caching", async () => {
    const body = {
      documents: [saved],
      usedBytes: 300,
      limitBytes: GDD_ACCOUNT_LIMIT,
    };
    const fetch = reply(body);
    const controller = new AbortController();
    expect(await listGdds(controller.signal)).toEqual(body);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
      cache: "no-store",
    });
  });

  it.each([
    { documents: [saved], usedBytes: 300, limitBytes: 123 },
    { documents: [saved], usedBytes: -1, limitBytes: GDD_ACCOUNT_LIMIT },
    { documents: [saved], usedBytes: 1, limitBytes: GDD_ACCOUNT_LIMIT },
    {
      documents: [saved, saved],
      usedBytes: 600,
      limitBytes: GDD_ACCOUNT_LIMIT,
    },
    {
      documents: [{ ...saved, id: "-".repeat(36) }],
      usedBytes: 300,
      limitBytes: GDD_ACCOUNT_LIMIT,
    },
    {
      documents: [{ ...saved, updatedAt: "yesterday" }],
      usedBytes: 300,
      limitBytes: GDD_ACCOUNT_LIMIT,
    },
    {
      documents: [{ ...saved, draftBytes: 1.5 }],
      usedBytes: 101.5,
      limitBytes: GDD_ACCOUNT_LIMIT,
    },
  ])(
    "rejects malformed metadata or inconsistent storage usage",
    async (body) => {
      reply(body);
      await expect(listGdds()).rejects.toThrow(/invalid/i);
    },
  );

  it("uploads PDF and original ZIP bytes as multipart without a forced content-type", async () => {
    const fetch = reply(saved, 201);
    const pdf = new Blob(["%PDF-1.7\nsaved"], { type: "application/pdf" });
    const bytes = new Uint8Array([80, 75, 3, 4]);
    expect(await saveGdd(" My game ", pdf, bytes, null)).toEqual(saved);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/gdd-documents$/);
    expect(options.method).toBe("POST");
    expect(options.headers.has("Content-Type")).toBe(false);
    const form: FormData = options.body;
    expect(form.get("title")).toBe("My game");
    expect(form.has("revision")).toBe(false);
    expect(await (form.get("pdf") as Blob).text()).toBe(await pdf.text());
    expect(
      new Uint8Array(await (form.get("draft") as Blob).arrayBuffer()),
    ).toEqual(bytes);
  });

  it("pins updates and deletes to the selected revision", async () => {
    const fetch = reply(saved);
    await saveGdd(saved.title, new Blob(["%PDF-1.7"]), new Uint8Array(), saved);
    expect(fetch.mock.calls[0][0]).toMatch(
      new RegExp(`/gdd-documents/${saved.id}$`),
    );
    expect(fetch.mock.calls[0][1].method).toBe("PUT");
    expect(fetch.mock.calls[0][1].body.get("revision")).toBe(saved.revision);
    await deleteGdd(saved);
    expect(fetch.mock.calls[1][0]).toContain(
      `/${saved.id}?revision=${saved.revision}`,
    );
    expect(fetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it.each([
    [401, /session expired/],
    [403, /session expired/],
    [404, /unavailable/],
    [409, /changed elsewhere/],
    [413, /100 MB/],
    [429, /Too many/],
    [500, /500/],
  ])(
    "surfaces HTTP %i instead of claiming success",
    async (status, message) => {
      reply({}, status);
      await expect(listGdds()).rejects.toThrow(message);
    },
  );

  it("preserves server quota/validation problem details and network errors", async () => {
    reply({ detail: "This save exceeds your 100 MB storage limit." }, 413);
    await expect(listGdds()).rejects.toThrow(
      "This save exceeds your 100 MB storage limit.",
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(listGdds()).rejects.toThrow("offline");
  });
});

describe("revision-pinned GDD downloads", () => {
  it("checks PDF bytes and downloads the matching editable draft without caching", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("%PDF-1.7\nsaved"))
      .mockResolvedValueOnce(new Response(new Uint8Array([80, 75, 3, 4])));
    vi.stubGlobal("fetch", fetch);
    expect(await (await loadGddFile(saved, "pdf")).text()).toBe(
      "%PDF-1.7\nsaved",
    );
    expect((await loadGddFile(saved, "draft")).size).toBe(4);
    expect(fetch.mock.calls[0][0]).toContain(`/pdf?revision=${saved.revision}`);
    expect(fetch.mock.calls[1][0]).toContain(
      `/draft?revision=${saved.revision}`,
    );
    expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  });

  it("rejects invalid or oversized downloaded files", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>Not a PDF</html>")),
    );
    await expect(loadGddFile(saved, "pdf")).rejects.toThrow(/invalid/);
    const oversizedPdf = new Uint8Array(GDD_PDF_LIMIT + 1);
    oversizedPdf.set(new TextEncoder().encode("%PDF-"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(oversizedPdf)),
    );
    await expect(loadGddFile(saved, "pdf")).rejects.toThrow(/20 MB/);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(new Uint8Array(25 * 1024 * 1024 + 1))),
    );
    await expect(loadGddFile(saved, "draft")).rejects.toThrow(/25 MB/);
  });

  it("accepts files exactly at the PDF and draft byte limits", async () => {
    const pdf = new Blob(["%PDF-", new Uint8Array(GDD_PDF_LIMIT - 5)]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(pdf)));
    expect((await loadGddFile(saved, "pdf")).size).toBe(GDD_PDF_LIMIT);
    const draft = new Blob([new Uint8Array(25 * 1024 * 1024)]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(draft)));
    expect((await loadGddFile(saved, "draft")).size).toBe(25 * 1024 * 1024);
  });
});
