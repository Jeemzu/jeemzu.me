import type { BusName } from "./settings";

export interface DuckSpec {
  bus: BusName;
  /** Attenuation applied to the ducked bus, in dB (positive number). */
  amountDb: number;
  attackMs?: number;
  holdMs?: number;
  releaseMs?: number;
}

export interface CueDef {
  /** Globally unique id, namespaced by game: e.g. `snake.eat`. */
  id: string;
  /** One file or several variants (selected without immediate repeats). */
  src: string | string[];
  bus?: BusName;
  /** Linear gain multiplier for this cue. */
  gain?: number;
  /** Random pitch offset range in semitones (±). */
  pitchJitter?: number;
  /** Random gain offset range in dB (±). */
  gainJitter?: number;
  /** Concurrent voice cap; oldest voice is stolen when exceeded. */
  maxVoices?: number;
  /** Ignore triggers closer together than this. */
  cooldownMs?: number;
  loop?: boolean;
  /** Temporarily lowers another bus while this cue plays (e.g. music under a big hit). */
  duck?: DuckSpec;
}

export interface PlayOptions {
  /** Extra linear gain on top of the cue's own gain. */
  gain?: number;
  /** Playback-rate multiplier (1 = normal). */
  rate?: number;
  /** Stereo pan, -1 (left) … 1 (right). */
  pan?: number;
}

export interface VoiceHandle {
  stop(fadeMs?: number): void;
}
