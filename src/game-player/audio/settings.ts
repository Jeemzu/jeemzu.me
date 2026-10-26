export type BusName = "sfx" | "music" | "ui";

export interface AudioSettings {
  master: number;
  sfx: number;
  music: number;
  ui: number;
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  master: 0.8,
  sfx: 1,
  music: 0.6,
  ui: 0.8,
  muted: false,
};

const STORAGE_KEY = "jz.audio.v1";

const clamp01 = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

export function sanitizeSettings(raw: unknown): AudioSettings {
  const src = (raw && typeof raw === "object" ? raw : {}) as Partial<AudioSettings>;
  const d = DEFAULT_AUDIO_SETTINGS;
  return {
    master: clamp01(src.master, d.master),
    sfx: clamp01(src.sfx, d.sfx),
    music: clamp01(src.music, d.music),
    ui: clamp01(src.ui, d.ui),
    muted: typeof src.muted === "boolean" ? src.muted : d.muted,
  };
}

export function loadSettings(storage?: Pick<Storage, "getItem">): AudioSettings {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn("[audio] could not read saved settings", error);
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveSettings(
  settings: AudioSettings,
  storage?: Pick<Storage, "setItem">,
): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("[audio] could not save settings", error);
  }
}
