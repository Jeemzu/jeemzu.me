import {
  BufferGeometry,
  CircleGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from "three";
import type { GameContext, GameInstance, GameModule } from "../../game-player/contract";
import { Stage } from "../../game-player/render/Stage";
import { GameLoop } from "../../game-player/render/GameLoop";
import { Ease, Tweener } from "../../game-player/render/tween";

const W = 800;
const H = 600;
const CELL = 40;

function gridLines(): LineSegments {
  const pts: number[] = [];
  for (let x = 0; x <= W; x += CELL) pts.push(x, 0, 0, x, H, 0);
  for (let y = 0; y <= H; y += CELL) pts.push(0, y, 0, W, y, 0);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return new LineSegments(geo, new LineBasicMaterial({ color: 0x2a3142 }));
}

const sandbox: GameModule<Record<string, never>> = {
  async mount(host: HTMLElement, ctx: GameContext<Record<string, never>>): Promise<GameInstance> {
    await ctx.audio.register([
      { id: "sandbox.blip", src: "/sounds/snake_eat.mp3", pitchJitter: 2, maxVoices: 6, gain: 0.7 },
    ]);

    const stage = new Stage(host, {
      logicalSize: { width: W, height: H },
      background: 0x070a10,
      bloom: { strength: 0.7, radius: 0.15, threshold: 0.55 },
    });
    const tweens = new Tweener();

    stage.root.add(gridLines());
    for (const [x, y] of [[0, 0], [W - 24, 0], [0, H - 24], [W - 24, H - 24]]) {
      const m = new Mesh(new PlaneGeometry(24, 24), new MeshBasicMaterial({ color: 0xc8a24a }));
      m.position.set(x + 12, y + 12, 0);
      stage.root.add(m);
    }
    const ball = new Mesh(new CircleGeometry(14, 48), new MeshBasicMaterial({ color: 0x7ee8ff }));
    stage.root.add(ball);

    let pos = { x: W / 2, y: H / 2 };
    let vel = { x: 220, y: 160 };
    let clicks = 0;
    let over = false;

    const reset = () => {
      pos = { x: W / 2, y: H / 2 };
      vel = { x: 220, y: 160 };
      clicks = 0;
      over = false;
      ctx.emit({ type: "score", score: 0 });
      ctx.emit({ type: "hud", items: [{ label: "Clicks", value: 0 }] });
    };

    const loop = new GameLoop({
      update(dt) {
        tweens.update(dt);
        if (over) return;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        if (pos.x < 14 || pos.x > W - 14) vel.x *= -1;
        if (pos.y < 14 || pos.y > H - 14) vel.y *= -1;
        ball.position.set(pos.x, pos.y, 1);
      },
      render: () => stage.render(),
    });

    const onPointerDown = (e: PointerEvent) => {
      if (over || loop.isPaused) return;
      const r = stage.canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const y = ((e.clientY - r.top) / r.height) * H;
      const ring = new Mesh(new RingGeometry(8, 11, 48), new MeshBasicMaterial({ color: 0xffd36b, transparent: true }));
      ring.position.set(x, y, 2);
      stage.root.add(ring);
      tweens.add({
        duration: 0.6,
        ease: Ease.outCubic,
        onUpdate: (p) => {
          ring.scale.setScalar(1 + p * 5);
          (ring.material as MeshBasicMaterial).opacity = 1 - p;
        },
        onComplete: () => {
          stage.root.remove(ring);
          ring.geometry.dispose();
          (ring.material as MeshBasicMaterial).dispose();
        },
      });
      ctx.audio.play("sandbox.blip", { pan: x / W * 2 - 1 });
      clicks++;
      ctx.emit({ type: "score", score: clicks * 10 });
      ctx.emit({ type: "hud", items: [{ label: "Clicks", value: clicks }] });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyG" || over || loop.isPaused) return;
      over = true;
      ctx.emit({ type: "gameOver", score: clicks * 10, stats: [{ label: "Clicks", value: clicks }] });
    };

    stage.canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);

    return {
      start() {
        reset();
        loop.resume();
        loop.start();
      },
      pause: () => loop.pause(),
      resume: () => loop.resume(),
      resize: (size) => stage.resize(size),
      destroy() {
        loop.stop();
        tweens.clear();
        stage.canvas.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("keydown", onKey);
        ctx.audio.unregister("sandbox.");
        stage.dispose();
      },
    };
  },
};

export default sandbox;
