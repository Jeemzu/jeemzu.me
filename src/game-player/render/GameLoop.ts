export interface LoopCallbacks {
  /** Advances simulation; skipped while paused. `dt` is in seconds and clamped. */
  update(dt: number): void;
  /** Draws a frame; runs even while paused so resizes repaint. */
  render(): void;
}

const MAX_DT = 0.05;

export class GameLoop {
  private raf = 0;
  private last = 0;
  private paused = false;
  private readonly cb: LoopCallbacks;

  constructor(cb: LoopCallbacks) {
    this.cb = cb;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.last = performance.now();
  }

  private frame = (t: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(MAX_DT, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    if (!this.paused) this.cb.update(dt);
    this.cb.render();
  };
}
