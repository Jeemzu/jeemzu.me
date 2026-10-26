import type { LogicalSize } from "./contract";

/** Largest size with the game's aspect ratio that fits inside the available area. */
export function fitStage(
  availWidth: number,
  availHeight: number,
  logical: LogicalSize,
  padding = 0,
): { width: number; height: number } {
  const w = Math.max(0, availWidth - padding * 2);
  const h = Math.max(0, availHeight - padding * 2);
  const scale = Math.min(w / logical.width, h / logical.height);
  if (!Number.isFinite(scale) || scale <= 0) return { width: 0, height: 0 };
  return {
    width: Math.floor(logical.width * scale),
    height: Math.floor(logical.height * scale),
  };
}

export const currentDpr = () => Math.max(1, window.devicePixelRatio || 1);
