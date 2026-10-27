import template from "./dev-setup-prompt.md?raw";
import threejsTemplate from "./threejs-dev-setup-prompt.md?raw";

export const DEV_SETUP_CLIENTS = [
  { id: "vscode", label: "VS Code", config: "%APPDATA%\\Code\\User\\mcp.json" },
  {
    id: "vscode-insiders",
    label: "VS Code Insiders",
    config: "%APPDATA%\\Code - Insiders\\User\\mcp.json",
  },
  {
    id: "copilot-cli",
    label: "GitHub Copilot CLI",
    config: "%USERPROFILE%\\.copilot\\mcp-config.json",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    config: "%USERPROFILE%\\.claude.json",
  },
  {
    id: "cursor",
    label: "Cursor",
    config: "%USERPROFILE%\\.cursor\\mcp.json",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    config: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
  },
] as const;

export interface DevSetupOptions {
  engine: "unity" | "threejs";
  agentClient: string;
  agentMcpConfig: string;
  unityVersion: string;
  unityModules: string;
  toolsDir: string;
  acceptLicenseAgreements: boolean;
}

export function defaultDevSetupOptions(): DevSetupOptions {
  return {
    engine: "unity",
    agentClient: DEV_SETUP_CLIENTS[0].id,
    agentMcpConfig: DEV_SETUP_CLIENTS[0].config,
    unityVersion: "lts",
    unityModules: "",
    toolsDir: "%USERPROFILE%\\dev\\tools",
    acceptLicenseAgreements: false,
  };
}

function validateWindowsPath(value: string, label: string) {
  const path = value.trim();
  if (
    path.length > 240 ||
    !/^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+(?:\\|$)|%(?:USERPROFILE|APPDATA|LOCALAPPDATA)%\\)/i.test(
      path,
    ) ||
    /[<>"|?*`]/.test(path) ||
    [...path].some((character) => character.charCodeAt(0) < 32) ||
    path.slice(2).includes(":") ||
    /[{}]/.test(path)
  ) {
    throw new Error(
      `${label}: use an absolute Windows path or a path starting with %USERPROFILE%, %APPDATA%, or %LOCALAPPDATA%.`,
    );
  }
  return path;
}

export function createDevSetupPrompt(options: DevSetupOptions): string {
  if (options.engine !== "unity" && options.engine !== "threejs")
    throw new Error("Select Unity or Three.js for Dev Setup.");
  if (!DEV_SETUP_CLIENTS.some((client) => client.id === options.agentClient)) {
    throw new Error("Select a supported agent client.");
  }
  const unityVersion = options.unityVersion.trim().toLowerCase();
  if (
    options.engine === "unity" &&
    !/^(?:lts|latest|6000\.\d+\.\d+f\d+)$/.test(unityVersion)
  ) {
    throw new Error(
      "Unity version: use lts, latest, or an exact Unity 6 release such as 6000.6.4f1.",
    );
  }
  const modules = options.unityModules.trim();
  if (
    options.engine === "unity" &&
    (modules.length > 300 ||
      (modules && !/^[a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*)*$/.test(modules)))
  ) {
    throw new Error("Unity modules: use space-separated module IDs.");
  }
  const settings = {
    engine: options.engine,
    agentClient: options.agentClient,
    agentMcpConfig: validateWindowsPath(
      options.agentMcpConfig,
      "MCP config path",
    ),
    ...(options.engine === "unity"
      ? {
          unityVersion,
          unityModules: [...new Set(modules ? modules.split(/\s+/) : [])],
        }
      : { nodeVersion: "lts" }),
    blenderMinVersion: "5.1",
    toolsDir: validateWindowsPath(options.toolsDir, "Tools folder"),
    acceptLicenseAgreements: options.acceptLicenseAgreements,
  };
  return (options.engine === "unity" ? template : threejsTemplate).replace(
    "{{SETTINGS_JSON}}",
    () => JSON.stringify(settings, null, 2),
  );
}
