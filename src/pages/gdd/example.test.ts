import { strFromU8, unzipSync } from "fflate";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { importArchive } from "./archive";
import { parseDocument } from "./document";
import {
  draftFromMarkdown,
  draftMarkdown,
  openProject,
  projectPaths,
} from "./editor";
import {
  createExample,
  EXAMPLE_IMAGE_URLS,
  EXAMPLE_MARKDOWN,
  loadExampleAssets,
} from "./example";
import { validateDimensions } from "./images";

const assets = Object.fromEntries(
  Object.keys(EXAMPLE_IMAGE_URLS).map((path) => [
    path,
    Uint8Array.from(
      readFileSync(
        new URL(
          `../../assets/gdd/dino-rush/${path.slice("images/".length)}`,
          import.meta.url,
        ),
      ),
    ),
  ]),
);

afterEach(() => vi.restoreAllMocks());

describe("Dino Rush example GDD", () => {
  it("populates editable fields without changing the example's content", () => {
    const draft = draftFromMarkdown(EXAMPLE_MARKDOWN);
    expect(draft.title).toBe("Dino Rush");
    expect(draft.sections).toHaveLength(8);
    expect(parseDocument(draftMarkdown(draft))).toEqual(
      parseDocument(EXAMPLE_MARKDOWN),
    );
    expect(draft.sections[6].title).toBe("First playable slice");
    expect(draft.sections.flatMap((section) => section.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          heading: "Bonking",
          body: expect.stringContaining("three-second cooldown"),
        }),
      ]),
    );
  });

  it("downloads the same example as an importable ZIP with instructions", () => {
    const zip = createExample(assets);
    const files = unzipSync(zip);
    expect(Object.keys(files)).toEqual([
      "gdd.md",
      "README.txt",
      ...parseDocument(EXAMPLE_MARKDOWN).imagePaths,
    ]);
    expect(strFromU8(files["README.txt"])).toContain("View Example GDD");
    expect(importArchive(zip).markdown).toBe(EXAMPLE_MARKDOWN);
    const project = openProject(zip);
    expect(parseDocument(draftMarkdown(project.draft))).toEqual(
      parseDocument(EXAMPLE_MARKDOWN),
    );
    expect(project.assets).toEqual(assets);
    expect(projectPaths(project.draft)).toHaveLength(10);
    for (const [path, bytes] of Object.entries(project.assets)) {
      expect(files[path]).toEqual(assets[path]);
      expect(validateDimensions(bytes, path).width).toBeGreaterThan(0);
    }
  });

  it("loads all referenced images from their bundled URLs", async () => {
    const byUrl = Object.fromEntries(
      Object.entries(EXAMPLE_IMAGE_URLS).map(([path, url]) => [
        url,
        assets[path],
      ]),
    );
    const fetchImage = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        async (url) => new Response(Uint8Array.from(byUrl[String(url)]).buffer),
      );
    expect(await loadExampleAssets()).toEqual(assets);
    expect(fetchImage).toHaveBeenCalledTimes(10);
  });

  it("reports failed image downloads and incomplete ZIP assets", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    await expect(loadExampleAssets()).rejects.toThrow(
      "Cannot load example image",
    );
    expect(() => createExample({})).toThrow("Missing example image");
  });

  it("creates independent editable drafts for repeated population", () => {
    const first = draftFromMarkdown(EXAMPLE_MARKDOWN);
    const second = draftFromMarkdown(EXAMPLE_MARKDOWN);
    first.sections[0].items[0].heading = "Changed";
    expect(second.sections[0].items[0].heading).toBe(
      "Vision and player experience",
    );
    expect(first.sections[0].id).not.toBe(second.sections[0].id);
  });
});
