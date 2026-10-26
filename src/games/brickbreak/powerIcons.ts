import { Group } from "three";
import { disc, lines } from "../../game-player/render/primitives";
import type { EffectKind } from "./types";
import { STYLE } from "./style";

export function powerIcon(kind: EffectKind): Group {
  const group = new Group();
  group.add(disc(15, STYLE.powers[kind]));
  const points: number[] = [];
  const segment = (x1: number, y1: number, x2: number, y2: number) => points.push(x1, y1, 1, x2, y2, 1);
  if (kind === "multi") {
    for (const [x, y] of [[-5, 4], [5, 4], [0, -5]]) {
      const dot = disc(3, 0xffffff);
      dot.position.set(x, y, 1);
      group.add(dot);
    }
  } else if (kind === "expand" || kind === "shrink") {
    const inward = kind === "shrink";
    segment(-5, 0, 5, 0);
    for (const direction of [-1, 1]) {
      const tip = direction * (inward ? 2 : 10), tail = direction * (inward ? 9 : 4);
      segment(tip, 0, tail, -5); segment(tip, 0, tail, 5);
    }
  } else if (kind === "slow") {
    segment(0, -8, 0, 8); segment(0, 8, -6, 2); segment(0, 8, 6, 2);
  } else if (kind === "fast") {
    segment(5, -9, -4, 1); segment(-4, 1, 4, -1); segment(4, -1, -5, 9);
  } else if (kind === "sticky") {
    segment(-7, 7, -7, -7); segment(-7, -7, 7, -7); segment(7, -7, 7, 7);
  } else {
    const vertices = [[0, 8], [-8, 0], [-7, -5], [-3, -7], [0, -3], [3, -7], [7, -5], [8, 0], [0, 8]];
    for (let i = 1; i < vertices.length; i++) segment(vertices[i - 1][0], vertices[i - 1][1], vertices[i][0], vertices[i][1]);
  }
  if (points.length) group.add(lines(points, 0xffffff));
  return group;
}
