import type { Direction } from "./logic";

export function keyDirection(code: string): Direction | undefined {
  switch (code) {
    case "ArrowUp": case "KeyW": return "up";
    case "ArrowDown": case "KeyS": return "down";
    case "ArrowLeft": case "KeyA": return "left";
    case "ArrowRight": case "KeyD": return "right";
  }
}

export function bindInput(onTurn: (direction: Direction) => void, enabled: () => boolean): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (!enabled() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const direction = keyDirection(event.code);
    if (!direction) return;
    event.preventDefault();
    onTurn(direction);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
