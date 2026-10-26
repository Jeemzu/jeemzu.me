import type { ComponentType } from "react";
import type { GameStat } from "../lib/GameTypes";
import type { AudioEngine } from "./audio/AudioEngine";

export interface LogicalSize {
  width: number;
  height: number;
}

/** CSS size of the letterboxed stage plus the device pixel ratio to render at. */
export interface ViewportSize {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

export interface HudGrid {
  columns: number;
  rows: number;
  color: string;
  cells: { row: number; col: number }[];
}

export interface HudItem {
  label: string;
  value: string | number | HudGrid;
}

export interface GamePanel {
  title: string;
  /** "menu" returns to the start screen; other ids are passed to GameInstance.act. */
  actions: { id: string; label: string }[];
}

export type GameEvent =
  | { type: "score"; score: number }
  | { type: "hud"; items: HudItem[] }
  | { type: "panel"; panel: GamePanel | null }
  | { type: "gameOver"; score: number; stats?: GameStat[] }
  | { type: "levelComplete"; level: number };

export interface GameContext<O> {
  audio: AudioEngine;
  options: O;
  emit(event: GameEvent): void;
}

export interface GameInstance {
  /** Starts a fresh run; also used for retry after game over. */
  start(): void;
  pause(): void;
  resume(): void;
  resize(size: ViewportSize): void;
  destroy(): void;
  act?(action: string): void;
}

export interface GameModule<O> {
  mount(host: HTMLElement, ctx: GameContext<O>): GameInstance | Promise<GameInstance>;
}

export interface GameOptionsProps<O> {
  value: O;
  onChange(value: O): void;
}

export interface ScoreDisplay {
  value: number;
  suffix?: string;
}

/** Lightweight, eagerly-imported metadata. The game code itself is lazy-loaded via `load`. */
export interface GameEntry<O = unknown> {
  id: string;
  title: string;
  logicalSize: LogicalSize;
  defaultOptions: O;
  load(): Promise<{ default: GameModule<O> }>;
  leaderboardId(options: O): string;
  /** Optional menu controls rendered on the start screen (modes, colours, etc.). */
  Options?: ComponentType<GameOptionsProps<O>>;
  /** Converts a stored score into what players see (e.g. encoded reaction times). */
  displayScore?(score: number, options: O): ScoreDisplay;
  /** Hide leaderboard features (e.g. dev sandbox). */
  noLeaderboard?: boolean;
}
