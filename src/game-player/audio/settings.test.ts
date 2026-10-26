import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS, loadSettings, sanitizeSettings, saveSettings } from "./settings";

afterEach(() => vi.restoreAllMocks());

describe("audio settings", () => {
  it.each([undefined, null, "broken", [], 1])("defaults invalid input %s", (raw) => {
    expect(sanitizeSettings(raw)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });
  it("clamps finite values and rejects invalid values", () => {
    expect(sanitizeSettings({ master: 2, sfx: -1, music: NaN, ui: Infinity, muted: "yes" })).toEqual({
      ...DEFAULT_AUDIO_SETTINGS, master: 1, sfx: 0,
    });
    expect(sanitizeSettings({ master: 0, muted: true })).toMatchObject({ master: 0, muted: true });
  });
  it("loads partial saved settings", () => {
    expect(loadSettings({ getItem: () => '{"music":0.25,"muted":true}' })).toEqual({
      ...DEFAULT_AUDIO_SETTINGS, music: 0.25, muted: true,
    });
  });
  it("reports malformed JSON and uses defaults", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadSettings({ getItem: () => "{" })).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(warn).toHaveBeenCalledOnce();
  });
  it("reports blocked storage without breaking gameplay", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadSettings({ getItem: () => { throw new Error("Blocked"); } })).toEqual(DEFAULT_AUDIO_SETTINGS);
    saveSettings(DEFAULT_AUDIO_SETTINGS, { setItem: () => { throw new Error("Quota"); } });
    expect(warn).toHaveBeenCalledTimes(2);
  });
  it("persists settings using the versioned key", () => {
    const setItem = vi.fn();
    saveSettings(DEFAULT_AUDIO_SETTINGS, { setItem });
    expect(setItem).toHaveBeenCalledWith("jz.audio.v1", JSON.stringify(DEFAULT_AUDIO_SETTINGS));
  });
});
