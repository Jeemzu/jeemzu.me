import type { GameModule } from "../../game-player/contract";
import { GameLoop } from "../../game-player/render/GameLoop";
import { BrickInput } from "./input";
import { createState, launch, step } from "./logic";
import { TOTAL_LEVELS } from "./levels";
import type { BrickOptions } from "./Options";
import { saveProgress } from "./progress";
import { BrickRenderer } from "./renderer";
import { BRICK_CUES } from "./sounds";

const brick: GameModule<BrickOptions> = {
  async mount(host, ctx) {
    await ctx.audio.register(BRICK_CUES);
    const view = new BrickRenderer(host);
    let state = createState(ctx.options.level);
    let running = false;
    let lastHud = "";
    let lastPhase = "";
    const sync = () => {
      view.sync(state);
      const powers = [state.sticky && "Sticky", state.paddleWidth > 110 && "Expand", state.paddleWidth < 110 && "Shrink", state.speedMultiplier < 1 && "Slow", state.speedMultiplier > 1 && "Fast"].filter(Boolean).join(", ");
      const hud = `${state.level}/${state.lives}/${state.balls.length}/${powers}`;
      if (hud !== lastHud) {
        lastHud = hud;
        ctx.emit({ type: "hud", items: [{ label: "Level", value: state.level }, { label: "Lives", value: state.lives },
          { label: "Balls", value: state.balls.length }, ...(powers ? [{ label: "Power", value: powers }] : [])] });
      }
      if (state.phase !== lastPhase) {
        lastPhase = state.phase;
        if (state.phase === "serving") ctx.emit({ type: "panel", panel: { title: "Ready", actions: [] } });
        else if (state.phase === "playing") ctx.emit({ type: "panel", panel: null });
      }
    };
    const begin = (level: number, score = 0, lives = 3) => {
      state = createState(level, score, lives);
      lastHud = lastPhase = "";
      input.clear();
      view.reset();
      ctx.emit({ type: "score", score });
      sync();
      view.stage.canvas.focus({ preventScroll: true });
    };
    const loop = new GameLoop({
      update(dt) {
        if (!running) return;
        view.animate(dt);
        const score = state.score;
        for (const event of step(state, dt, input.value)) {
          if (event.type === "break") { view.shatter(event.x, event.y, event.key); ctx.audio.play("brickbreak.break"); }
          else if (event.type === "complete") {
            saveProgress(state.level, state.score);
            ctx.audio.play("brickbreak.break");
            ctx.emit({ type: "levelComplete", level: state.level });
            ctx.emit({ type: "panel", panel: { title: `Level ${state.level} Complete`, actions: [
              ...(state.level < TOTAL_LEVELS ? [{ id: "next", label: "Next Level" }] : []),
              { id: "replay", label: "Replay" }, { id: "menu", label: "Level Select" },
            ] } });
          } else ctx.audio.play(event.type === "wall" ? "brickbreak.wall" : event.type === "lose" ? "brickbreak.lose" : "brickbreak.break");
        }
        if (score !== state.score) ctx.emit({ type: "score", score: state.score });
        if (state.phase === "over" && running) {
          running = false;
          saveProgress(0, state.score);
          ctx.emit({ type: "gameOver", score: state.score, stats: [{ label: "Level", value: state.level }] });
        }
        sync();
      },
      render: () => view.stage.render(),
    });
    const input = new BrickInput(view.stage.canvas, () => { launch(state); sync(); }, () => running && !loop.isPaused && (state.phase === "serving" || state.phase === "playing"));
    return {
      start() {
        running = true;
        view.stage.canvas.tabIndex = 0;
        for (const cue of BRICK_CUES) ctx.audio.stop(cue.id);
        begin(ctx.options.level);
        loop.resume(); loop.start();
      },
      act(action) {
        if (state.phase !== "complete") throw new Error("Brick Break is not awaiting a level action.");
        if (action === "next" && state.level < TOTAL_LEVELS) begin(state.level + 1, state.score, state.lives);
        else if (action === "replay") begin(state.level);
        else throw new Error(`Unknown Brick Break action: ${action}`);
      },
      pause() { input.clear(); loop.pause(); },
      resume: () => loop.resume(),
      resize: size => view.stage.resize(size),
      destroy() { running = false; loop.stop(); input.destroy(); ctx.audio.unregister("brickbreak."); view.dispose(); },
    };
  },
};
export default brick;
