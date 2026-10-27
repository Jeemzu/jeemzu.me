import type { GameModule } from "../../game-player/contract";
import { GameLoop } from "../../game-player/render/GameLoop";
import { gravityInterval } from "./config";
import { TetrisInput, type InputAction } from "./input";
import { createState, drop, hardDrop, move, rotate, type DropResult } from "./logic";
import { SHAPES } from "./pieces";
import { TetrisRenderer } from "./renderer";
import { TETRIS_CUES } from "./sounds";
import { PIECE_COLORS } from "./style";

const SOFT_DROP_INTERVAL = 0.06;

const tetris: GameModule<Record<string, never>> = {
  async mount(host, ctx) {
    await ctx.audio.register(TETRIS_CUES);
    const view = new TetrisRenderer(host);
    let state = createState();
    let running = false;
    let elapsed = 0;
    const emitHud = () => {
      const shape = SHAPES[state.next][0];
      const minRow = Math.min(...shape.map(([row]) => row));
      ctx.emit({ type: "hud", items: [
        { label: "Next", value: {
          columns: 4, rows: 2, color: `#${PIECE_COLORS[state.next].toString(16).padStart(6, "0")}`,
          cells: shape.map(([row, col]) => ({ row: row - minRow, col })),
        } },
        { label: "Level", value: state.level },
        { label: "Lines", value: state.lines },
      ] });
    };
    const apply = (result: DropResult) => {
      const previous = state;
      state = result.state;
      view.sync(state);
      if (state.score !== previous.score) ctx.emit({ type: "score", score: state.score });
      if (result.locked) {
        ctx.audio.play("tetris.lock");
        emitHud();
      }
      if (result.clearedRows.length) {
        view.clearRows(result.clearedRows);
        ctx.audio.play(result.clearedRows.length === 4 ? "tetris.tetris" : `tetris.line-${result.clearedRows.length}`);
      }
      if (state.level > previous.level) ctx.audio.play("tetris.level-up");
      if (previous.status === "playing" && state.status === "over") {
        ctx.audio.play("tetris.game-over");
        ctx.emit({ type: "gameOver", score: state.score, stats: [
          { label: "Level", value: state.level }, { label: "Lines", value: state.lines },
        ] });
      }
    };
    const horizontal = (direction: number) => {
      const next = move(state, 0, direction);
      if (next === state) return;
      state = next;
      view.sync(state);
      ctx.audio.play("tetris.move");
    };
    const action = (value: InputAction) => {
      if (value === "left" || value === "right") horizontal(value === "left" ? -1 : 1);
      else if (value === "rotate") {
        const next = rotate(state);
        if (next !== state) {
          state = next;
          view.sync(state);
          ctx.audio.play("tetris.rotate");
        }
      } else {
        ctx.audio.play("tetris.hard-drop");
        apply(hardDrop(state));
        elapsed = 0;
      }
    };
    const loop = new GameLoop({
      update(dt) {
        view.animate(dt);
        if (!running || state.status !== "playing") return;
        input.update(dt);
        elapsed += dt;
        const interval = input.softDrop ? Math.min(gravityInterval(state.level), SOFT_DROP_INTERVAL) : gravityInterval(state.level);
        // Banked gravity time must not cascade into several rows when soft drop shortens the interval.
        elapsed = Math.min(elapsed, interval);
        if (elapsed >= interval) {
          elapsed = 0;
          const result = drop(state);
          apply(result);
          if (!result.locked && input.softDrop) ctx.audio.play("tetris.soft-drop");
        }
      },
      render: () => view.stage.render(),
    });
    const input = new TetrisInput(action, () => running && !loop.isPaused && state.status === "playing");
    return {
      start() {
        state = createState();
        running = true;
        elapsed = 0;
        input.clear();
        for (const cue of TETRIS_CUES) ctx.audio.stop(cue.id);
        view.reset(state);
        ctx.emit({ type: "score", score: 0 });
        emitHud();
        view.stage.canvas.tabIndex = 0;
        view.stage.canvas.focus({ preventScroll: true });
        loop.resume();
        loop.start();
      },
      pause() { input.clear(); loop.pause(); },
      resume: () => loop.resume(),
      resize: (size) => view.stage.resize(size),
      destroy() {
        running = false;
        loop.stop();
        input.destroy();
        ctx.audio.unregister("tetris.");
        view.dispose();
      },
    };
  },
};
export default tetris;
