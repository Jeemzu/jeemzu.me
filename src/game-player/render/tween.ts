export type EaseFn = (t: number) => number;

export const Ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} satisfies Record<string, EaseFn>;

export interface TweenSpec {
  /** Seconds. */
  duration: number;
  delay?: number;
  ease?: EaseFn;
  /** Receives eased progress 0…1. */
  onUpdate(p: number): void;
  onComplete?(): void;
}

interface ActiveTween extends TweenSpec {
  elapsed: number;
}

/** Minimal time-driven tween runner, advanced by the game loop so it pauses with the game. */
export class Tweener {
  private tweens = new Set<ActiveTween>();

  add(spec: TweenSpec): () => void {
    const t: ActiveTween = { ...spec, elapsed: -(spec.delay ?? 0) };
    this.tweens.add(t);
    return () => this.tweens.delete(t);
  }

  update(dt: number): void {
    for (const t of this.tweens) {
      t.elapsed += dt;
      if (t.elapsed < 0) continue;
      const raw = t.duration > 0 ? Math.min(1, t.elapsed / t.duration) : 1;
      t.onUpdate((t.ease ?? Ease.linear)(raw));
      if (raw >= 1) {
        this.tweens.delete(t);
        t.onComplete?.();
      }
    }
  }

  clear(): void {
    this.tweens.clear();
  }

  get size(): number {
    return this.tweens.size;
  }
}
