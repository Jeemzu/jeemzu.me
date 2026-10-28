import { Lexer, type MarkedToken } from "marked";

export const ENGINES = [
  {
    id: "unity",
    label: "Unity",
    requirements: [
      [
        "Unity version",
        "State the exact Unity Editor version, or write Undecided.",
      ],
      [
        "Render pipeline",
        "State URP, HDRP, or Built-in, or write Undecided. Resolve before setup.",
      ],
      [
        "Asset loading",
        "State Addressables, direct references, Resources, or another approach.",
      ],
      [
        "Required packages and modules",
        "List required packages, build modules, and licensing constraints.",
      ],
    ],
  },
  {
    id: "threejs",
    label: "Three.js",
    requirements: [
      [
        "Runtime and tooling",
        "State Node.js, package manager, TypeScript/JavaScript, and build tool versions.",
      ],
      [
        "Renderer",
        "State WebGL or WebGPU, browser support, and required fallbacks.",
      ],
      [
        "Assets and loading",
        "Define model/texture formats, compression, loading, and hosting/base paths.",
      ],
      [
        "Gameplay dependencies",
        "State physics, audio, input, and UI libraries, or None.",
      ],
      [
        "Browser constraints",
        "Define download/memory budgets, touch support, audio activation, and offline requirements.",
      ],
    ],
  },
  {
    id: "unreal",
    label: "Unreal",
    requirements: [
      [
        "Unreal version",
        "State the exact Unreal Engine version, or write Undecided.",
      ],
      [
        "Rendering",
        "Define rendering features, scalability, and hardware requirements.",
      ],
      [
        "Gameplay implementation",
        "State Blueprint/C++ responsibilities and required plugins.",
      ],
      [
        "Assets and packaging",
        "Define asset loading, cooking, packaging, and platform SDK requirements.",
      ],
    ],
  },
  {
    id: "phaser",
    label: "Phaser",
    requirements: [
      [
        "Runtime and tooling",
        "State Phaser, Node.js, package manager, and build tool versions.",
      ],
      [
        "Renderer",
        "State WebGL/Canvas support, browser targets, scaling, and resolution.",
      ],
      [
        "Gameplay dependencies",
        "Define physics, scene lifecycle, input, and audio requirements.",
      ],
      [
        "Assets and delivery",
        "Define atlases, loading, hosting/base paths, and download budgets.",
      ],
    ],
  },
  {
    id: "custom",
    label: "Custom",
    requirements: [
      [
        "Engine and version",
        "Name the engine/framework and exact version, or write Undecided.",
      ],
      [
        "Toolchain and rendering",
        "Define language, build tools, renderer, and required dependencies.",
      ],
      [
        "Assets and delivery",
        "Define loading, packaging, deployment, and platform constraints.",
      ],
    ],
  },
] as const;

export type EngineId = (typeof ENGINES)[number]["id"];
export const SUPPORTED_ENGINES = ENGINES.filter(
  (engine) => engine.id !== "custom",
);

export const PLATFORMS = [
  "Windows",
  "macOS",
  "Linux",
  "Android",
  "iOS",
  "Web",
  "Console",
] as const;

export interface PrototypeRequirements {
  sectionIndex?: number;
  engines: EngineId[];
  platforms: string[];
  customPlatform: string;
  details: Partial<Record<EngineId, RequirementContent>>;
  shared: RequirementContent;
}

export type RequirementDefinitions = readonly (readonly [string, string])[];

export interface RequirementFields {
  fields: Record<string, string>;
  additional: string;
}

export type RequirementContent = string | RequirementFields;

export const SHARED_FIELDS = [
  ["Controls", "Describe supported inputs for each target platform."],
  [
    "Multiplayer",
    "State None, or define mode, topology, and networking solution.",
  ],
  ["Launch locales", "List launch languages, or write English only."],
  ["Save data", "Describe what persists, when, and where."],
  [
    "Technical constraints",
    "Define performance targets, device/browser minimums, and licensing limits.",
  ],
  [
    "Open decisions",
    "List unresolved setup/architecture choices, or write None.",
  ],
] as const;

