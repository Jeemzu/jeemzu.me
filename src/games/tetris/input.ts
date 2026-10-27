export type InputAction = "left" | "right" | "rotate" | "hardDrop";

const REPEAT_DELAY = 0.22;
const REPEAT_INTERVAL = 0.09;

export class TetrisInput {
  private held = new Set<string>();
  private current = 0;
  private elapsed = 0;
  private nextRepeat = REPEAT_DELAY;
  private readonly enabled: () => boolean;
  private readonly action: (action: InputAction) => void;

  constructor(action: (action: InputAction) => void, enabled: () => boolean) {
    this.action = action;
    this.enabled = enabled;
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.clear);
  }

  get softDrop(): boolean { return this.held.has("ArrowDown") || this.held.has("KeyS"); }
  get direction(): number {
    return this.held.has("ArrowLeft") || this.held.has("KeyA") ? -1 :
      this.held.has("ArrowRight") || this.held.has("KeyD") ? 1 : 0;
  }

  private onDown = (event: KeyboardEvent) => {
    if (!this.enabled() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyD", "KeyS", "KeyW", "Space"].includes(event.code)) return;
    event.preventDefault();
    this.held.add(event.code);
    if (event.repeat) return;
    if (event.code === "Space") this.action("hardDrop");
    if (event.code === "ArrowUp" || event.code === "KeyW") this.action("rotate");
  };
  private onUp = (event: KeyboardEvent) => { this.held.delete(event.code); };

  update(dt: number): void {
    const direction = this.direction;
    if (direction !== this.current) {
      this.current = direction;
      this.elapsed = 0;
      this.nextRepeat = REPEAT_DELAY;
      if (direction) this.action(direction < 0 ? "left" : "right");
    } else if (direction) {
      this.elapsed += dt;
      while (this.elapsed >= this.nextRepeat) {
        this.action(direction < 0 ? "left" : "right");
        this.nextRepeat += REPEAT_INTERVAL;
      }
    }
  }

  clear = (): void => {
    this.held.clear();
    this.current = 0;
    this.elapsed = 0;
    this.nextRepeat = REPEAT_DELAY;
  };

  destroy(): void {
    this.clear();
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.clear);
  }
}
