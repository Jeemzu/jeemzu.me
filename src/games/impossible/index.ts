import type { GameModule } from "../../game-player/contract";
import { EVENT, JUMP_KEYS, RETRY_DELAY_MS, STATE } from "./config";
import { levelLabel, markCompleted, resolveLevel, type ImpossibleOptions, type ResolvedLevel } from "./levels";
import { IMPOSSIBLE_CUES } from "./sounds";
import { createPlatformer } from "./wasm";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && !!target.closest("input, textarea, select, [contenteditable='true']");

const impossible: GameModule<ImpossibleOptions> = {
  async mount(host, ctx) {
    const [level] = await Promise.all([resolveLevel(ctx.options.level), ctx.audio.register(IMPOSSIBLE_CUES)]);
    let current: ResolvedLevel = level;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "The (Im)Possible Game");
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%", cursor: "pointer" });
    host.appendChild(canvas);

    const game = await createPlatformer(canvas).catch((err: unknown) => {
      canvas.remove();
      ctx.audio.unregister("impossible.");
      throw err;
    });
    game.loadLevel(current.file);

    let raf = 0;
    let running = false;
    let paused = false;
    let retryTimer = 0;
    let retryPending = false;
    let completed = false;
    let attempts = 1;
    let lastScore = -1;
    let lastHud = "";

    const publishHud = () => {
      const items = [
        { label: "Level", value: levelLabel(current) },
        { label: "Progress", value: `${Math.floor(game.progress() / 10)}%` },
        { label: "Attempt", value: attempts },
      ];
      const key = JSON.stringify(items);
      if (key !== lastHud) {
        lastHud = key;
        ctx.emit({ type: "hud", items });
      }
    };

    const scheduleRetry = () => {
      retryPending = true;
      retryTimer = window.setTimeout(() => {
        retryTimer = 0;
        retryPending = false;
        attempts++;
        game.startRun();
      }, RETRY_DELAY_MS);
    };

    const complete = () => {
      completed = true;
      if (current.official !== null) markCompleted(current.official);
      ctx.emit({ type: "levelComplete", level: current.official ?? 0 });
      ctx.emit({
        type: "panel",
        panel: {
          title: "Level Complete",
          actions: [
            ...(current.next !== null ? [{ id: "next", label: "Next Level" }] : []),
            { id: "replay", label: "Replay" },
            { id: "menu", label: ctx.options.level.kind === "draft" ? "Back to Editor" : "Level Select" },
          ],
        },
      });
    };

    const poll = () => {
      raf = requestAnimationFrame(poll);
      if (!running || paused) return;
      const events = game.takeEvents();
      if (events & EVENT.jump) ctx.audio.play("impossible.jump");
      if (events & EVENT.land) ctx.audio.play("impossible.land");
      if (events & EVENT.death) ctx.audio.play("impossible.death");
      if (events & EVENT.complete) ctx.audio.play("impossible.complete");

      const score = game.score();
      if (score !== lastScore) {
        lastScore = score;
        ctx.emit({ type: "score", score });
      }
      publishHud();

      const state = game.state();
      if (state === STATE.dead && !retryPending) scheduleRetry();
      if (state === STATE.completed && !completed) complete();
    };

    const canJump = () => running && !paused && !completed;
    const press = () => {
      if (!canJump()) return;
      game.jump();
      game.setJumpHeld(true);
    };
    const release = () => game.setJumpHeld(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (!JUMP_KEYS.has(e.code) || isTyping(e.target) || !canJump()) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (JUMP_KEYS.has(e.code)) release();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      press();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", release);
    window.addEventListener("blur", release);
    canvas.addEventListener("pointerdown", onPointerDown);

    const restart = () => {
      window.clearTimeout(retryTimer);
      retryTimer = 0;
      retryPending = false;
      completed = false;
      attempts = 1;
      lastScore = -1;
      lastHud = "";
      release();
      ctx.emit({ type: "panel", panel: null });
      game.startRun();
      if (paused) {
        paused = false;
        game.setPaused(false);
      }
      running = true;
      if (!raf) raf = requestAnimationFrame(poll);
    };

    return {
      start: restart,
      pause() {
        if (paused) return;
        paused = true;
        release();
        if (retryPending) {
          window.clearTimeout(retryTimer);
          retryTimer = 0;
        }
        game.setPaused(true);
      },
      resume() {
        if (!paused) return;
        paused = false;
        game.setPaused(false);
        if (retryPending && !retryTimer) scheduleRetry();
      },
      resize({ cssWidth, cssHeight, dpr }) {
        if (cssWidth <= 0 || cssHeight <= 0) return;
        game.setViewport(Math.round(cssWidth * dpr), Math.round(cssHeight * dpr));
      },
      act(action) {
        if (action === "replay") return restart();
        if (action === "next" && current.next !== null) {
          const next = current.next;
          void resolveLevel({ kind: "official", number: next })
            .then((resolved) => {
              current = resolved;
              game.loadLevel(resolved.file);
              restart();
            })
            .catch((err: unknown) => {
              console.error("[impossible] could not load next level", err);
              ctx.emit({ type: "panel", panel: { title: "Could not load the next level", actions: [{ id: "replay", label: "Replay" }, { id: "menu", label: "Level Select" }] } });
            });
          return;
        }
        throw new Error(`Unknown action: ${action}`);
      },
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
        window.clearTimeout(retryTimer);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("blur", release);
        canvas.removeEventListener("pointerdown", onPointerDown);
        game.shutdown();
        canvas.remove();
        ctx.audio.unregister("impossible.");
      },
    };
  },
};

export default impossible;
