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
  details: Partial<Record<EngineId, string>>;
  shared: string;
}

export function engineRequirements(id: EngineId): string {
  const engine = ENGINES.find((entry) => entry.id === id);
  if (!engine) throw new Error("Select a supported game engine.");
  return [
    "| Requirement | First prototype |",
    "| --- | --- |",
    ...engine.requirements.map(
      ([label, guidance]) => `| ${label} | ${guidance} |`,
    ),
  ].join("\n");
}

export const SHARED_REQUIREMENTS = `| Requirement | First prototype |
| --- | --- |
| Controls | Describe supported inputs for each target platform. |
| Multiplayer | State None, or define mode, topology, and networking solution. |
| Launch locales | List launch languages, or write English only. |
| Save data | Describe what persists, when, and where. |
| Technical constraints | Define performance targets, device/browser minimums, and licensing limits. |
| Open decisions | List unresolved setup/architecture choices, or write None. |`;

export function defaultPrototype(): PrototypeRequirements {
  return {
    engines: ["unity"],
    platforms: [],
    customPlatform: "",
    details: { unity: engineRequirements("unity") },
    shared: SHARED_REQUIREMENTS,
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
        body: prototype.details[engine.id]?.trim() || "Undecided.",
      }),
    ),
    { heading: "Shared requirements", body: prototype.shared },
  ];
}
