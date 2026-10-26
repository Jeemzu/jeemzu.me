const KEYS = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyQ", "KeyE", "Space"]);
export class BrickInput {
  private readonly held = new Set<string>();
  private readonly canvas: HTMLCanvasElement;
  private readonly launch: () => void;
  private readonly enabled: () => boolean;
  constructor(canvas: HTMLCanvasElement, launch: () => void, enabled: () => boolean) {
    this.canvas = canvas;
    this.launch = launch;
    this.enabled = enabled;
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.clear);
    canvas.addEventListener("pointerdown", this.pointer);
  }
  private down = (event: KeyboardEvent) => {
    if (!this.enabled() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !KEYS.has(event.code)) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    this.held.add(event.code);
    if (event.code === "Space" && !event.repeat) this.launch();
  };
  private up = (event: KeyboardEvent) => this.held.delete(event.code);
  private pointer = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button === 0 && this.enabled()) { event.preventDefault(); this.launch(); }
  };
  get value() {
    return { left: this.held.has("ArrowLeft") || this.held.has("KeyA"), right: this.held.has("ArrowRight") || this.held.has("KeyD"),
      aimLeft: this.held.has("KeyQ"), aimRight: this.held.has("KeyE") };
  }
  clear = () => this.held.clear();
  destroy(): void {
    window.removeEventListener("keydown", this.down); window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.clear); this.canvas.removeEventListener("pointerdown", this.pointer);
  }
}
