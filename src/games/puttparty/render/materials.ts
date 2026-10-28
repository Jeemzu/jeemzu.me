import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

export const PLAYER_COLORS = ["#e9524f", "#3d8bfd", "#f5c542", "#a66cff", "#ff8a3d", "#2ec4b6"];

export const playerColor = (index: number) => PLAYER_COLORS[index % PLAYER_COLORS.length];

/** Deterministic PRNG so decoration layouts are stable per course. */
export function rng(seedText: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void, repeat: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function speckle(g: CanvasRenderingContext2D, size: number, count: number, colors: string[], random: () => number, maxR: number) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[Math.floor(random() * colors.length)];
    g.globalAlpha = 0.25 + random() * 0.35;
    g.fillRect(random() * size, random() * size, 1 + random() * maxR, 1 + random() * maxR);
  }
  g.globalAlpha = 1;
}

/** Owns every shared material and texture; `dispose` frees them all. */
export class PuttMaterials {
  readonly green: MeshStandardMaterial;
  readonly greenSide: MeshStandardMaterial;
  readonly rough: MeshStandardMaterial;
  readonly wall: MeshStandardMaterial;
  readonly wallCap: MeshStandardMaterial;
  readonly post: MeshStandardMaterial;
  readonly block: MeshStandardMaterial;
  readonly bumper: MeshStandardMaterial;
  readonly cup: MeshStandardMaterial;
  readonly cupRim: MeshStandardMaterial;
  readonly tee: MeshStandardMaterial;
  readonly pole: MeshStandardMaterial;
  readonly flag: MeshStandardMaterial;
  readonly trunk: MeshStandardMaterial;
  readonly leaves: MeshStandardMaterial;
  readonly rock: MeshStandardMaterial;
  private readonly textures: Texture[] = [];

  constructor() {
    const random = rng("bpp-textures");
    // Mowed stripes: world UVs tile every 2 units (repeat 0.5).
    const greenTex = this.track(canvasTexture(256, (g, s) => {
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? "#4fae4a" : "#58b852";
        g.fillRect(0, (i * s) / 4, s, s / 4);
      }
      speckle(g, s, 2600, ["#3f9a3d", "#6cc463", "#4aa646"], random, 2);
    }, 0.5));
    const roughTex = this.track(canvasTexture(256, (g, s) => {
      g.fillStyle = "#3e7f35";
      g.fillRect(0, 0, s, s);
      speckle(g, s, 5000, ["#2f6a2a", "#4f9641", "#5aa44b", "#356f2d"], random, 3);
    }, 0.12));
    const woodTex = this.track(canvasTexture(128, (g, s) => {
      g.fillStyle = "#b07a45";
      g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 2) {
        g.fillStyle = `rgba(80, 45, 20, ${0.08 + random() * 0.18})`;
        g.fillRect(0, y, s, 1);
      }
      g.fillStyle = "rgba(60, 30, 10, 0.5)";
      g.fillRect(0, 0, s, 3);
    }, 1));

    this.green = new MeshStandardMaterial({ map: greenTex, roughness: 0.92 });
    this.greenSide = new MeshStandardMaterial({ color: "#5b3f26", roughness: 1 });
    this.rough = new MeshStandardMaterial({ map: roughTex, roughness: 1 });
    this.wall = new MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
    this.wallCap = new MeshStandardMaterial({ color: "#f3ead7", roughness: 0.6 });
    this.post = new MeshStandardMaterial({ color: "#e8dcc2", roughness: 0.55 });
    this.block = new MeshStandardMaterial({ map: woodTex, color: "#d9a066", roughness: 0.7 });
    this.bumper = new MeshStandardMaterial({ color: "#d94b3d", roughness: 0.45 });
    this.cup = new MeshStandardMaterial({ color: "#1b1b1b", roughness: 1, side: DoubleSide });
    this.cupRim = new MeshStandardMaterial({ color: "#f1f1f1", roughness: 0.4, metalness: 0.2 });
    this.tee = new MeshStandardMaterial({ color: "#2f7d32", roughness: 1 });
    this.pole = new MeshStandardMaterial({ color: "#f8f8f8", roughness: 0.4 });
    this.flag = new MeshStandardMaterial({ color: "#ffcf3f", roughness: 0.8, side: DoubleSide });
    this.trunk = new MeshStandardMaterial({ color: "#6b4a2f", roughness: 1 });
    this.leaves = new MeshStandardMaterial({ color: new Color("#2f8a3a"), roughness: 0.9, flatShading: true });
    this.rock = new MeshStandardMaterial({ color: "#8c8f93", roughness: 0.95, flatShading: true });
  }

  private track(tex: Texture): Texture {
    this.textures.push(tex);
    return tex;
  }

  dispose(): void {
    for (const value of Object.values(this)) if (value instanceof MeshStandardMaterial) value.dispose();
    this.textures.forEach((t) => t.dispose());
  }
}
