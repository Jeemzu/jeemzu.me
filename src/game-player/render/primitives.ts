import { BufferGeometry, CircleGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, type ColorRepresentation } from "three";

export const rectangle = (width: number, height: number, color: ColorRepresentation) =>
  new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color }));
export const disc = (radius: number, color: ColorRepresentation) =>
  new Mesh(new CircleGeometry(radius, 32), new MeshBasicMaterial({ color }));
export function lines(points: number[], color: ColorRepresentation, opacity = 1): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return new LineSegments(geometry, new LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}