export function requirementFields(
  content: RequirementContent,
  definitions: RequirementDefinitions,
): RequirementFields {
  if (typeof content !== "string") return content;
  const fields: Record<string, string> = {};
  const additional: string[] = [];
  function assign(label: string, value: string): boolean {
    const definition = definitions.find(
      ([name]) => name.toLowerCase() === label.trim().toLowerCase(),
    );
    if (
      !definition ||
      Object.prototype.hasOwnProperty.call(fields, definition[0])
    )
      return false;
    fields[definition[0]] = value;
    return true;
  }
  for (const token of Lexer.lex(content, { gfm: true }) as MarkedToken[]) {
    if (
      token.type === "table" &&
      token.header.length === 2 &&
      token.header[0].text.trim().toLowerCase() === "requirement" &&
      token.header[1].text.trim().toLowerCase() === "first prototype"
    ) {
      const lines = token.raw.trimEnd().split("\n");
      const remaining = token.rows.flatMap((row, index) =>
        assign(row[0].text, row[1].text) ? [] : [lines[index + 2]],
      );
      if (remaining.length)
        additional.push(
          [...lines.slice(0, 2), ...remaining].join("\n"),
          "\n\n",
        );
    } else if (token.type === "list" && !token.ordered) {
      for (const item of token.items) {
        const match = /^\*\*([^*\n]+)\*\*\n\n([\s\S]*)$/.exec(item.text);
        if (!match || item.task || !assign(match[1], match[2].trim()))
          additional.push(item.raw, "\n\n");
      }
    } else {
      additional.push(token.raw);
    }
  }
  return { fields, additional: additional.join("").trim() };
}

export function requirementMarkdown(content: RequirementContent): string {
  if (typeof content === "string") return content;
  return [
    ...Object.entries(content.fields).flatMap(([label, value]) =>
      value.trim()
        ? [
            `- **${label}**\n\n${value
              .trim()
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n")}`,
          ]
        : [],
    ),
    content.additional.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function editableRequirements(
  content: RequirementContent,
  definitions: RequirementDefinitions,
): RequirementFields {
  if (typeof content !== "string") return content;
  const parsed = requirementFields(content, definitions);
  return {
    ...parsed,
    fields: Object.fromEntries(
      Object.entries(parsed.fields).filter(
        ([label, text]) =>
          text.trim() &&
          !definitions.some(
            ([name, guidance]) => name === label && guidance === text.trim(),
          ),
      ),
    ),
  };
}

export function hasEngineDetails(
  prototype: PrototypeRequirements,
  id: EngineId,
): boolean {
  const engine = ENGINES.find((entry) => entry.id === id);
  if (!engine) throw new Error("Select a supported game engine.");
  const value = editableRequirements(
    prototype.details[id] ?? "",
    engine.requirements,
  );
  return Boolean(
    value.additional.trim() ||
    Object.values(value.fields).some((text) => text.trim()),
  );
}

export function removeEngine(
  prototype: PrototypeRequirements,
  id: EngineId,
): PrototypeRequirements {
  const details = { ...prototype.details };
  delete details[id];
  return {
    ...prototype,
    engines: prototype.engines.filter((engine) => engine !== id),
    details,
  };
}

function requirementTable(definitions: RequirementDefinitions): string {
  return [
    "| Requirement | First prototype |",
    "| --- | --- |",
    ...definitions.map(([label, guidance]) => `| ${label} | ${guidance} |`),
  ].join("\n");
}

export function engineRequirements(id: EngineId): string {
  const engine = ENGINES.find((entry) => entry.id === id);
  if (!engine) throw new Error("Select a supported game engine.");
  return requirementTable(engine.requirements);
}

export const SHARED_REQUIREMENTS = requirementTable(SHARED_FIELDS);

export function defaultPrototype(): PrototypeRequirements {
  return {
    engines: ["unity"],
    platforms: [],
    customPlatform: "",
    details: { unity: "" },
    shared: "",
  };
}

export const PROTOTYPE_SECTION = "Prototype requirements";

export function prototypeItems(prototype: PrototypeRequirements) {
  return [
    {
      heading: "Target platforms",
      body: [...prototype.platforms, prototype.customPlatform.trim()]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...ENGINES.filter((engine) => prototype.engines.includes(engine.id)).map(
      (engine) => ({
        heading: engine.label,
        body:
          requirementMarkdown(prototype.details[engine.id] ?? "").trim() ||
          "Undecided.",
      }),
    ),
    {
      heading: "Shared requirements",
      body: requirementMarkdown(prototype.shared),
    },
  ];
}
