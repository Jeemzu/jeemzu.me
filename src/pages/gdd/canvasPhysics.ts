import {
  GDD_CANVAS_CONTACT_EPSILON,
  structureHasOverlap,
  type GddBlockLayout,
} from "./projectModel";

export interface CanvasBody {
  id: string;
  layout: GddBlockLayout;
}

export interface Foundation {
  left: number;
  right: number;
  top: number;
}

export interface Attachment {
  dx: number;
  dy: number;
  distance: number;
  edge: { x1: number; y1: number; x2: number; y2: number };
}

const EPSILON = GDD_CANVAS_CONTACT_EPSILON;

export function blockBounds(layout: GddBlockLayout) {
  const width = layout.rotation % 180 === 0 ? layout.width : layout.height;
  const height = layout.rotation % 180 === 0 ? layout.height : layout.width;
  return {
    left: layout.x - width / 2,
    right: layout.x + width / 2,
    top: layout.y - height / 2,
    bottom: layout.y + height / 2,
    width,
    height,
  };
}

export function touchingEdges(a: GddBlockLayout, b: GddBlockLayout) {
  const first = blockBounds(a);
  const second = blockBounds(b);
  const horizontal =
    Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const vertical =
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return (
    (horizontal > EPSILON &&
      (Math.abs(first.bottom - second.top) < EPSILON ||
        Math.abs(first.top - second.bottom) < EPSILON)) ||
    (vertical > EPSILON &&
      (Math.abs(first.right - second.left) < EPSILON ||
        Math.abs(first.left - second.right) < EPSILON))
  );
}

function onFoundation(body: CanvasBody, foundation: Foundation) {
  const bounds = blockBounds(body.layout);
  return (
    Math.abs(bounds.bottom - foundation.top) < EPSILON &&
    Math.min(bounds.right, foundation.right) -
      Math.max(bounds.left, foundation.left) >
      EPSILON
  );
}

export function groundedBlockIds(
  blocks: readonly CanvasBody[],
  foundation: Foundation,
) {
  const connected = new Set(
    blocks
      .filter((body) => onFoundation(body, foundation))
      .map((body) => body.id),
  );
  const queue = blocks.filter((body) => connected.has(body.id));
  for (let index = 0; index < queue.length; index++) {
    for (const body of blocks) {
      if (
        !connected.has(body.id) &&
        touchingEdges(queue[index].layout, body.layout)
      ) {
        connected.add(body.id);
        queue.push(body);
      }
    }
  }
  return connected;
}

// Removing a joint picks up its branch, but not blocks with another path to ground.
export function detachedBranchIds(
  blocks: readonly CanvasBody[],
  id: string,
  foundation: Foundation,
) {
  const before = groundedBlockIds(blocks, foundation);
  const after = groundedBlockIds(
    blocks.filter((body) => body.id !== id),
    foundation,
  );
  const branch = new Set([id]);
  if (before.has(id)) {
    for (const body of blocks)
      if (before.has(body.id) && !after.has(body.id)) branch.add(body.id);
  } else {
    const queue = blocks.filter((body) => body.id === id);
    for (let index = 0; index < queue.length; index++)
      for (const body of blocks)
        if (
          !branch.has(body.id) &&
          touchingEdges(queue[index].layout, body.layout)
        ) {
          branch.add(body.id);
          queue.push(body);
        }
  }
  return branch;
}

export function translateBodies<T extends CanvasBody>(
  blocks: readonly T[],
  dx: number,
  dy: number,
): T[] {
  return blocks.map((body) => ({
    ...body,
    layout: { ...body.layout, x: body.layout.x + dx, y: body.layout.y + dy },
  }));
}

