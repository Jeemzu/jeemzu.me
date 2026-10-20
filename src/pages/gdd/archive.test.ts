import { describe, expect, it } from "vitest";
import { strToU8, unzipSync, zipSync } from "fflate";
import { createTemplate, importArchive } from "./archive";
import { LIMITS } from "./document";
import { validateDimensions } from "./images";

describe("GDD template archives", () => {
  it("round-trips the downloadable template with instructions and an intact PNG", () => {
    const zip = createTemplate();
    expect(Object.keys(unzipSync(zip))).toEqual([
      "gdd.md",
      "README.txt",
      "images/example.png",
    ]);
    const imported = importArchive(zip);
    expect(imported.document.sections).toHaveLength(8);
    expect(imported.document.imagePaths).toEqual(["images/example.png"]);
    expect(
      validateDimensions(imported.images["images/example.png"], "example"),
    ).toEqual({ width: 1, height: 1 });
  });

  it("accepts a text-only document and ignores OS metadata", () => {
    const zip = zipSync({
      "gdd.md": strToU8("# My game\n\n## Design\n\nText."),
      "__MACOSX/._gdd.md": new Uint8Array([1]),
    });
    expect(importArchive(zip).images).toEqual({});
  });

  it("rejects a missing referenced image without discarding its caption", () => {
    expect(() =>
      importArchive(
        zipSync({
          "gdd.md": strToU8(
            "# Game\n\n## Art\n\n![Caption](images/missing.jpg)",
          ),
        }),
      ),
    ).toThrow("Missing image: images/missing.jpg");
  });

  it("rejects a folder-wrapped template", () => {
    expect(() =>
      importArchive(
        zipSync({
          "my-game/gdd.md": strToU8("# Game\n\n## Design\n\nText."),
        }),
      ),
    ).toThrow("at its root");
  });

  it("rejects invalid UTF-8 and fake image formats", () => {
    expect(() =>
      importArchive(zipSync({ "gdd.md": new Uint8Array([0xff, 0xfe]) })),
    ).toThrow("UTF-8");
    expect(() =>
      importArchive(
        zipSync({
          "gdd.md": strToU8("# Game\n\n## Art\n\n![Art](images/a.png)"),
          "images/a.png": strToU8("<svg/>"),
        }),
      ),
    ).toThrow("valid PNG or JPEG");
  });

  it("bounds compressed size, inflated content, and entry count", () => {
    expect(() => importArchive(new Uint8Array(LIMITS.archive + 1))).toThrow(
      "25 MB",
    );
    expect(() =>
      importArchive(zipSync({ "gdd.md": new Uint8Array(LIMITS.markdown + 1) })),
    ).toThrow("1 MB");
    const files = Object.fromEntries(
      Array.from({ length: LIMITS.files + 1 }, (_, index) => [
        `file${index}`,
        new Uint8Array(),
      ]),
    );
    expect(() => importArchive(zipSync(files))).toThrow("100 entries");
  });

  it.each([
    "../gdd.md",
    "/gdd.md",
    "images/../../secret.png",
    "C:\\secret.png",
  ])("rejects unsafe ZIP entry %s", (path) => {
    expect(() => importArchive(zipSync({ [path]: strToU8("text") }))).toThrow(
      "Unsafe ZIP path",
    );
  });

  it("rejects truncated and non-ZIP input", () => {
    expect(() => importArchive(strToU8("not a zip"))).toThrow("valid ZIP");
    expect(() => importArchive(createTemplate().subarray(0, 100))).toThrow();
  });

  it("rejects oversized image dimensions before browser decoding", () => {
    const bytes = unzipSync(createTemplate())["images/example.png"].slice();
    new DataView(bytes.buffer).setUint32(16, 25_000);
    expect(() => validateDimensions(bytes, "large.png")).toThrow("megapixels");
  });
});
