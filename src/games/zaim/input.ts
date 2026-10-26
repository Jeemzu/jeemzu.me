import { HEIGHT, WIDTH } from "./config";

export function bindInput(canvas: HTMLCanvasElement, enabled: () => boolean, click: (x: number, y: number) => void,
  move: (x: number, y: number) => void, leave: () => void): () => void {
  const point = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * WIDTH, y: (event.clientY - bounds.top) / bounds.height * HEIGHT };
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !enabled()) return;
    event.preventDefault();
    const p = point(event);
    click(p.x, p.y);
  };
  const motion = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !enabled()) return;
    const p = point(event);
    move(p.x, p.y);
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", motion);
  canvas.addEventListener("pointerleave", leave);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", motion);
    canvas.removeEventListener("pointerleave", leave);
  };
}
