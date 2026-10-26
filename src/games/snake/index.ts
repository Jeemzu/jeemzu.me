import type { GameModule } from "../../game-player/contract";
import { GameLoop } from "../../game-player/render/GameLoop";
import { bindInput } from "./input";
import { createState, step, turn } from "./logic";
import { SnakeRenderer } from "./renderer";
import { SNAKE_CUES } from "./sounds";
import { GRID_SIZE } from "./config";

const snake: GameModule<Record<string, never>> = {
  async mount(host, ctx) {
    await ctx.audio.register(SNAKE_CUES);
    const view = new SnakeRenderer(host);
    let state = createState();
    let elapsed = 0;
    let running = false;

    const emitHud = () => ctx.emit({
      type: "hud",
      items: [
        { label: "Length", value: state.snake.length },
        { label: "Speed", value: `${(1 / state.moveDelay).toFixed(1)}/s` },
      ],
    });

    const loop = new GameLoop({
      update(dt) {
        view.animate(dt);
        if (!running || state.status !== "playing") return;
        elapsed += dt;
        while (elapsed >= state.moveDelay && state.status === "playing") {
          elapsed -= state.moveDelay;
          const previousScore = state.score;
          state = step(state);
          const ate = state.score !== previousScore;
          view.sync(state, ate);
          if (ate) {
            ctx.emit({ type: "score", score: state.score });
            emitHud();
            ctx.audio.play("snake.eat", { pan: state.snake[0].x / (GRID_SIZE - 1) * 2 - 1 });
          }
          if (state.status !== "playing") {
            ctx.audio.stopMusic(300);
            if (state.status === "lost") ctx.audio.play("snake.lose");
            ctx.emit({
              type: "gameOver",
              score: state.score,
              stats: [{ label: "Length", value: state.snake.length }, ...(state.status === "won" ? [{ label: "Board", value: "Complete" }] : [])],
            });
          }
        }
      },
      render: () => view.stage.render(),
    });
    const unbind = bindInput(
      (direction) => { state = turn(state, direction); },
      () => running && !loop.isPaused && state.status === "playing",
    );

    return {
      start() {
        state = createState();
        elapsed = 0;
        running = true;
        view.reset(state);
        ctx.emit({ type: "score", score: 0 });
        emitHud();
        ctx.audio.stop("snake.eat");
        ctx.audio.stop("snake.lose");
        ctx.audio.stopMusic(0);
        ctx.audio.playMusic("snake.music");
        view.stage.canvas.tabIndex = 0;
        view.stage.canvas.focus({ preventScroll: true });
        loop.resume();
        loop.start();
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
      resize: (size) => view.stage.resize(size),
      destroy() {
        running = false;
        loop.stop();
        unbind();
        ctx.audio.unregister("snake.");
        view.dispose();
      },
    };
  },
};

export default snake;
