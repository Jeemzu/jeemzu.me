import { strToU8, zipSync } from "fflate";
import markdown from "./dino-rush.md?raw";
import { parseDocument } from "./document";
import { validateAsset } from "./editor";

export const EXAMPLE_MARKDOWN = markdown;

const imageUrls = import.meta.glob<string>(
  "../../assets/gdd/dino-rush/*.{jpg,png}",
  { eager: true, query: "?url", import: "default" },
);

export const EXAMPLE_IMAGE_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(imageUrls).map(([path, url]) => [
    `images/${path.slice(path.lastIndexOf("/") + 1)}`,
    url,
  ]),
);

export async function loadExampleAssets(): Promise<Record<string, Uint8Array>> {
  const images: Record<string, Uint8Array> = {};
  for (const path of parseDocument(EXAMPLE_MARKDOWN).imagePaths) {
    const url = EXAMPLE_IMAGE_URLS[path];
    if (!url) throw new Error(`Missing bundled example image: ${path}.`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `Cannot load example image ${path} (${response.status}).`,
      );
    const bytes = new Uint8Array(await response.arrayBuffer());
    validateAsset(bytes, path);
    images[path] = bytes;
  }
  return images;
}

const INSTRUCTIONS = `DINO RUSH - EXAMPLE GDD

gdd.md is a complete, editable example for the GDD Generator.
Open https://jeemzu.me/gdd-generator and choose View Example GDD to preview it
or populate the form. Import GDD also accepts this ZIP directly.

To make your own GDD, extract this ZIP and edit gdd.md in a Markdown editor.
Keep # for the game title, ## for sections and ### for subheadings.
ZIP gdd.md and images/ together and import it to populate the form and generate a PDF.
Keep the supplied images beside gdd.md in images/. Reference captions describe
their design purpose; screenshots are inspiration, not Dino Rush gameplay.
The supplied references are included with the contributor's confirmed permission
to redistribute them. Original watermarks are preserved.
No account is required. This example is a fictional design, not a
claim that the game has been built or its acceptance criteria verified.
`;

export function createExample(assets: Record<string, Uint8Array>): Uint8Array {
  const images = Object.fromEntries(
    parseDocument(EXAMPLE_MARKDOWN).imagePaths.map((path) => {
      const bytes = assets[path];
      if (!bytes) throw new Error(`Missing example image: ${path}.`);
      validateAsset(bytes, path);
      return [path, bytes];
    }),
  );
  return zipSync({
    "gdd.md": strToU8(EXAMPLE_MARKDOWN),
    "README.txt": strToU8(INSTRUCTIONS),
    ...images,
  });
}