export function nearestAttachment(
  moving: readonly CanvasBody[],
  fixed: readonly CanvasBody[],
  foundation: Foundation,
): Attachment | null {
  const grounded = groundedBlockIds(fixed, foundation);
  const candidates: (Attachment & { preference: number })[] = [];
  function offer(
    dx: number,
    dy: number,
    edge: Attachment["edge"],
    preference: number,
  ) {
    const placed = translateBodies(moving, dx, dy);
    if (
      placed.some((body) => {
        const bounds = blockBounds(body.layout);
        return (
          bounds.left < 0 ||
          bounds.right > foundation.right ||
          bounds.top < 0 ||
          bounds.bottom > foundation.top + EPSILON
        );
      }) ||
      structureHasOverlap([...fixed, ...placed])
    )
      return;
    candidates.push({ dx, dy, distance: Math.hypot(dx, dy), edge, preference });
  }
  for (const body of moving) {
    const a = blockBounds(body.layout);
    const foundationDx = Math.max(
      foundation.left - a.right + 24,
      Math.min(0, foundation.right - a.left - 24),
    );
    offer(
      foundationDx,
      foundation.top - a.bottom,
      {
        x1: Math.max(foundation.left, a.left + foundationDx),
        x2: Math.min(foundation.right, a.right + foundationDx),
        y1: foundation.top,
        y2: foundation.top,
      },
      0,
    );
    for (const target of fixed) {
      if (!grounded.has(target.id)) continue;
      const b = blockBounds(target.layout);
      const dx = Math.max(
        b.left - a.right + 24,
        Math.min(0, b.right - a.left - 24),
      );
      const dy = Math.max(
        b.top - a.bottom + 24,
        Math.min(0, b.bottom - a.top - 24),
      );
      const x1 = Math.max(a.left + dx, b.left);
      const x2 = Math.min(a.right + dx, b.right);
      offer(dx, b.top - a.bottom, { x1, x2, y1: b.top, y2: b.top }, 0);
      offer(dx, b.bottom - a.top, { x1, x2, y1: b.bottom, y2: b.bottom }, 18);
      const y1 = Math.max(a.top + dy, b.top);
      const y2 = Math.min(a.bottom + dy, b.bottom);
      offer(b.left - a.right, dy, { x1: b.left, x2: b.left, y1, y2 }, 12);
      offer(b.right - a.left, dy, { x1: b.right, x2: b.right, y1, y2 }, 12);
    }
  }
  candidates.sort(
    (a, b) => a.distance + a.preference - b.distance - b.preference,
  );
  return candidates[0] ?? null;
}

export function stepBlockGravity<T extends CanvasBody>(
  blocks: readonly T[],
  foundation: Foundation,
  velocities: Map<string, number>,
  deltaSeconds: number,
): { blocks: T[]; landedIds: string[] } {
  let next = [...blocks];
  const visited = new Set<string>();
  const landedIds: string[] = [];
  // Bottom components settle first; swept distances prevent tunnelling.
  for (const body of [...blocks].sort(
    (a, b) => blockBounds(b.layout).bottom - blockBounds(a.layout).bottom,
  )) {
    if (visited.has(body.id)) continue;
    const grounded = groundedBlockIds(next, foundation);
    if (grounded.has(body.id)) continue;
    const ids = detachedBranchIds(next, body.id, foundation);
    for (const id of ids) visited.add(id);
    const group = next.filter((entry) => ids.has(entry.id));
    const others = next.filter((entry) => !ids.has(entry.id));
    const velocity = Math.min(
      1400,
      (velocities.get(body.id) ?? 0) + 2400 * deltaSeconds,
    );
    const requested = velocity * deltaSeconds;
    let distance = requested;
    for (const entry of group) {
      const a = blockBounds(entry.layout);
      if (
        a.right > foundation.left &&
        a.left < foundation.right &&
        a.bottom <= foundation.top + EPSILON
      )
        distance = Math.min(distance, Math.max(0, foundation.top - a.bottom));
      for (const other of others) {
        const b = blockBounds(other.layout);
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPSILON &&
          a.bottom <= b.top + EPSILON
        )
          distance = Math.min(distance, Math.max(0, b.top - a.bottom));
      }
    }
    for (const id of ids) velocities.set(id, velocity);
    next = next.map((entry) =>
      ids.has(entry.id)
        ? {
            ...entry,
            layout: { ...entry.layout, y: entry.layout.y + distance },
          }
        : entry,
    );
    const groundedAfterMove = groundedBlockIds(next, foundation);
    if (
      distance < requested ||
      group.some((entry) => groundedAfterMove.has(entry.id))
    ) {
      landedIds.push(...ids);
      for (const id of ids) velocities.delete(id);
    }
  }
  return { blocks: next, landedIds };
}
