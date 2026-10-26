import type { CueDef, PlayOptions, VoiceHandle } from "./types";
import {
  loadSettings,
  sanitizeSettings,
  saveSettings,
  type AudioSettings,
  type BusName,
} from "./settings";

const BUSES: BusName[] = ["sfx", "music", "ui"];
const RAMP = 0.015;

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface Bus {
  volume: GainNode;
  duck: GainNode;
}

/** Picks a variant index, avoiding an immediate repeat when more than one exists. */
export function pickVariant(count: number, last: number, rand: () => number = Math.random): number {
  if (count <= 1) return 0;
  if (last < 0 || last >= count) return Math.floor(rand() * count);
  const i = Math.floor(rand() * (count - 1));
  return i >= last && last >= 0 ? i + 1 : i;
}

const dbToGain = (db: number) => Math.pow(10, db / 20);
const jitter = (range: number | undefined) => (range ? (Math.random() * 2 - 1) * range : 0);

/**
 * Shared Web Audio engine for every game on the site.
 * Graph: voice → cue gain → [pan] → bus volume → bus duck → master → limiter → destination.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses = new Map<BusName, Bus>();
  private cues = new Map<string, CueDef>();
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private decoded = new Map<string, AudioBuffer>();
  private voices = new Map<string, Voice[]>();
  private lastTrigger = new Map<string, number>();
  private lastVariant = new Map<string, number>();
  private music: { id: string; voice: Voice } | null = null;
  private settings: AudioSettings = loadSettings();
  private listeners = new Set<() => void>();
  private unlockInstalled = false;
  private paused = false;

  // ── Settings ──────────────────────────────────────────────────────────
  getSettings = (): AudioSettings => this.settings;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  updateSettings(patch: Partial<AudioSettings>): void {
    this.settings = sanitizeSettings({ ...this.settings, ...patch });
    saveSettings(this.settings);
    this.applySettings();
    this.listeners.forEach((l) => l());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = globalThis.AudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(limiter);
    for (const name of BUSES) {
      const volume = ctx.createGain();
      const duck = ctx.createGain();
      volume.connect(duck).connect(master);
      this.buses.set(name, { volume, duck });
    }
    this.ctx = ctx;
    this.master = master;
    this.applySettings(true);
    this.installUnlock();
    return ctx;
  }

  /** Browsers start AudioContexts suspended until a user gesture. */
  private installUnlock(): void {
    if (this.unlockInstalled || typeof window === "undefined") return;
    this.unlockInstalled = true;
    const unlock = () => {
      if (this.ctx?.state === "suspended" && !this.paused) void this.ctx.resume();
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }

  private applySettings(immediate = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const set = (param: AudioParam, v: number) =>
      immediate ? param.setValueAtTime(v, ctx.currentTime) : param.setTargetAtTime(v, ctx.currentTime, RAMP);
    set(this.master.gain, this.settings.muted ? 0 : this.settings.master);
    for (const name of BUSES) set(this.buses.get(name)!.volume.gain, this.settings[name]);
  }

  /** Freezes all audio (used while a game is paused). */
  suspend(): void {
    this.paused = true;
    void this.ctx?.suspend();
  }

  resume(): void {
    this.paused = false;
    void this.ctx?.resume();
  }

  // ── Cue registry ──────────────────────────────────────────────────────
  /** Registers cues and starts decoding them. Resolves once all buffers are ready (failures are skipped). */
  async register(defs: CueDef[]): Promise<void> {
    const ctx = this.ensureContext();
    for (const def of defs) this.cues.set(def.id, def);
    if (!ctx) return;
    if (ctx.state === "suspended" && !this.paused) void ctx.resume();
    const urls = defs.flatMap((d) => (Array.isArray(d.src) ? d.src : [d.src]));
    await Promise.all(urls.map((url) => this.load(ctx, url)));
  }

  /** Stops and forgets all cues under a namespace, e.g. `unregister("snake.")`. Buffers stay cached. */
  unregister(prefix: string): void {
    for (const id of [...this.cues.keys()]) {
      if (!id.startsWith(prefix)) continue;
      this.stop(id);
      this.cues.delete(id);
    }
    if (this.music?.id.startsWith(prefix)) this.stopMusic();
  }

  private load(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(url);
    if (!pending) {
      pending = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${url}`);
          return r.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => {
          this.decoded.set(url, buf);
          return buf;
        })
        .catch((err) => {
          console.warn("[audio] failed to load", url, err);
          return null;
        });
      this.buffers.set(url, pending);
    }
    return pending;
  }

  // ── Playback ──────────────────────────────────────────────────────────
  play(id: string, opts: PlayOptions = {}): VoiceHandle | null {
    const ctx = this.ctx;
    const def = this.cues.get(id);
    if (!ctx || !def) return null;

    const now = performance.now();
    if (def.cooldownMs && now - (this.lastTrigger.get(id) ?? -Infinity) < def.cooldownMs) return null;

    const srcs = Array.isArray(def.src) ? def.src : [def.src];
    const vi = pickVariant(srcs.length, this.lastVariant.get(id) ?? -1);
    const buffer = this.decoded.get(srcs[vi]);
    if (!buffer) return null;
    this.lastTrigger.set(id, now);
    this.lastVariant.set(id, vi);

    const active = this.voices.get(id) ?? [];
    const max = def.maxVoices ?? 4;
    while (active.length >= max) this.stopVoice(active.shift()!, 10);

    const voice = this.startVoice(ctx, buffer, def, opts);
    active.push(voice);
    this.voices.set(id, active);
    voice.source.onended = () => {
      const list = this.voices.get(id);
      if (list) this.voices.set(id, list.filter((v) => v !== voice));
    };
    if (def.duck) this.duck(def.duck.bus, def.duck.amountDb, def.duck.attackMs, def.duck.holdMs ?? buffer.duration * 1000, def.duck.releaseMs);
    return { stop: (fadeMs) => this.stopVoice(voice, fadeMs) };
  }

  private startVoice(ctx: AudioContext, buffer: AudioBuffer, def: CueDef, opts: PlayOptions): Voice {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = !!def.loop;
    const semis = jitter(def.pitchJitter);
    source.playbackRate.value = (opts.rate ?? 1) * Math.pow(2, semis / 12);

    const gain = ctx.createGain();
    gain.gain.value = (def.gain ?? 1) * (opts.gain ?? 1) * dbToGain(jitter(def.gainJitter));
    let tail: AudioNode = gain;
    if (opts.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pan);
      tail = pan;
    }
    tail.connect(this.buses.get(def.bus ?? "sfx")!.volume);
    source.connect(gain);
    source.start();
    return { source, gain };
  }

  private stopVoice(voice: Voice, fadeMs = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    try {
      if (fadeMs > 0) {
        voice.gain.gain.setTargetAtTime(0, t, fadeMs / 1000 / 4);
        voice.source.stop(t + fadeMs / 1000);
      } else {
        voice.source.stop();
      }
    } catch {
      /* already stopped */
    }
  }

  stop(id: string, fadeMs = 0): void {
    for (const v of this.voices.get(id) ?? []) this.stopVoice(v, fadeMs);
    this.voices.delete(id);
  }

  stopAll(fadeMs = 0): void {
    for (const id of [...this.voices.keys()]) this.stop(id, fadeMs);
    this.stopMusic(fadeMs);
  }

  /** Starts a looping music cue on the music bus, crossfading from any current track. */
  playMusic(id: string, fadeMs = 600): void {
    const ctx = this.ctx;
    const def = this.cues.get(id);
    if (!ctx || !def || this.music?.id === id) return;
    const src = Array.isArray(def.src) ? def.src[0] : def.src;
    const buffer = this.decoded.get(src);
    if (!buffer) return;
    this.stopMusic(fadeMs);
    const voice = this.startVoice(ctx, buffer, { ...def, bus: "music", loop: true }, {});
    const target = voice.gain.gain.value;
    voice.gain.gain.setValueAtTime(0, ctx.currentTime);
    voice.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + fadeMs / 1000);
    this.music = { id, voice };
  }

  stopMusic(fadeMs = 600): void {
    if (!this.music) return;
    this.stopVoice(this.music.voice, fadeMs);
    this.music = null;
  }

  /** Dips a bus by `amountDb`, holds, then releases back to unity. */
  duck(bus: BusName, amountDb: number, attackMs = 30, holdMs = 200, releaseMs = 400): void {
    const ctx = this.ctx;
    const node = this.buses.get(bus)?.duck;
    if (!ctx || !node) return;
    const t = ctx.currentTime;
    const p = node.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(dbToGain(-Math.abs(amountDb)), t + attackMs / 1000);
    p.setValueAtTime(dbToGain(-Math.abs(amountDb)), t + (attackMs + holdMs) / 1000);
    p.linearRampToValueAtTime(1, t + (attackMs + holdMs + releaseMs) / 1000);
  }
}

export const audioEngine = new AudioEngine();

declare global {
  interface Window {
    /** Bridge for non-JS games (WASM) to trigger shared cues. */
    jzAudio?: {
      play(id: string): void;
      playMusic(id: string): void;
      stopMusic(): void;
    };
  }
}

if (typeof window !== "undefined") {
  window.jzAudio = {
    play: (id) => void audioEngine.play(id),
    playMusic: (id) => audioEngine.playMusic(id),
    stopMusic: () => audioEngine.stopMusic(),
  };
}
