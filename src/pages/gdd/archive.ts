import { Unzip, UnzipInflate, strFromU8, strToU8, zipSync } from "fflate";
import { LIMITS, parseDocument, type GddDocument } from "./document";
import {
  defaultPrototype,
  engineRequirements,
  PROTOTYPE_SECTION,
  prototypeItems,
  type PrototypeRequirements,
} from "./prototype";

export interface ImportedGdd {
  document: GddDocument;
  markdown: string;
  images: Record<string, Uint8Array>;
}

export const TEMPLATE_MARKDOWN = `# Your Game

Your genre / Your setting / Your core experience

Design, planned systems, tutorial and visual references.

## Game direction

### Vision and player experience

Describe your game, the player fantasy, and the experience you want to create.

### What distinguishes the game

| Direction | Design intent |
| --- | --- |
| Core identity | Explain what makes your game distinctive. |
| Player promise | Describe the experience players can expect. |

## World and progression

Describe the setting, characters, narrative, and progression.

## Core gameplay

### Core loop

1. Describe the first player action.
2. Explain the challenge and feedback.
3. Describe the reward and how the loop repeats.

### Supporting systems

- Resources and crafting
- Exploration and discovery
- Relationships and settlement growth

## Combat and character systems

Describe rules, abilities, customization, difficulty, and failure states.

## Presentation and interaction

Describe art direction, camera, interface, audio, and animation.

![Replace this example with your reference image. Add attribution or source details here.](images/example.png)

## Implementation overview

| System | Planned implementation |
| --- | --- |
| Controls | Describe supported inputs. |
| Save data | Describe what persists and when. |

{{PROTOTYPE_REQUIREMENTS}}

## First playable slice

### Scope

State exactly what is included and what is excluded.

### Tutorial sequence

1. Introduce the core interaction.
2. Let the player practice.
3. Confirm understanding with an independent challenge.

### Completion requirements

- Define observable acceptance criteria.
- Distinguish first-slice requirements from full-game plans.

## Audience and release

Describe target players, platforms, monetization, technology, and release plans.
`.replace("{{PROTOTYPE_REQUIREMENTS}}", prototypeMarkdown(defaultPrototype()));

function prototypeMarkdown(prototype: PrototypeRequirements): string {
  return `## ${PROTOTYPE_SECTION}\n\n${prototypeItems(prototype)
    .map((item) => `### ${item.heading}\n\n${item.body || "Undecided."}`)
    .join("\n\n")}`;
}

const INSTRUCTIONS = `GDD GENERATOR TEMPLATE

Prefer the web form? Open https://jeemzu.me/gdd-generator to fill out sections
and upload images directly. Account saves preserve your editable form.
Import GDD reopens a saved draft or this populated Markdown template.
The web form selects engines and target platforms independently.
Prototype requirements include only selected engine sections. Edit version,
rendering, loading, networking, locales, constraints, and open decisions before setup.
Unity, Three.js, Unreal, Phaser, and a custom engine are supported.

1. Extract this ZIP.
2. Edit gdd.md with any plain-text or Markdown editor.
3. Replace the game title and example text with your own content.
4. Add PNG or JPEG images to images/. Keep each under 10 MB and 24 megapixels.
5. Insert images on their own paragraph:
   ![Caption, credit and source page](images/your-image.png)
6. ZIP gdd.md and images/ together, or ZIP their single parent folder.
7. Import that ZIP at https://jeemzu.me/gdd-generator and download the PDF.

FORMAT

# Game title: one title, up to 100 characters.
Up to four paragraphs before the first section become cover text (800 characters total).
## Section: starts a new PDF section. Up to 40 sections.
### Subheading: groups content inside a section.
Paragraphs, **bold**, *italic*, ~~strikethrough~~, HTTP(S) links, bullet lists,
numbered lists, simple blockquotes, fenced code, and Markdown tables are supported.
Images must be standalone paragraphs, not inside lists, links, or tables.
Caption text is required. Captions are numbered automatically.
Use up to six table columns, 100 rows, and 350 characters per cell.
Code blocks support 3,000 characters and lines up to 80 characters.
Raw HTML, remote images, SVG, task lists, and custom Markdown extensions are not supported.
To remove the example image, remove its Markdown paragraph too.
Keep headings and captions concise. Wording and section order are preserved.
Include attribution in captions where required; only use images you may distribute.

LIMITS AND PRIVACY

