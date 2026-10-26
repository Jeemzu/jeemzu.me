import { describe, expect, it, vi } from "vitest";
import { Ease, Tweener } from "./tween";

describe("tweens", () => {
  it("advances with delay and completes once", () => {
    const tweens = new Tweener();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    tweens.add({ delay: 0.5, duration: 1, onUpdate, onComplete });
    tweens.update(0.25);
    expect(onUpdate).not.toHaveBeenCalled();
    tweens.update(0.75);
    expect(onUpdate).toHaveBeenLastCalledWith(0.5);
    tweens.update(2);
    expect(onUpdate).toHaveBeenLastCalledWith(1);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(tweens.size).toBe(0);
    tweens.update(1);
    expect(onComplete).toHaveBeenCalledOnce();
  });
  it("applies easing", () => {
    const tweens = new Tweener();
    const onUpdate = vi.fn();
    tweens.add({ duration: 1, ease: Ease.outQuad, onUpdate });
    tweens.update(0.5);
    expect(onUpdate).toHaveBeenCalledWith(0.75);
  });
  it("supports cancellation, clearing, and zero duration", () => {
    const tweens = new Tweener();
    const onUpdate = vi.fn();
    const cancel = tweens.add({ duration: 1, onUpdate });
    cancel();
    tweens.update(1);
    expect(onUpdate).not.toHaveBeenCalled();
    tweens.add({ duration: 0, onUpdate });
    tweens.update(0);
    expect(onUpdate).toHaveBeenCalledWith(1);
    tweens.add({ duration: 1, onUpdate });
    tweens.clear();
    expect(tweens.size).toBe(0);
  });
  it.each(Object.entries(Ease))("%s starts at zero and ends at one", (_name, ease) => {
    expect(ease(0)).toBeCloseTo(0);
    expect(ease(1)).toBeCloseTo(1);
  });
});
