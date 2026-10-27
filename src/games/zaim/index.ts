import type { GameModule } from "../../game-player/contract";
import { GameLoop } from "../../game-player/render/GameLoop";
import type { GameStat } from "../../lib/GameTypes";
import type { AimOptions } from "./config";
import { cellAt } from "./grid";
import { bindInput } from "./input";
import { advance, announcement, averageReaction, click, createState } from "./logic";
import { AimRenderer } from "./renderer";
import { AIM_CUES } from "./sounds";

const aim: GameModule<AimOptions> = {
  async mount(host, ctx) {
    await ctx.audio.register(AIM_CUES);
    const view = new AimRenderer(host, ctx.options);
    let state = createState(ctx.options.mode);
    let running = false;
    let previousTime = 0;
    let lastAnnouncement: string | null | undefined;
    const publish = () => {
      view.sync(state);
      const text = announcement(state);
      if (text !== lastAnnouncement) {
        lastAnnouncement = text;
        ctx.emit({ type: "panel", panel: text ? { title: text, actions: [] } : null });
      }
      if (state.phase === "over" && running) {
        running = false;
        let stats: GameStat[];
        if (state.mode === "reflex") {
          stats = state.times.map((time, i) => ({ label: `Round ${i + 1}`, value: `${time}ms` }));
          if (state.times.length > 1) stats.push({ label: "Average", value: `${averageReaction(state.times)}ms` });
          if (state.missedCell !== null) stats.push({ label: "Result", value: "Missed!" });
        } else stats = state.mode === "endurance"
          ? [{ label: "Tiles Hit", value: state.score / 10 }, { label: "Stage", value: state.stage }]
          : [{ label: "Tiles Clicked", value: state.score }];
        ctx.emit({ type: "gameOver", score: state.score, stats });
      }
    };
    // Reaction measurements and mode timers use real active time, not the render loop's clamped physics delta.
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, (now - previousTime) / 1000);
      previousTime = now;
      if (running) { advance(state, dt); view.animate(dt); }
    };
    const loop = new GameLoop({
      update() { tick(); publish(); },
      render: () => view.stage.render(),
    });
    const unbind = bindInput(view.stage.canvas, () => running && !loop.isPaused, (x, y) => {
      tick();
      const cell = cellAt(state.mode, x, y);
      if (cell !== null && click(state, cell) === "hit") {
        ctx.audio.play("zaim.hit");
        view.hit(cell);
        ctx.emit({ type: "score", score: state.score });
      }
      publish();
    }, (x, y) => view.pointer(x, y), () => view.hidePointer());
    return {
      start() {
        state = createState(ctx.options.mode);
        running = true;
        previousTime = performance.now();
        lastAnnouncement = undefined;
        view.reset();
        ctx.audio.stop("zaim.hit");
        ctx.emit({ type: "score", score: 0 });
        publish();
        loop.resume(); loop.start();
      },
      pause() { tick(); publish(); view.hidePointer(); loop.pause(); },
      resume() { previousTime = performance.now(); loop.resume(); },
      resize: size => view.stage.resize(size),
      destroy() { running = false; loop.stop(); unbind(); ctx.audio.unregister("zaim."); view.dispose(); },
    };
  },
};
export default aim;