ZIP: 25 MB compressed, 60 MB expanded, 100 entries.
gdd.md: 1 MB / 150,000 characters. Text fonts cover Latin, Greek and Cyrillic;
other scripts and emoji are not guaranteed. Check the PDF before distributing it.
Imports and generation run in your browser. Only explicit account saves upload content.
Keep the ZIP as your editable master. Re-import it after making changes.
The PDF uses a flowing layout inspired by The Knotted Grove design document,
not fixed page-by-page positions. Page counts change with your content.
`;

// A small original PNG swatch keeps the downloaded template immediately usable.
const EXAMPLE_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  ),
  (character) => character.charCodeAt(0),
);

export function createTemplate(
  prototype: PrototypeRequirements = defaultPrototype(),
): Uint8Array {
  const defaultRequirements = prototypeMarkdown(defaultPrototype());
  const selected: PrototypeRequirements = {
    ...defaultPrototype(),
    engines: prototype.engines,
    platforms: prototype.platforms,
    customPlatform: prototype.customPlatform,
    details: Object.fromEntries(
      prototype.engines.map((engine) => [engine, engineRequirements(engine)]),
    ),
  };
  return zipSync({
    "gdd.md": strToU8(
      TEMPLATE_MARKDOWN.replace(
        defaultRequirements,
        prototypeMarkdown(selected),
      ),
    ),
    "README.txt": strToU8(INSTRUCTIONS),
    "images/example.png": EXAMPLE_PNG,
  });
}

export function extractArchive(data: Uint8Array): Record<string, Uint8Array> {
  if (data.length > LIMITS.archive)
    throw new Error("The ZIP exceeds the 25 MB limit.");
  if (data[0] !== 0x50 || data[1] !== 0x4b)
    throw new Error("Select a valid ZIP archive.");
  const files: Record<string, Uint8Array> = Object.create(null);
  const names = new Set<string>();
  let total = 0;
  let pending = 0;
  const unzip = new Unzip((file) => {
    if (names.has(file.name))
      throw new Error(`Duplicate ZIP entry: ${file.name}`);
    names.add(file.name);
    if (names.size > LIMITS.files)
      throw new Error("The ZIP contains more than 100 entries.");
    if (
      file.name.startsWith("/") ||
      /[\\:]/.test(file.name) ||
      [...file.name].some((char) => char.charCodeAt(0) < 32) ||
      file.name.split("/").some((part) => part === ".." || part === ".")
    )
      throw new Error(`Unsafe ZIP path: ${file.name}`);
    if (file.name.endsWith("/")) return;
    const wanted =
      /^(?:[^/]+\/)?(?:gdd\.md|editor\.json)$/.test(file.name) ||
      /^(?:[^/]+\/)?images\/[^/]+\.(png|jpe?g)$/i.test(file.name);
    if (!wanted) return;
    const image = /(?:^|\/)images\//.test(file.name);
    const maximum = image ? LIMITS.image : LIMITS.markdown;
    if (file.originalSize !== undefined && file.originalSize > maximum) {
      throw new Error(
        `${file.name} exceeds its ${image ? "10" : "1"} MB limit.`,
      );
    }
    let length = 0;
    const chunks: Uint8Array[] = [];
    pending++;
    file.ondata = (error, chunk, final) => {
      if (error)
        throw new Error(`Cannot extract ${file.name}: ${error.message}`);
      length += chunk.length;
      total += chunk.length;
      if (length > maximum || total > LIMITS.expanded) {
        throw new Error(
          "Expanded content exceeds the file or 60 MB archive limit.",
        );
      }
      chunks.push(chunk);
      if (final) {
        const result = new Uint8Array(length);
        let offset = 0;
        for (const part of chunks) {
          result.set(part, offset);
          offset += part.length;
        }
        files[file.name] = result;
        pending--;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Bound inflate output between callbacks, including archives with misleading sizes.
  for (let offset = 0; offset < data.length; offset += 1024) {
    unzip.push(
      data.subarray(offset, offset + 1024),
      offset + 1024 >= data.length,
    );
  }
  if (pending) throw new Error("The ZIP is incomplete or damaged.");
  const roots = new Set(
    Object.keys(files)
      .filter((name) => /^(?:[^/]+\/)?(?:gdd\.md|editor\.json)$/.test(name))
      .map((name) => name.slice(0, name.lastIndexOf("/") + 1)),
  );
  if (roots.size > 1)
    throw new Error(
      "Include only one GDD, either at the ZIP root or inside one parent folder.",
    );
  const prefix = [...roots][0] ?? "";
  return Object.fromEntries(
    Object.entries(files)
      .filter(([name]) => {
        if (!name.startsWith(prefix)) return false;
        const relative = name.slice(prefix.length);
        return (
          relative === "gdd.md" ||
          relative === "editor.json" ||
          /^images\/[^/]+\.(png|jpe?g)$/i.test(relative)
        );
      })
      .map(([name, bytes]) => [name.slice(prefix.length), bytes]),
  );
}

export function importArchive(data: Uint8Array): ImportedGdd {
  const files = extractArchive(data);
  if (!files["gdd.md"])
    throw new Error(
      "Include gdd.md at the ZIP root or inside a single parent folder, with images/ beside it.",
    );
  let markdown: string;
  try {
    markdown = new TextDecoder("utf-8", { fatal: true }).decode(
      files["gdd.md"],
    );
  } catch {
    throw new Error("Save gdd.md as UTF-8 text.");
  }
  const document = parseDocument(markdown);
  const images: Record<string, Uint8Array> = {};
  for (const path of document.imagePaths) {
    const bytes = files[path];
    if (!bytes)
      throw new Error(
        `Missing image: ${path}. Include it in the ZIP or remove its Markdown reference.`,
      );
    const png = bytes[0] === 0x89 && strFromU8(bytes.subarray(1, 4)) === "PNG";
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if ((!png && !jpeg) || (/\.png$/i.test(path) ? !png : !jpeg)) {
      throw new Error(
        `${path} must contain a valid PNG or JPEG matching its extension.`,
      );
    }
    images[path] = bytes;
  }
  return { document, markdown, images };
}
