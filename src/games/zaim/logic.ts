import { ENDURANCE_THRESHOLD, ENDURANCE_TIME, REFLEX_ROUNDS, SPEED_TIME, TIME_BONUS, type GameMode } from "./config";

export interface AimState {
  mode: GameMode;
  phase: "countdown" | "waiting" | "active" | "between" | "miss" | "over";
  phaseTime: number; elapsed: number; targetStarted: number;
  remaining: number; score: number; stage: number; stageClicks: number;
  targets: boolean[]; times: number[]; missedCell: number | null;
}
export const averageReaction = (times: number[]) => times.length ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 9999;
export const encodeReflex = (times: number[]) => Math.max(0, 10000 - averageReaction(times));
export const decodeReflex = (score: number) => Math.max(0, 10000 - score);
export function createState(mode: GameMode): AimState {
  return { mode, phase: mode === "speed" ? "active" : "countdown", phaseTime: mode === "reflex" ? 2.9 : 2.6,
    elapsed: 0, targetStarted: 0, remaining: mode === "speed" ? SPEED_TIME : ENDURANCE_TIME, score: 0,
    stage: 1, stageClicks: 0, targets: Array<boolean>(mode === "reflex" ? 4 : 16).fill(mode === "speed"), times: [], missedCell: null };
}
function activate(state: AimState, count: number, random: () => number, exclude = -1): void {
  const inactive = state.targets.flatMap((active, index) => !active && index !== exclude ? [index] : []);
  for (let n = 0; n < count && inactive.length; n++) {
    const [index] = inactive.splice(Math.floor(random() * inactive.length), 1);
    state.targets[index] = true;
  }
}
function wait(state: AimState, random: () => number): void {
  state.phase = "waiting";
  state.phaseTime = 1 + random() * 2;
}
function finish(state: AimState): void {
  state.phase = "over";
  state.targets.fill(false);
  if (state.mode === "reflex") state.score = encodeReflex(state.times);
}
export function advance(state: AimState, dt: number, random = Math.random): void {
  while (dt > 1e-9 && state.phase !== "over") {
    if (state.phase === "active") {
      const elapsed = state.mode === "reflex" ? dt : Math.min(dt, state.remaining);
      state.elapsed += elapsed;
      if (state.mode !== "reflex") {
        state.remaining = Math.max(0, state.remaining - elapsed);
        if (!state.remaining) finish(state);
      }
      dt -= elapsed;
    } else {
      const elapsed = Math.min(dt, state.phaseTime);
      state.elapsed += elapsed;
      state.phaseTime = Math.max(0, state.phaseTime - elapsed);
      dt -= elapsed;
      if (state.phaseTime <= 1e-9) {
        if (state.phase === "miss") finish(state);
        else if (state.phase === "countdown") {
          if (state.mode === "reflex") wait(state, random);
          else { state.phase = "active"; activate(state, 3, random); }
        } else if (state.phase === "between") {
          if (state.times.length >= REFLEX_ROUNDS) finish(state);
          else wait(state, random);
        } else {
          state.phase = "active";
          activate(state, 1, random);
          state.targetStarted = state.elapsed;
        }
      }
    }
  }
}
export function click(state: AimState, cell: number, random = Math.random): "hit" | "miss" | null {
  if (state.phase !== "active") return null;
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.targets.length) throw new RangeError("Invalid zAim cell.");
  if (!state.targets[cell]) {
    state.missedCell = cell;
    state.phase = "miss";
    state.phaseTime = 0.18;
    return "miss";
  }
  state.targets[cell] = false;
  if (state.mode === "endurance") {
    state.score += 10;
    if (++state.stageClicks === ENDURANCE_THRESHOLD) {
      state.stage++;
      state.stageClicks = 0;
      state.remaining += TIME_BONUS;
    }
    activate(state, 1, random, cell);
  } else if (state.mode === "speed") {
    state.score++;
    if (state.targets.every(active => !active)) state.targets.fill(true);
  } else {
    state.times.push(Math.round((state.elapsed - state.targetStarted) * 1000));
    state.score = encodeReflex(state.times);
    state.phase = "between";
    state.phaseTime = 0.9;
  }
  return "hit";
}
export function announcement(state: AimState): string | null {
  if (state.phase === "countdown") {
    const elapsed = (state.mode === "reflex" ? 2.9 : 2.6) - state.phaseTime;
    const step = Math.floor((elapsed + 1e-9) / 0.7);
    return step < 3 ? String(3 - step) : "GO!";
  }
  if (state.phase === "waiting") return "Wait";
  if (state.phase === "between") return `${state.times.at(-1)} ms`;
  return null;
}
