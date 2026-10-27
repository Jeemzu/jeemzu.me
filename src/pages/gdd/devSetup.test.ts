import { describe, expect, it } from "vitest";
import { createDevSetupPrompt, defaultDevSetupOptions } from "./devSetup";

describe("GDD development setup prompts", () => {
  it("retains the Unity setup and validates Unity-specific settings", () => {
    const options = defaultDevSetupOptions();
    const prompt = createDevSetupPrompt(options);
    expect(prompt).toContain("# Unity 3D Game Dev Environment");
    expect(prompt).toContain("unity mcp configure");
    expect(prompt).not.toContain("{{SETTINGS_JSON}}");
    expect(() =>
      createDevSetupPrompt({ ...options, unityVersion: "invalid" }),
    ).toThrow("Unity version");
    expect(() =>
      createDevSetupPrompt({ ...options, unityModules: "webgl; command" }),
    ).toThrow("Unity modules");
  });

  it("generates a Three.js toolchain without Unity installation or licensing", () => {
    const prompt = createDevSetupPrompt({
      ...defaultDevSetupOptions(),
      engine: "threejs",
      unityVersion: "unused",
      unityModules: "unused;",
    });
    expect(prompt).toContain("# Three.js Game Dev Environment");
    expect(prompt).toContain("Vite, TypeScript, Three.js");
    expect(prompt).toContain('"nodeVersion": "lts"');
    expect(prompt).toContain('"acceptLicenseAgreements": false');
    expect(prompt).toContain("Blender Lab MCP");
    expect(prompt).toContain("Audacity and MCP");
    expect(prompt).not.toContain("unity install");
    expect(prompt).not.toContain("unityVersion");
    expect(prompt).not.toContain("unity auth");
    expect(prompt).not.toContain("{{SETTINGS_JSON}}");
  });

  it("validates shared paths and client for both workflows", () => {
    for (const engine of ["unity", "threejs"] as const) {
      const options = { ...defaultDevSetupOptions(), engine };
      expect(() =>
        createDevSetupPrompt({ ...options, toolsDir: "relative" }),
      ).toThrow("Tools folder");
      expect(() =>
        createDevSetupPrompt({ ...options, agentMcpConfig: "C:\\bad|path" }),
      ).toThrow("MCP config path");
      expect(() =>
        createDevSetupPrompt({ ...options, agentClient: "unknown" }),
      ).toThrow("agent client");
    }
  });
});
