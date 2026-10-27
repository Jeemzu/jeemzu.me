import type { LevelFile } from "../../lib/LevelSchema";
import { buildLevelCommands } from "../../utils/levelLoader";

interface EmscriptenModule {
  cwrap: (name: string, ret: string | null, args: string[]) => (...args: number[]) => number;
}

type ModuleFactory = (opts: {
  canvas: HTMLCanvasElement;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}) => Promise<EmscriptenModule>;

const FACTORY = "platformerModule";
const SCRIPT_SRC = "/wasm/platformer.js";
let factoryPromise: Promise<ModuleFactory> | null = null;

function loadFactory(): Promise<ModuleFactory> {
  const existing = (window as unknown as Record<string, unknown>)[FACTORY];
  if (typeof existing === "function") return Promise.resolve(existing as ModuleFactory);
  factoryPromise ??= new Promise<ModuleFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const factory = (window as unknown as Record<string, unknown>)[FACTORY];
      if (typeof factory === "function") resolve(factory as ModuleFactory);
      else reject(new Error(`${SCRIPT_SRC} did not define ${FACTORY}`));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Could not load ${SCRIPT_SRC}`));
    };
    document.body.appendChild(script);
  }).catch((err: unknown) => {
    factoryPromise = null;
    throw err;
  });
  return factoryPromise;
}

export interface PlatformerApi {
  state(): number;
  score(): number;
  /** Thousandths of the level completed. */
  progress(): number;
  takeEvents(): number;
  jump(): void;
  setJumpHeld(held: boolean): void;
  startRun(): void;
  setViewport(width: number, height: number): void;
  setPaused(paused: boolean): void;
  loadLevel(level: LevelFile): void;
  shutdown(): void;
}

/** Instantiates the SDL/WASM platformer into `canvas`. */
export function createPlatformer(canvas: HTMLCanvasElement): Promise<PlatformerApi> {
  // SDL finds its canvas via the "#canvas" selector, so instantiations are serialized and the id moves to the newest canvas.
  const run = creating.then(() => instantiate(canvas));
  creating = run.catch(() => undefined);
  return run;
}
let creating: Promise<unknown> = Promise.resolve();

async function instantiate(canvas: HTMLCanvasElement): Promise<PlatformerApi> {
  const factory = await loadFactory();
  document.querySelectorAll("#canvas").forEach((other) => { if (other !== canvas) other.removeAttribute("id"); });
  canvas.id = "canvas";
  const mod = await factory({
    canvas,
    print: (text) => console.info(`[impossible] ${text}`),
    printErr: (text) => console.warn(`[impossible] ${text}`),
  });
  const fn = (name: string, args: number) => mod.cwrap(name, args < 0 ? "number" : null, Array<string>(Math.max(0, args)).fill("number"));
  const getState = fn("get_state", -1);
  const getScore = fn("get_score", -1);
  const getProgress = fn("get_progress", -1);
  const takeEvents = fn("take_events", -1);
  const doJump = fn("do_jump", 0);
  const setJumpHeld = fn("set_jump_held", 1);
  const startRun = fn("start_run", 0);
  const setViewport = fn("set_viewport", 2);
  const setPaused = fn("set_paused", 1);
  const shutdown = fn("shutdown", 0);
  const level = {
    begin: fn("level_begin", 0),
    end: fn("level_end", 0),
    spike: fn("level_add_spike", 2),
    pit: fn("level_add_pit", 2),
    platform: fn("level_add_platform", 4),
    finish: fn("level_set_finish", 1),
  };
  let alive = true;
  return {
    state: () => getState(),
    score: () => getScore(),
    progress: () => getProgress(),
    takeEvents: () => takeEvents(),
    jump: () => void doJump(),
    setJumpHeld: (held) => void setJumpHeld(held ? 1 : 0),
    startRun: () => void startRun(),
    setViewport: (width, height) => void setViewport(width, height),
    setPaused: (paused) => void setPaused(paused ? 1 : 0),
    loadLevel(file) {
      for (const cmd of buildLevelCommands(file)) {
        switch (cmd.cmd) {
          case "begin": level.begin(); break;
          case "spike": level.spike(cmd.worldX, cmd.worldY); break;
          case "pit": level.pit(cmd.worldX, cmd.width); break;
          case "platform": level.platform(cmd.worldX, cmd.worldY, cmd.width, cmd.height); break;
          case "end": level.end(); break;
          case "set_finish": level.finish(cmd.worldX); break;
        }
      }
    },
    shutdown() {
      if (!alive) return;
      alive = false;
      shutdown();
    },
  };
}
