import { useSyncExternalStore } from "react";
import { audioEngine } from "./AudioEngine";
import type { AudioSettings } from "./settings";

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getSettings);
}
