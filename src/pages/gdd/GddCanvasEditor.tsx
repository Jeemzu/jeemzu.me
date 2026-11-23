import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { keyframes } from "@emotion/react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  FaArrowUpRightFromSquare,
  FaArrowDown,
  FaArrowUp,
  FaArrowsUpDownLeftRight,
  FaCloudArrowUp,
  FaDownload,
  FaExpand,
  FaFileArrowDown,
  FaFileImport,
  FaFilePdf,
  FaPlus,
  FaGear,
  FaMagnet,
  FaRobot,
  FaRotate,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import {
  GDD_BLOCK_COLORS,
  GDD_SUBJECTS,
  newGddSubsectionBlock,
  newGddSubjectBlock,
  orderedGddBlocks,
  placeGddSubjectBlockOnTop,
  reorderGddBlocks,
  snapGddCanvasPoint,
  spatiallyOrderGddBlocks,
  structureHasOverlap,
  type GddBlockLayout,
  type GddCanvasProject,
  type GddCanvasStructure,
  type GddSubjectBlock,
  type GddSubsectionBlock,
} from "./projectModel";
import type { PdfImage } from "./images";
import PrototypeFields from "./PrototypeFields";
import TechnicalDetails from "./technical/TechnicalDetails";
import type { GddAppearance } from "./appearance";
import {
  blockBounds,
  detachedBranchIds,
  groundedBlockIds,
  nearestAttachment,
  stepBlockGravity,
  touchingEdges,
  translateBodies,
  type Attachment,
} from "./canvasPhysics";

const spawnAnimation = keyframes`
  0% { transform: scale(0.15); opacity: 0; }
  65% { transform: scale(1.045, 0.965); opacity: 1; }
  82% { transform: scale(0.985, 1.015); }
  100% { transform: scale(1); opacity: 1; }
`;

const spawnRayAnimation = keyframes`
  0% { opacity: 0; transform: scale(0.25); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.4); }
`;

const supportBounceAnimation = keyframes`
  0%, 100% { transform: scale(1); }
  30% { transform: scale(var(--impact-x, 1.025), var(--impact-y, 0.975)); }
  62% { transform: scale(0.99, 1.01); }
`;

const FOUNDATION_HEIGHT = 18;
const FOUNDATION_GAP = 8;

interface Props {
  appearance: GddAppearance;
  onAppearanceChange: (appearance: GddAppearance) => void;
  project: GddCanvasProject;
  images: Record<string, PdfImage>;
  busy: boolean;
  disabled: boolean;
  onChange: (project: GddCanvasProject) => void;
  onUpload: (parentId: string, subsectionId: string, files: File[]) => void;
  onExportPdf: () => void;
  onDownloadPdf: () => void;
  onExportJson: () => void;
  onExportTemplate: () => void;
  pdfUrl: string | null;
  onImportJson: () => void;
  onCloudSave: () => void;
  onOpenLibrary: () => void;
  onOpenAssistant: () => void;
  signedIn: boolean;
  onFeedback: (message: string) => void;
}

type DragState = {
  scope: "main" | "subsection";
  parentId?: string;
  blockId: string;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  layout: GddBlockLayout;
};

type CanvasTool = "move" | "resize" | "detach" | "delete";
type HeldBranch = {
  ids: Set<string>;
  blocks: GddSubjectBlock[];
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  attachment: Attachment | null;
  latched: boolean;
};

function subjectLabel(subjectId: string): string {
  return (
    GDD_SUBJECTS.find((subject) => subject.id === subjectId)?.label ?? subjectId
  );
}

function placeWithoutOverlap<T extends { layout: GddBlockLayout }>(
  layout: GddBlockLayout,
  blocks: readonly T[],
): GddBlockLayout {
  if (!structureHasOverlap([...blocks, { layout }])) return layout;
  const horizontalStep = layout.width + 48;
  const verticalStep = layout.height + 48;
  for (let index = 0; index < 1000; index++) {
    const candidate = {
      ...layout,
      x: layout.width / 2 + (index % 3) * horizontalStep,
      y: layout.height / 2 + Math.floor(index / 3) * verticalStep,
    };
    if (!structureHasOverlap([...blocks, { layout: candidate }]))
      return candidate;
  }
  throw new Error("Could not place a block without overlap.");
}

function snapNearBlocks(
  layout: GddBlockLayout,
  others: readonly { layout: GddBlockLayout }[],
): GddBlockLayout {
  const point = snapGddCanvasPoint(layout.x, layout.y);
  const snapped = { ...layout, ...point };
  const threshold = 12;
  for (const other of others) {
    const otherWidth =
      other.layout.rotation % 180 === 0
        ? other.layout.width
        : other.layout.height;
    const otherHeight =
      other.layout.rotation % 180 === 0
        ? other.layout.height
        : other.layout.width;
    const width = layout.rotation % 180 === 0 ? layout.width : layout.height;
    const height = layout.rotation % 180 === 0 ? layout.height : layout.width;
    const candidates = [
      { x: other.layout.x, y: snapped.y },
      {
        x: other.layout.x - (otherWidth + width) / 2,
        y: snapped.y,
      },
      {
        x: other.layout.x + (otherWidth + width) / 2,
        y: snapped.y,
      },
      {
        x: snapped.x,
        y: other.layout.y - (otherHeight + height) / 2,
      },
      {
        x: snapped.x,
        y: other.layout.y + (otherHeight + height) / 2,
      },
    ];
    for (const candidate of candidates) {
      if (
        Math.abs(candidate.x - snapped.x) <= threshold &&
        Math.abs(candidate.y - snapped.y) <= threshold
      ) {
        const attached = { ...snapped, ...candidate };
        if (!structureHasOverlap([...others, { layout: attached }]))
          return attached;
      }
    }
  }
  return snapped;
}

export default function GddCanvasEditor({
  appearance,
  onAppearanceChange,
  project,
  images,
  busy,
  disabled,
  onChange,
  onUpload,
  onExportPdf,
  onDownloadPdf,
  onExportJson,
  onExportTemplate,
  pdfUrl,
  onImportJson,
  onCloudSave,
  onOpenLibrary,
  onOpenAssistant,
  signedIn,
  onFeedback: setFeedback,
}: Props) {
  const theme = useTheme();
  const [tool, setTool] = useState<CanvasTool>("move");
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [held, setHeld] = useState<HeldBranch | null>(null);
  const [resizing, setResizing] = useState(false);
  const heldRef = useRef<HeldBranch | null>(null);
  const [physicsBlocks, setPhysicsBlocks] = useState<GddSubjectBlock[] | null>(
    null,
  );
  const [collision, setCollision] = useState<{
    ids: string[];
    horizontal: boolean;
  } | null>(null);
  const projectRef = useRef(project);
  const onChangeRef = useRef(onChange);
  projectRef.current = project;
  onChangeRef.current = onChange;
  const workspace = useRef<HTMLDivElement>(null);
  const canvasViewport = useRef<HTMLDivElement>(null);
  const canvasScene = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const sceneHeight = useRef(0);
  const uploadInput = useRef<HTMLInputElement>(null);
  const drag = useRef<DragState | null>(null);
  const impactTimer = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasViewportHeight, setCanvasViewportHeight] = useState(0);
  const [canvasViewportWidth, setCanvasViewportWidth] = useState(1120);
  const [toolbarHeight, setToolbarHeight] = useState(72);
  const [impact, setImpact] = useState<{
    fallingId: string;
    bouncingIds: string[];
  } | null>(null);
  const [openSubsectionsId, setOpenSubsectionsId] = useState<string | null>(
    null,
  );
  const [addMainAnchor, setAddMainAnchor] = useState<HTMLElement | null>(null);
  const [addChildAnchor, setAddChildAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [styleAnchor, setStyleAnchor] = useState<HTMLElement | null>(null);
  const [styleTarget, setStyleTarget] = useState<{
    blockId: string;
    parentId?: string;
  } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customHeading, setCustomHeading] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    parentId?: string;
    blockId: string;
    label: string;
    imageId?: string;
  } | null>(null);

  useEffect(() => {
    const element = canvasViewport.current;
    if (!element) return;
    const measure = () => {
      setCanvasViewportHeight(element.clientHeight);
      setCanvasViewportWidth(element.clientWidth);
      setToolbarHeight(toolbar.current?.offsetHeight ?? 72);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (toolbar.current) observer.observe(toolbar.current);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (impactTimer.current !== null)
        window.clearTimeout(impactTimer.current);
    },
    [],
  );

  const persistedBlocks = orderedGddBlocks(project.blocks);
  const lowestBlockEdge = persistedBlocks.reduce((lowest, block) => {
    const height =
      block.layout.rotation % 180 === 0
        ? block.layout.height
        : block.layout.width;
    return Math.max(lowest, block.layout.y + height / 2);
  }, 0);
  const canvasHeight = Math.max(
    canvasViewportHeight,
    lowestBlockEdge + FOUNDATION_HEIGHT + FOUNDATION_GAP,
    sceneHeight.current,
  );
  const foundationTop = canvasHeight - FOUNDATION_HEIGHT - FOUNDATION_GAP;
  const sceneWidth = Math.max(
    1120,
    canvasViewportWidth,
    ...persistedBlocks.map((block) => blockBounds(block.layout).right + 24),
  );
  const foundation = { left: 0, right: sceneWidth, top: foundationTop };
  const rootBlocks = physicsBlocks ?? persistedBlocks;
  const movingBlocks = held
    ? translateBodies(held.blocks, held.dx, held.dy)
    : [];
  const displayBlocks = rootBlocks.map(
    (block) => movingBlocks.find((entry) => entry.id === block.id) ?? block,
  );
  const groundedIds = groundedBlockIds(rootBlocks, foundation);
  const layoutKey = persistedBlocks
    .map((block) => `${block.id}:${Object.values(block.layout).join(",")}`)
    .join(";");
  const holding = held !== null;

  useEffect(() => {
    if (disabled || holding || resizing) return;
    let bodies = projectRef.current.blocks.blocks;
    const floor = { left: 0, right: sceneWidth, top: foundationTop };
    if (groundedBlockIds(bodies, floor).size === bodies.length) {
      setPhysicsBlocks(null);
      return;
    }
    let frame = 0;
    let previous = 0;
    const velocities = new Map<string, number>();
    function tick(time: number) {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 1 / 60;
      previous = time;
      const result = stepBlockGravity(bodies, floor, velocities, dt);
      bodies = result.blocks;
      setPhysicsBlocks(bodies);
      if (result.landedIds.length)
        setCollision({
          ids: [
            ...result.landedIds,
            ...bodies
              .filter(
                (body) =>
                  !result.landedIds.includes(body.id) &&
                  bodies.some(
                    (landed) =>
                      result.landedIds.includes(landed.id) &&
                      touchingEdges(landed.layout, body.layout),
                  ),
              )
              .map((body) => body.id),
          ],
          horizontal: false,
        });
      if (groundedBlockIds(bodies, floor).size === bodies.length) {
        const current = projectRef.current;
        const layouts = new Map(bodies.map((body) => [body.id, body.layout]));
        const structure = {
          ...current.blocks,
          blocks: current.blocks.blocks.map((body) => ({
            ...body,
            layout: layouts.get(body.id) ?? body.layout,
          })),
        };
        onChangeRef.current({
          ...current,
          blocks:
            structure.orderMode === "spatial"
              ? spatiallyOrderGddBlocks(structure)
              : structure,
        });
        setPhysicsBlocks(null);
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [layoutKey, foundationTop, sceneWidth, disabled, holding, resizing]);

  useEffect(() => {
    function cancel(event: KeyboardEvent) {
      if (event.key === "Escape") {
        heldRef.current = null;
        setHeld(null);
        drag.current = null;
        setResizing(false);
      }
    }
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);

  useEffect(() => {
    if (disabled) {
      heldRef.current = null;
      setHeld(null);
      drag.current = null;
      setResizing(false);
      setPhysicsBlocks(null);
    }
  }, [disabled]);

  useEffect(() => {
    if (
      !collision ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animations: Animation[] = [];
    workspace.current
      ?.querySelectorAll<HTMLElement>("[data-gdd-body]")
      .forEach((element) => {
        if (!collision.ids.includes(element.dataset.gddBody ?? "")) return;
        animations.push(
          element.animate(
            [
              { transform: "scale(1)" },
              {
                transform: collision.horizontal
                  ? "scale(0.975, 1.025)"
                  : "scale(1.025, 0.975)",
                offset: 0.3,
              },
              { transform: "scale(1.01, 0.99)", offset: 0.65 },
              { transform: "scale(1)" },
            ],
            { duration: 360, easing: "ease-out" },
          ),
        );
      });
    return () => animations.forEach((animation) => animation.cancel());
  }, [collision]);

  useEffect(() => {
    if (!impact) return;
    const element = [
      ...(workspace.current?.querySelectorAll<HTMLElement>("[data-gdd-body]") ??
        []),
    ].find((body) => body.dataset.gddBody === impact.fallingId);
    element?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [impact]);
  const subsectionParent =
    rootBlocks.find((block) => block.id === openSubsectionsId) ?? null;
  const childBlocks = subsectionParent
    ? orderedGddBlocks(subsectionParent.subsections)
    : [];
  const availableSubjects = GDD_SUBJECTS.filter(
    (subject) => !rootBlocks.some((block) => block.subjectId === subject.id),
  );

  function updateMain(
    blockId: string,
    update: (block: GddSubjectBlock) => GddSubjectBlock,
  ) {
    const blocks = project.blocks.blocks.map((block) =>
      block.id === blockId ? update(block) : block,
    );
    onChange({
      ...project,
      blocks: { ...project.blocks, blocks },
    });
  }

  function updateChildren(
    parentId: string,
    update: (
      blocks: GddCanvasStructure<GddSubsectionBlock>,
    ) => GddCanvasStructure<GddSubsectionBlock>,
  ) {
    onChange({
      ...project,
      blocks: {
        ...project.blocks,
        blocks: project.blocks.blocks.map((block) =>
          block.id === parentId
            ? { ...block, subsections: update(block.subsections) }
            : block,
        ),
      },
    });
  }

  function setLayout(
    scope: "main" | "subsection",
    blockId: string,
    layout: GddBlockLayout,
    parentId?: string,
  ) {
    const bounds = blockBounds(layout);
    if (bounds.left < 0 || bounds.top < 0) {
      setFeedback("Keep blocks inside the canvas.");
      return;
    }
    if (scope === "main") {
      const current = project.blocks.blocks.find(
        (block) => block.id === blockId,
      );
      if (!current) return;
      const candidate = { ...current, layout };
      const siblings = project.blocks.blocks.filter(
        (block) => block.id !== blockId,
      );
      if (structureHasOverlap([...siblings, candidate])) {
        setFeedback("Blocks cannot overlap.");
        return;
      }
      const changed = project.blocks.blocks.map((block) =>
        block.id === blockId ? candidate : block,
      );
      const structure = {
        ...project.blocks,
        blocks: changed,
      };
      onChange({
        ...project,
        blocks:
          structure.orderMode === "spatial"
            ? spatiallyOrderGddBlocks(structure)
            : structure,
      });
      setFeedback("");
      return;
    }
    if (!parentId) return;
    const parent = project.blocks.blocks.find((block) => block.id === parentId);
    const current = parent?.subsections.blocks.find(
      (block) => block.id === blockId,
    );
    if (!parent || !current) return;
    const candidate = { ...current, layout };
    const siblings = parent.subsections.blocks.filter(
      (block) => block.id !== blockId,
    );
    if (structureHasOverlap([...siblings, candidate])) {
      setFeedback("Blocks cannot overlap.");
      return;
    }
    const structure = {
      ...parent.subsections,
      blocks: parent.subsections.blocks.map((block) =>
        block.id === blockId ? candidate : block,
      ),
    };
    updateChildren(parentId, () =>
      structure.orderMode === "spatial"
        ? spatiallyOrderGddBlocks(structure)
        : structure,
    );
    setFeedback("");
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const branch = heldRef.current;
    if (branch) {
      const rect = canvasScene.current?.getBoundingClientRect();
      if (!rect) return;
      const bounds = branch.blocks.map((block) => blockBounds(block.layout));
      const dx = Math.max(
        -Math.min(...bounds.map((bound) => bound.left)),
        Math.min(
          sceneWidth - Math.max(...bounds.map((bound) => bound.right)),
          event.clientX - rect.left - branch.startX,
        ),
      );
      const dy = Math.max(
        -Math.min(...bounds.map((bound) => bound.top)),
        Math.min(
          foundationTop - Math.max(...bounds.map((bound) => bound.bottom)),
          event.clientY - rect.top - branch.startY,
        ),
      );
      const moving = translateBodies(branch.blocks, dx, dy);
      const attachment = nearestAttachment(
        moving,
        rootBlocks.filter((block) => !branch.ids.has(block.id)),
        foundation,
      );
      const magnetic = attachment && attachment.distance <= 26;
      const next = {
        ...branch,
        dx: dx + (magnetic ? attachment.dx : 0),
        dy: dy + (magnetic ? attachment.dy : 0),
        attachment: magnetic ? { ...attachment, dx: 0, dy: 0 } : attachment,
      };
      heldRef.current = next;
      setHeld(next);
      return;
    }
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    let layout: GddBlockLayout;
    if (active.mode === "move") {
      const point = snapNearBlocks(
        {
          ...active.layout,
          x: active.layout.x + dx,
          y: active.layout.y + dy,
        },
        active.scope === "main"
          ? project.blocks.blocks.filter((block) => block.id !== active.blockId)
          : (
              project.blocks.blocks.find(
                (block) => block.id === active.parentId,
              )?.subsections.blocks ?? []
            ).filter((block) => block.id !== active.blockId),
      );
      layout = { ...active.layout, ...point };
    } else {
      const radians = (active.layout.rotation * Math.PI) / 180;
      const widthDelta = Math.cos(radians) * dx + Math.sin(radians) * dy;
      const heightDelta = -Math.sin(radians) * dx + Math.cos(radians) * dy;
      layout = {
        ...active.layout,
        width: Math.max(
          160,
          Math.min(
            5000,
            active.layout.width + Math.round(widthDelta / 24) * 24,
          ),
        ),
        height: Math.max(
          120,
          Math.min(
            5000,
            active.layout.height + Math.round(heightDelta / 24) * 24,
          ),
        ),
      };
      if (active.scope === "main") {
        const oldBounds = blockBounds(active.layout);
        const newBounds = blockBounds(layout);
        layout.x = active.layout.x + (newBounds.width - oldBounds.width) / 2;
        layout.y = active.layout.y + (oldBounds.height - newBounds.height) / 2;
      }
    }
    setLayout(active.scope, active.blockId, layout, active.parentId);
  }

  function beginDrag(
    event: ReactPointerEvent<HTMLElement>,
    scope: "main" | "subsection",
    block: GddSubjectBlock | GddSubsectionBlock,
    mode: "move" | "resize",
    parentId?: string,
  ) {
    if (disabled || physicsBlocks || heldRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    if (scope === "main" && mode === "move") {
      if (tool === "delete") {
        const subject = rootBlocks.find((entry) => entry.id === block.id);
        setRemoveTarget({
          blockId: block.id,
          label: subject ? subjectLabel(subject.subjectId) : "block",
        });
        return;
      }
      if (tool !== "resize") {
        const ids = detachedBranchIds(rootBlocks, block.id, foundation);
        const rect = canvasScene.current?.getBoundingClientRect();
        if (!rect) return;
        const branch: HeldBranch = {
          ids,
          blocks: rootBlocks.filter((entry) => ids.has(entry.id)),
          startX: event.clientX - rect.left,
          startY: event.clientY - rect.top,
          dx: 0,
          dy: 0,
          attachment: null,
          latched: tool === "detach",
        };
        branch.attachment = nearestAttachment(
          branch.blocks,
          rootBlocks.filter((entry) => !ids.has(entry.id)),
          foundation,
        );
        heldRef.current = branch;
        setHeld(branch);
        setSelectedId(block.id);
        if (!branch.latched)
          workspace.current?.setPointerCapture(event.pointerId);
        return;
      }
      mode = "resize";
    }
    workspace.current?.setPointerCapture(event.pointerId);
    drag.current = {
      scope,
      parentId,
      blockId: block.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      layout: block.layout,
    };
    if (scope === "main") setResizing(true);
  }

  function placeHeld() {
    const branch = heldRef.current;
    if (!branch) return;
    if (!branch.attachment) {
      setFeedback("No clear attachment edge. Move the branch to make room.");
      return;
    }
    const { dx, dy } = branch.attachment;
    const moved = translateBodies(
      branch.blocks,
      branch.dx + dx,
      branch.dy + dy,
    );
    const structure = {
      ...project.blocks,
      blocks: project.blocks.blocks.map((block) => {
        const layout = moved.find((entry) => entry.id === block.id)?.layout;
        return layout ? { ...block, layout } : block;
      }),
    };
    if (structureHasOverlap(structure.blocks)) {
      setFeedback("Move the branch to a clear attachment edge.");
      return;
    }
    onChange({
      ...project,
      blocks:
        structure.orderMode === "spatial"
          ? spatiallyOrderGddBlocks(structure)
          : structure,
    });
    const horizontal = branch.attachment.edge.x1 === branch.attachment.edge.x2;
    setCollision({
      ids: [
        ...branch.ids,
        ...structure.blocks
          .filter(
            (body) =>
              !branch.ids.has(body.id) &&
              moved.some((entry) => touchingEdges(entry.layout, body.layout)),
          )
          .map((body) => body.id),
      ],
      horizontal,
    });
    heldRef.current = null;
    setHeld(null);
    setFeedback("");
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (heldRef.current && !heldRef.current.latched) {
      if (event.type === "pointercancel") {
        heldRef.current = null;
        setHeld(null);
      } else placeHeld();
    }
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    setResizing(false);
    if (workspace.current?.hasPointerCapture(event.pointerId))
      workspace.current.releasePointerCapture(event.pointerId);
  }

  function addMain(subjectId: GddSubjectBlock["subjectId"]) {
    const block = newGddSubjectBlock(subjectId, project.blocks.blocks.length);
    const placement = placeGddSubjectBlockOnTop(
      block.layout,
      project.blocks.blocks,
      {
        x: Math.max(
          block.layout.width / 2 + 24,
          (canvasViewport.current?.scrollLeft ?? 0) +
            (canvasViewport.current?.clientWidth ?? 1120) / 2,
        ),
        top: foundationTop,
      },
    );
    sceneHeight.current = canvasHeight + placement.shiftDown;
    block.layout = placement.layout;
    const existingBlocks = project.blocks.blocks.map((existing) => ({
      ...existing,
      layout: {
        ...existing.layout,
        y: existing.layout.y + placement.shiftDown,
      },
    }));
    const structure = {
      ...project.blocks,
      blocks: [...existingBlocks, block],
    };
    onChange({
      ...project,
      blocks:
        structure.orderMode === "spatial"
          ? spatiallyOrderGddBlocks(structure)
          : structure,
    });
    const bouncingIds = placement.supportId ? [placement.supportId] : [];
    setImpact({ fallingId: block.id, bouncingIds });
    if (impactTimer.current !== null) window.clearTimeout(impactTimer.current);
    impactTimer.current = window.setTimeout(() => setImpact(null), 650);
    setSelectedId(block.id);
    setAddMainAnchor(null);
  }

  function addChild(subjectId?: string, heading?: string) {
    if (!subsectionParent) return;
    const block = newGddSubsectionBlock(
      subsectionParent.subjectId,
      subsectionParent.subsections.blocks.length,
      subjectId as GddSubsectionBlock["subjectId"],
      heading,
    );
    block.layout = placeWithoutOverlap(
      block.layout,
      subsectionParent.subsections.blocks,
    );
    updateChildren(subsectionParent.id, (structure) => {
      const next = {
        ...structure,
        blocks: [...structure.blocks, block],
      };
      return structure.orderMode === "spatial"
        ? spatiallyOrderGddBlocks(next)
        : next;
    });
    setAddChildAnchor(null);
    setCustomOpen(false);
    setCustomHeading("");
    setImpact({ fallingId: block.id, bouncingIds: [] });
    if (impactTimer.current !== null) window.clearTimeout(impactTimer.current);
    impactTimer.current = window.setTimeout(() => setImpact(null), 650);
  }

  function removeBlock() {
    if (!removeTarget) return;
    if (removeTarget.imageId && removeTarget.parentId) {
      updateSubsection(removeTarget.parentId, removeTarget.blockId, (block) =>
        typeof block.content === "string"
          ? block
          : {
              ...block,
              content: {
                ...block.content,
                images: block.content.images.filter(
                  (image) => image.id !== removeTarget.imageId,
                ),
              },
            },
      );
    } else if (!removeTarget.parentId) {
      sceneHeight.current = project.blocks.blocks.length > 1 ? canvasHeight : 0;
      onChange({
        ...project,
        blocks: {
          ...project.blocks,
          blocks: project.blocks.blocks
            .filter((block) => block.id !== removeTarget.blockId)
            .map((block, order) => ({ ...block, order })),
        },
      });
      if (selectedId === removeTarget.blockId) setSelectedId(null);
      if (openSubsectionsId === removeTarget.blockId)
        setOpenSubsectionsId(null);
    } else {
      updateChildren(removeTarget.parentId, (structure) => ({
        ...structure,
        blocks: structure.blocks
          .filter((block) => block.id !== removeTarget.blockId)
          .map((block, order) => ({ ...block, order })),
      }));
    }
    setRemoveTarget(null);
  }

  function updateSubsection(
    parentId: string,
    blockId: string,
    update: (block: GddSubsectionBlock) => GddSubsectionBlock,
  ) {
    updateChildren(parentId, (structure) => ({
      ...structure,
      blocks: structure.blocks.map((block) =>
        block.id === blockId ? update(block) : block,
      ),
    }));
  }

  function updateField(blockId: string, key: string, value: string) {
    updateMain(blockId, (block) => ({
      ...block,
      fields: { ...block.fields, [key]: value },
    }));
  }

  function changeOrder(
    scope: "main" | "subsection",
    blockId: string,
    destination: number,
    parentId?: string,
  ) {
    try {
      if (scope === "main") {
        const blocks = reorderGddBlocks(project.blocks, blockId, destination);
        onChange({ ...project, blocks });
      } else if (parentId) {
        updateChildren(parentId, (structure) =>
          reorderGddBlocks(structure, blockId, destination),
        );
      }
      setFeedback("");
    } catch (cause) {
      setFeedback(
        cause instanceof Error
          ? cause.message
          : "Could not change block order.",
      );
    }
  }

  function openStyleMenu(
    event: ReactMouseEvent<HTMLElement>,
    blockId: string,
    parentId?: string,
  ) {
    event.stopPropagation();
    setStyleTarget({ blockId, parentId });
    setStyleAnchor(event.currentTarget);
  }

  function setBlockStyle(style: {
    backgroundColor?: string;
    borderStyle?: GddSubjectBlock["style"]["borderStyle"];
  }) {
    if (!styleTarget) return;
    if (styleTarget.parentId) {
      updateSubsection(styleTarget.parentId, styleTarget.blockId, (block) => ({
        ...block,
        style: { ...block.style, ...style },
      }));
    } else {
      updateMain(styleTarget.blockId, (block) => ({
        ...block,
        style: { ...block.style, ...style },
      }));
    }
    setStyleAnchor(null);
  }

  function addField(blockId: string) {
    const block = project.blocks.blocks.find((entry) => entry.id === blockId);
    if (!block) return;
    let label = "Notes";
    let suffix = 2;
    while (Object.prototype.hasOwnProperty.call(block.fields, label))
      label = `Notes ${suffix++}`;
    updateField(blockId, label, "");
  }

  function renderSpawnRays(width: number, height: number) {
    return (
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: -28,
          pointerEvents: "none",
          animation: `${spawnRayAnimation} 550ms ease-out both`,
          "@media (prefers-reduced-motion: reduce)": { display: "none" },
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width + 56} ${height + 56}`}
          style={{ overflow: "visible" }}
        >
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (index * Math.PI) / 5;
            const x = width / 2 + 28;
            const y = height / 2 + 28;
            const rx = width / 2 + 12;
            const ry = height / 2 + 12;
            return (
              <line
                key={index}
                x1={x + Math.cos(angle) * rx}
                y1={y + Math.sin(angle) * ry}
                x2={x + Math.cos(angle) * (rx + 18)}
                y2={y + Math.sin(angle) * (ry + 18)}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </Box>
    );
  }

  function renderSubsection(
    block: GddSubsectionBlock,
    parentId: string,
    index: number,
  ) {
    const quarterTurn = block.layout.rotation % 180 !== 0;
    const visualWidth = quarterTurn ? block.layout.height : block.layout.width;
    const visualHeight = quarterTurn ? block.layout.width : block.layout.height;
    const imageEntries =
      typeof block.content === "string" ? [] : block.content.images;
    return (
      <Box
        key={block.id}
        sx={{
          position: "absolute",
          left: block.layout.x - visualWidth / 2,
          top: block.layout.y - visualHeight / 2,
          width: visualWidth,
          height: visualHeight,
          zIndex: 2 + index,
          animation:
            impact?.fallingId === block.id
              ? `${spawnAnimation} 450ms ease-out both`
              : undefined,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Paper
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: block.layout.width,
            height: block.layout.height,
            transform: `translate(-50%, -50%) rotate(${block.layout.rotation}deg)`,
            transformOrigin: "center",
            bgcolor: appearance.darkMode
              ? `color-mix(in srgb, ${block.style.backgroundColor} 15%, ${theme.palette.background.paper})`
              : block.style.backgroundColor,
            color: "text.primary",
            border:
              block.style.borderStyle === "none"
                ? "none"
                : `2px ${block.style.borderStyle} ${theme.palette.text.primary}`,
            borderRadius: "8px",
            boxShadow:
              "0 4px 0 var(--gdd-block-shadow), inset 0 2px 0 rgba(255,255,255,.2)",
            overflow: "hidden",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            p: 1.25,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "auto",
            color: "text.primary",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box
              onPointerDown={(event) =>
                beginDrag(event, "subsection", block, "move", parentId)
              }
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: 1,
                cursor: disabled ? "default" : "grab",
                touchAction: "none",
                minWidth: 0,
              }}
            >
              <FaArrowsUpDownLeftRight size={12} />
              <TextField
                type="number"
                size="small"
                value={block.order + 1}
                disabled={disabled}
                inputProps={{
                  min: 1,
                  max: subsectionParent?.subsections.blocks.length ?? 1,
                  "aria-label": `Document order for ${block.heading}`,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const destination = Number(event.target.value) - 1;
                  if (Number.isInteger(destination))
                    changeOrder("subsection", block.id, destination, parentId);
                }}
                sx={{
                  width: 58,
                  "& input": { py: 0.3, px: 0.5, fontSize: 12 },
                }}
              />
              <Typography
                sx={{
                  fontFamily:
                    '"Bricolage Grotesque", "Trebuchet MS", sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {block.heading || "Untitled"}
              </Typography>
            </Box>
            <Tooltip title="Rotate 90°">
              <IconButton
                size="small"
                aria-label={`Rotate ${block.heading} 90 degrees`}
                disabled={disabled}
                onClick={() =>
                  setLayout(
                    "subsection",
                    block.id,
                    {
                      ...block.layout,
                      rotation: ((block.layout.rotation + 90) % 360) as
                        | 0
                        | 90
                        | 180
                        | 270,
                    },
                    parentId,
                  )
                }
              >
                <FaRotate size={12} />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              aria-label={`Customize ${block.heading}`}
              disabled={disabled}
              onClick={(event) => openStyleMenu(event, block.id, parentId)}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: block.style.backgroundColor,
                  border: "1px solid var(--gdd-ink)",
                }}
              />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Remove ${block.heading || "subsection"}`}
              disabled={disabled}
              onClick={() =>
                setRemoveTarget({
                  parentId,
                  blockId: block.id,
                  label: block.heading || "subsection",
                })
              }
            >
              <FaTrash size={12} />
            </IconButton>
          </Stack>
          {typeof block.content === "string" ? (
            <TextField
              value={block.content}
              onChange={(event) =>
                updateSubsection(parentId, block.id, (current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              disabled={disabled}
              multiline
              minRows={2}
              variant="standard"
              placeholder="Write here…"
              inputProps={{
                "aria-label": `${block.heading || "Subsection"} content`,
              }}
              sx={{
                mt: 0.5,
                flex: 1,
                "& .MuiInputBase-root": {
                  alignItems: "flex-start",
                  fontFamily: '"Work Sans", Arial, sans-serif',
                  fontSize: 13,
                },
              }}
            />
          ) : (
            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
              {imageEntries.map((image, imageIndex) => (
                <Stack
                  key={image.id}
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                >
                  <Box
                    component="img"
                    src={images[image.path]?.src}
                    alt={image.caption}
                    sx={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      objectFit: "cover",
                      borderRadius: 1,
                      border: "1px solid var(--gdd-ink)",
                    }}
                  />
                  <TextField
                    value={image.caption}
                    size="small"
                    disabled={disabled}
                    inputProps={{
                      "aria-label": `Caption for ${image.caption || "image"}`,
                      maxLength: 400,
                    }}
                    onChange={(event) =>
                      updateSubsection(parentId, block.id, (current) =>
                        typeof current.content === "string"
                          ? current
                          : {
                              ...current,
                              content: {
                                ...current.content,
                                images: current.content.images.map((entry) =>
                                  entry.id === image.id
                                    ? { ...entry, caption: event.target.value }
                                    : entry,
                                ),
                              },
                            },
                      )
                    }
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      "& input": { py: 0.6, px: 0.75, fontSize: 11 },
                    }}
                  />
                  <IconButton
                    size="small"
                    aria-label={`Move ${image.caption} up`}
                    disabled={disabled || imageIndex === 0}
                    onClick={() =>
                      updateSubsection(parentId, block.id, (current) => {
                        if (typeof current.content === "string") return current;
                        const entries = [...current.content.images];
                        [entries[imageIndex - 1], entries[imageIndex]] = [
                          entries[imageIndex],
                          entries[imageIndex - 1],
                        ];
                        return {
                          ...current,
                          content: { ...current.content, images: entries },
                        };
                      })
                    }
                  >
                    <FaArrowUp size={11} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Move ${image.caption} down`}
                    disabled={
                      disabled || imageIndex === imageEntries.length - 1
                    }
                    onClick={() =>
                      updateSubsection(parentId, block.id, (current) => {
                        if (typeof current.content === "string") return current;
                        const entries = [...current.content.images];
                        [entries[imageIndex], entries[imageIndex + 1]] = [
                          entries[imageIndex + 1],
                          entries[imageIndex],
                        ];
                        return {
                          ...current,
                          content: { ...current.content, images: entries },
                        };
                      })
                    }
                  >
                    <FaArrowDown size={11} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Remove image ${image.caption}`}
                    disabled={disabled}
                    onClick={() =>
                      setRemoveTarget({
                        parentId,
                        blockId: block.id,
                        imageId: image.id,
                        label: image.caption || "image",
                      })
                    }
                  >
                    <FaTrash size={11} />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                disabled={disabled}
                onClick={() => {
                  uploadInput.current?.setAttribute(
                    "data-target",
                    `${parentId}:${block.id}`,
                  );
                  uploadInput.current?.click();
                }}
              >
                Add images
              </Button>
            </Stack>
          )}
          <Box
            role="button"
            aria-label={`Resize ${block.heading}`}
            onPointerDown={(event) =>
              beginDrag(event, "subsection", block, "resize", parentId)
            }
            sx={{
              position: "absolute",
              width: 18,
              height: 18,
              right: 2,
              bottom: 2,
              cursor: "nwse-resize",
              touchAction: "none",
              borderRadius: "50%",
              background: "#DDA7A5",
              border: "2px solid var(--gdd-ink)",
            }}
          />
        </Box>
        {impact?.fallingId === block.id &&
          renderSpawnRays(visualWidth, visualHeight)}
      </Box>
    );
  }

  function renderSubject(block: GddSubjectBlock, index: number) {
    const quarterTurn = block.layout.rotation % 180 !== 0;
    const visualWidth = quarterTurn ? block.layout.height : block.layout.width;
    const visualHeight = quarterTurn ? block.layout.width : block.layout.height;
    const isSelected = selectedId === block.id;
    const bounceIndex = impact?.bouncingIds.indexOf(block.id) ?? -1;
    const animation =
      impact?.fallingId === block.id
        ? `${spawnAnimation} 450ms ease-out both`
        : bounceIndex >= 0
          ? `${supportBounceAnimation} 360ms ease-out 160ms both`
          : undefined;
    return (
      <Box
        key={block.id}
        data-gdd-body={block.id}
        onPointerDown={(event) => {
          if (tool !== "move" || !(event.target instanceof Element)) return;
          if (event.target.closest("button, input, textarea, a, [role=button]"))
            return;
          beginDrag(event, "main", block, "move");
        }}
        onClickCapture={(event) => {
          if (tool !== "move" || heldRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerDownCapture={(event) => {
          if (tool !== "move" && !heldRef.current)
            beginDrag(event, "main", block, "move");
        }}
        sx={{
          position: "absolute",
          left: block.layout.x - visualWidth / 2,
          top: block.layout.y - visualHeight / 2,
          width: visualWidth,
          height: visualHeight,
          zIndex: held?.ids.has(block.id) ? 40 : isSelected ? 20 : 2 + index,
          opacity: held?.ids.has(block.id) ? 0.8 : 1,
          pointerEvents: physicsBlocks ? "none" : "auto",
          touchAction: tool === "move" ? "auto" : "none",
          animation,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Paper
          onClick={() => setSelectedId(block.id)}
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: block.layout.width,
            height: block.layout.height,
            transform: `translate(-50%, -50%) rotate(${block.layout.rotation}deg)`,
            transformOrigin: "center",
            bgcolor: appearance.darkMode
              ? `color-mix(in srgb, ${block.style.backgroundColor} 15%, ${theme.palette.background.paper})`
              : block.style.backgroundColor,
            color: "text.primary",
            border:
              block.style.borderStyle === "none"
                ? "none"
                : `2px ${block.style.borderStyle} ${theme.palette.text.primary}`,
            borderRadius: "8px",
            boxShadow: isSelected
              ? "0 6px 0 var(--gdd-block-shadow), inset 0 2px 0 rgba(255,255,255,.25)"
              : "0 4px 0 var(--gdd-block-shadow), inset 0 2px 0 rgba(255,255,255,.2)",
            overflow: "hidden",
            cursor: "pointer",
          }}
        />
        <Box
          onClick={() => setSelectedId(block.id)}
          sx={{
            position: "absolute",
            inset: 0,
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "auto",
            color: "text.primary",
            outline: isSelected ? "2px solid" : "none",
            outlineColor: "primary.main",
            outlineOffset: 3,
            borderRadius: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box
              onPointerDown={(event) => beginDrag(event, "main", block, "move")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: 1,
                minWidth: 0,
                cursor: disabled ? "default" : "grab",
                touchAction: "none",
              }}
            >
              <FaArrowsUpDownLeftRight size={13} />
              <TextField
                type="number"
                size="small"
                value={block.order + 1}
                disabled={disabled}
                inputProps={{
                  min: 1,
                  max: project.blocks.blocks.length,
                  "aria-label": `Document order for ${subjectLabel(block.subjectId)}`,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const destination = Number(event.target.value) - 1;
                  if (Number.isInteger(destination))
                    changeOrder("main", block.id, destination);
                }}
                sx={{
                  width: 58,
                  "& input": { py: 0.3, px: 0.5, fontSize: 12 },
                }}
              />
              <Typography
                component="h2"
                sx={{
                  fontFamily:
                    '"Bricolage Grotesque", "Trebuchet MS", sans-serif',
                  fontSize: 17,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {subjectLabel(block.subjectId)}
              </Typography>
            </Box>
            <Tooltip title="Rotate 90°">
              <IconButton
                size="small"
                aria-label={`Rotate ${subjectLabel(block.subjectId)} 90 degrees`}
                disabled={disabled}
                onClick={() =>
                  setLayout("main", block.id, {
                    ...block.layout,
                    rotation: ((block.layout.rotation + 90) % 360) as
                      | 0
                      | 90
                      | 180
                      | 270,
                  })
                }
              >
                <FaRotate size={13} />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              aria-label={`Remove ${subjectLabel(block.subjectId)}`}
              disabled={disabled}
              onClick={() =>
                setRemoveTarget({
                  blockId: block.id,
                  label: subjectLabel(block.subjectId),
                })
              }
            >
              <FaTrash size={13} />
            </IconButton>
          </Stack>
          <Typography
            sx={{
              mt: 0.25,
              fontFamily: '"Work Sans", Arial, sans-serif',
              fontSize: 12,
              color: "text.secondary",
            }}
          >
            {block.subsections.blocks.length} subsections
          </Typography>
          <Box sx={{ mt: 1, flex: 1, overflow: "hidden" }}>
            {block.subjectId === "game-title-description" ? (
              <Stack spacing={0.5}>
                <TextField
                  size="small"
                  value={block.fields.title ?? ""}
                  disabled={disabled}
                  placeholder="Game title"
                  inputProps={{ "aria-label": "Game title" }}
                  onChange={(event) =>
                    updateField(block.id, "title", event.target.value)
                  }
                />
                <TextField
                  size="small"
                  value={block.fields.description ?? ""}
                  disabled={disabled}
                  placeholder="Description"
                  multiline
                  minRows={2}
                  inputProps={{ "aria-label": "Game description" }}
                  onChange={(event) =>
                    updateField(block.id, "description", event.target.value)
                  }
                />
              </Stack>
            ) : block.subjectId === "prototype-technical-requirements" &&
              block.prototype ? (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {block.prototype.engines.length} engines ·{" "}
                {block.prototype.platforms.length} platforms
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {Object.entries(block.fields)
                  .slice(0, 1)
                  .map(([heading, body]) => (
                    <TextField
                      key={heading}
                      size="small"
                      value={body}
                      disabled={disabled}
                      placeholder={heading}
                      multiline
                      minRows={2}
                      inputProps={{ "aria-label": heading }}
                      onChange={(event) =>
                        updateField(block.id, heading, event.target.value)
                      }
                    />
                  ))}
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={disabled}
              onClick={() => {
                setSelectedId(block.id);
                setOpenSubsectionsId(block.id);
              }}
            >
              Open subsections
            </Button>
            <Tooltip title="Change block colors and border">
              <IconButton
                size="small"
                aria-label={`Customize ${subjectLabel(block.subjectId)}`}
                disabled={disabled}
                onClick={(event) => openStyleMenu(event, block.id)}
              >
                <span
                  aria-hidden
                  style={{
                    display: "block",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: block.style.backgroundColor,
                    border: "1px solid var(--gdd-ink)",
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
          <Box
            role="button"
            aria-label={`Resize ${subjectLabel(block.subjectId)}`}
            onPointerDown={(event) => beginDrag(event, "main", block, "resize")}
            sx={{
              position: "absolute",
              width: 18,
              height: 18,
              right: 3,
              bottom: 3,
              cursor: "nwse-resize",
              touchAction: "none",
              borderRadius: "50%",
              background: "#DDA7A5",
              border: "2px solid var(--gdd-ink)",
            }}
          />
        </Box>
        {impact?.fallingId === block.id &&
          renderSpawnRays(visualWidth, visualHeight)}
      </Box>
    );
  }

  function renderExpandedParent(block: GddSubjectBlock) {
    if (block.subjectId === "game-title-description")
      return (
        <Stack spacing={1.5}>
          <TextField
            label="Game title"
            value={block.fields.title ?? ""}
            disabled={disabled}
            onChange={(event) =>
              updateField(block.id, "title", event.target.value)
            }
          />
          <TextField
            label="Description"
            value={block.fields.description ?? ""}
            disabled={disabled}
            multiline
            minRows={3}
            onChange={(event) =>
              updateField(block.id, "description", event.target.value)
            }
          />
        </Stack>
      );
    if (
      block.subjectId === "prototype-technical-requirements" &&
      block.prototype
    )
      return (
        <Stack spacing={2}>
          <PrototypeFields
            value={block.prototype}
            sectionCount={project.blocks.blocks.length}
            disabled={disabled}
            onChange={(prototype) =>
              updateMain(block.id, (current) => ({ ...current, prototype }))
            }
          />
          <TechnicalDetails
            value={block.prototype}
            disabled={disabled}
            onChange={(prototype) =>
              updateMain(block.id, (current) => ({ ...current, prototype }))
            }
          />
        </Stack>
      );
    return (
      <Stack spacing={1}>
        {Object.entries(block.fields).map(([label, value]) => (
          <TextField
            key={label}
            label={label}
            value={value}
            disabled={disabled}
            multiline
            minRows={2}
            onChange={(event) =>
              updateField(block.id, label, event.target.value)
            }
          />
        ))}
        <Button
          startIcon={<FaPlus />}
          disabled={disabled}
          onClick={() => addField(block.id)}
          sx={{ alignSelf: "flex-start" }}
        >
          Add field
        </Button>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        "--gdd-block-shadow": appearance.darkMode ? "#0C1012" : "#B8B4A9",
        "--gdd-ink": theme.palette.text.primary,
        "--gdd-paper": theme.palette.background.paper,
        "--gdd-background": theme.palette.background.default,
        "--gdd-muted": theme.palette.text.secondary,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        pb: `calc(${toolbarHeight + 24}px + env(safe-area-inset-bottom))`,
      }}
    >
      <Box
        ref={workspace}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        sx={{
          display: "grid",
          gridTemplateColumns: subsectionParent
            ? {
                xs: "minmax(0, 1fr)",
                xl: "minmax(0, 1fr) minmax(420px, 0.8fr)",
              }
            : "minmax(0, 1fr)",
          gridTemplateRows: subsectionParent
            ? {
                xs: "minmax(0, 1fr) minmax(0, 1fr)",
                xl: "minmax(0, 1fr)",
              }
            : "minmax(0, 1fr)",
          gap: 2,
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          height: "100%",
        }}
      >
        <Box
          ref={canvasViewport}
          onPointerDownCapture={(event) => {
            if (!heldRef.current?.latched) return;
            event.preventDefault();
            event.stopPropagation();
            placeHeld();
          }}
          sx={{
            position: "relative",
            overflow: "auto",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            border: "2px solid var(--gdd-ink)",
            borderRadius: "18px 14px 22px 12px / 12px 22px 14px 18px",
            bgcolor: "background.default",
            backgroundImage: `radial-gradient(circle, ${appearance.darkMode ? "rgba(243,238,227,.15)" : "rgba(30,30,30,.16)"} 1px, transparent 1.2px)`,
            backgroundSize: "24px 24px",
            boxShadow: "4px 4px 0 var(--gdd-block-shadow)",
            cursor: holding
              ? "grabbing"
              : tool === "detach"
                ? "crosshair"
                : tool === "resize"
                  ? "nwse-resize"
                  : tool === "delete"
                    ? "not-allowed"
                    : "default",
          }}
        >
          <Box
            ref={canvasScene}
            sx={{
              position: "relative",
              width: sceneWidth,
              height: canvasHeight,
              minHeight: canvasHeight,
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                left: foundation.left,
                right: sceneWidth - foundation.right,
                bottom: FOUNDATION_GAP,
                height: FOUNDATION_HEIGHT,
                zIndex: 1,
                bgcolor: "#DDA7A5",
                border: "2px solid var(--gdd-ink)",
                borderRadius: "7px 5px 8px 4px / 4px 8px 5px 7px",
                boxShadow: "0 5px 0 var(--gdd-block-shadow)",
              }}
            />
            {displayBlocks.map(renderSubject)}
            <Box
              component="svg"
              aria-hidden
              width={sceneWidth}
              height={canvasHeight}
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 50,
                color: "primary.main",
                overflow: "visible",
              }}
            >
              {rootBlocks
                .filter(
                  (block) =>
                    groundedIds.has(block.id) && !held?.ids.has(block.id),
                )
                .map((block) => {
                  const bounds = blockBounds(block.layout);
                  return Math.abs(bounds.bottom - foundationTop) < 0.01 ? (
                    <line
                      key={block.id}
                      x1={Math.max(bounds.left, foundation.left) + 10}
                      x2={Math.min(bounds.right, foundation.right) - 10}
                      y1={foundationTop}
                      y2={foundationTop}
                      stroke="currentColor"
                      strokeWidth={3}
                      opacity={0.65}
                    />
                  ) : null;
                })}
              {held?.attachment && (
                <>
                  {translateBodies(
                    movingBlocks,
                    held.attachment.dx,
                    held.attachment.dy,
                  ).map((block) => {
                    const bounds = blockBounds(block.layout);
                    return (
                      <rect
                        key={block.id}
                        x={bounds.left}
                        y={bounds.top}
                        width={bounds.width}
                        height={bounds.height}
                        rx={8}
                        fill="currentColor"
                        fillOpacity={0.1}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeDasharray="7 5"
                      />
                    );
                  })}
                  <line
                    {...held.attachment.edge}
                    stroke={theme.palette.background.default}
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    {...held.attachment.edge}
                    stroke="currentColor"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                </>
              )}
            </Box>
          </Box>
        </Box>
        {subsectionParent && (
          <Paper
            component="section"
            aria-label={`${subjectLabel(subsectionParent.subjectId)} subsections`}
            sx={{
              position: "relative",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              p: 2,
              overflow: "auto",
              bgcolor: "background.paper",
              color: "text.primary",
              border: "2px dashed var(--gdd-ink)",
              borderRadius: "16px 13px 21px 12px / 12px 20px 14px 16px",
              boxShadow: "4px 4px 0 rgba(30,30,30,.35)",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ position: "relative", zIndex: 5, mb: 1.5 }}
            >
              <Typography
                component="h2"
                sx={{
                  flex: 1,
                  fontFamily:
                    '"Bricolage Grotesque", "Trebuchet MS", sans-serif',
                  fontWeight: 700,
                  fontSize: 21,
                  lineHeight: 1.2,
                }}
              >
                {subjectLabel(subsectionParent.subjectId)}
              </Typography>
              <Tooltip title="Add subsection">
                <IconButton
                  aria-label="Add subsection"
                  disabled={disabled}
                  onClick={(event) => setAddChildAnchor(event.currentTarget)}
                >
                  <FaPlus />
                </IconButton>
              </Tooltip>
              {subsectionParent.subsections.orderMode === "manual" && (
                <Button
                  size="small"
                  onClick={() =>
                    updateChildren(subsectionParent.id, spatiallyOrderGddBlocks)
                  }
                >
                  Reset order
                </Button>
              )}
              <Tooltip title="Close subsection view">
                <IconButton
                  aria-label="Close subsection view"
                  onClick={() => setOpenSubsectionsId(null)}
                >
                  <FaXmark />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box
              sx={{
                position: "relative",
                minWidth: 680,
                minHeight: 480,
                height: "calc(100% - 60px)",
                borderRadius: 2,
                backgroundImage:
                  "radial-gradient(circle, rgba(30,30,30,.14) 1px, transparent 1.2px)",
                backgroundSize: "24px 24px",
              }}
            >
              {childBlocks.map((block, index) =>
                renderSubsection(block, subsectionParent.id, index),
              )}
              {!childBlocks.length && (
                <Typography
                  sx={{
                    position: "absolute",
                    top: 140,
                    left: 24,
                    color: "text.secondary",
                    fontFamily: '"Work Sans", Arial, sans-serif',
                  }}
                >
                  Add a subsection block to build this subject.
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                position: "relative",
                zIndex: 4,
                borderTop: "1px dashed rgba(30,30,30,.35)",
                pt: 1.5,
                mt: 1,
                maxHeight: 250,
                overflow: "auto",
              }}
            >
              {renderExpandedParent(subsectionParent)}
            </Box>
          </Paper>
        )}
      </Box>
      <Box
        ref={toolbar}
        role="toolbar"
        aria-label="GDD canvas tools"
        sx={{
          position: "fixed",
          left: "50%",
          bottom: "max(12px, env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          zIndex: (theme) => theme.zIndex.appBar,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: appearance.compact ? 0.4 : 0.75,
          maxWidth: "calc(100vw - 20px)",
          width: "max-content",
          p: appearance.compact ? 0.6 : 1,
          border: "2px solid",
          borderColor: "divider",
          borderRadius: appearance.rounded ? 4 : 1,
          bgcolor: "background.paper",
          boxShadow: "0 5px 0 var(--gdd-block-shadow)",
          "& .MuiButton-root": {
            minWidth: 0,
            px: appearance.compact ? 1 : 1.4,
            borderRadius: appearance.rounded ? 2 : 0.5,
          },
          "& .MuiButton-outlined": {
            color: "text.primary",
            borderColor: "divider",
          },
        }}
      >
        <Stack
          direction="row"
          spacing={0.25}
          role="group"
          aria-label="Building tools"
          sx={{
            p: 0.4,
            bgcolor: "action.hover",
            borderRadius: appearance.rounded ? 2 : 0.5,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "100%",
          }}
        >
          <Tooltip title="Move branch">
            <span>
              <Button
                aria-label="Move branch"
                aria-pressed={tool === "move"}
                size="small"
                variant={tool === "move" ? "contained" : "text"}
                disabled={disabled || holding || physicsBlocks !== null}
                onClick={() => setTool("move")}
              >
                <FaArrowsUpDownLeftRight />
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="text"
            startIcon={<FaPlus />}
            disabled={
              disabled ||
              holding ||
              physicsBlocks !== null ||
              !availableSubjects.length ||
              impact !== null
            }
            onClick={(event) => setAddMainAnchor(event.currentTarget)}
          >
            Add block
          </Button>
          {(
            [
              { id: "resize", label: "Resize", icon: <FaExpand /> },
              { id: "detach", label: "Detach", icon: <FaMagnet /> },
              { id: "delete", label: "Delete", icon: <FaTrash /> },
            ] as const
          ).map((entry) => (
            <Tooltip key={entry.id} title={entry.label}>
              <span>
                <Button
                  size="small"
                  aria-label={`${entry.label} tool`}
                  aria-pressed={tool === entry.id}
                  variant={tool === entry.id ? "contained" : "text"}
                  disabled={disabled || holding || physicsBlocks !== null}
                  onClick={() => setTool(entry.id)}
                  startIcon={appearance.compact ? undefined : entry.icon}
                >
                  {appearance.compact ? entry.icon : entry.label}
                </Button>
              </span>
            </Tooltip>
          ))}
        </Stack>
        {holding && (
          <Tooltip title="Cancel placement (Escape)">
            <Button
              size="small"
              onClick={() => {
                heldRef.current = null;
                setHeld(null);
              }}
            >
              Cancel
            </Button>
          </Tooltip>
        )}
        {project.blocks.orderMode === "manual" && (
          <Button
            size="small"
            variant="outlined"
            disabled={disabled || holding}
            onClick={() =>
              onChange({
                ...project,
                blocks: spatiallyOrderGddBlocks(project.blocks),
              })
            }
          >
            Reset order
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<FaFilePdf />}
          disabled={disabled || busy || holding || physicsBlocks !== null}
          onClick={onExportPdf}
        >
          PDF
        </Button>
        {pdfUrl && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FaDownload />}
              disabled={disabled || busy}
              onClick={onDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FaArrowUpRightFromSquare />}
              component="a"
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open PDF
            </Button>
          </>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<FaFileArrowDown />}
          disabled={disabled || busy || holding || physicsBlocks !== null}
          onClick={onExportJson}
        >
          JSON
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FaDownload />}
          disabled={disabled || busy}
          onClick={onExportTemplate}
        >
          Blank template
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FaFileImport />}
          disabled={disabled || busy || holding}
          onClick={onImportJson}
        >
          Open
        </Button>
        {signedIn && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FaCloudArrowUp />}
              disabled={disabled || busy || holding || physicsBlocks !== null}
              onClick={onCloudSave}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={disabled || busy || holding}
              onClick={onOpenLibrary}
            >
              My GDDs
            </Button>
          </>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<FaRobot />}
          disabled={holding}
          onClick={onOpenAssistant}
        >
          AI
        </Button>
        <Tooltip title="Settings">
          <IconButton
            aria-label="Settings"
            aria-haspopup="dialog"
            aria-expanded={Boolean(settingsAnchor)}
            aria-controls={settingsAnchor ? "gdd-settings" : undefined}
            onClick={(event) => setSettingsAnchor(event.currentTarget)}
          >
            <FaGear size={18} />
          </IconButton>
        </Tooltip>
      </Box>
      <Popover
        open={Boolean(settingsAnchor)}
        anchorEl={settingsAnchor}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 2, width: 250, borderRadius: 2 } } }}
      >
        <Stack
          id="gdd-settings"
          role="dialog"
          aria-label="Settings"
          spacing={1}
        >
          <Typography component="h2" sx={{ fontWeight: 700 }}>
            Settings
          </Typography>
          <FormControlLabel
            label="Dark mode"
            control={
              <Switch
                checked={appearance.darkMode}
                onChange={(_, darkMode) =>
                  onAppearanceChange({ ...appearance, darkMode })
                }
              />
            }
          />
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Toolbar
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            role="group"
            aria-label="Toolbar accent"
          >
            {(["green", "blue", "rose"] as const).map((accent) => (
              <Tooltip title={accent} key={accent}>
                <IconButton
                  aria-label={`${accent} toolbar accent`}
                  aria-pressed={appearance.accent === accent}
                  onClick={() => onAppearanceChange({ ...appearance, accent })}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: {
                      green: "#365B35",
                      blue: "#275D85",
                      rose: "#963D54",
                    }[accent],
                    outline:
                      appearance.accent === accent ? "2px solid" : "none",
                    outlineColor: "text.primary",
                    outlineOffset: 2,
                    "&:hover": {
                      bgcolor: {
                        green: "#365B35",
                        blue: "#275D85",
                        rose: "#963D54",
                      }[accent],
                      opacity: 0.8,
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
          <FormControlLabel
            label="Rounded corners"
            control={
              <Switch
                checked={appearance.rounded}
                onChange={(_, rounded) =>
                  onAppearanceChange({ ...appearance, rounded })
                }
              />
            }
          />
          <FormControlLabel
            label="Compact"
            control={
              <Switch
                checked={appearance.compact}
                onChange={(_, compact) =>
                  onAppearanceChange({ ...appearance, compact })
                }
              />
            }
          />
        </Stack>
      </Popover>
      <Menu
        anchorEl={addMainAnchor}
        open={Boolean(addMainAnchor)}
        onClose={() => setAddMainAnchor(null)}
      >
        {availableSubjects.map((subject) => (
          <MenuItem
            key={subject.id}
            disabled={impact !== null}
            onClick={() => addMain(subject.id)}
          >
            {subject.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={addChildAnchor}
        open={Boolean(addChildAnchor)}
        onClose={() => setAddChildAnchor(null)}
      >
        {subsectionParent &&
          GDD_SUBJECTS.find(
            (subject) => subject.id === subsectionParent.subjectId,
          )?.subsections.map((subsection) => (
            <MenuItem
              key={subsection.id}
              onClick={() => addChild(subsection.id)}
              disabled={childBlocks.some(
                (block) => block.subjectId === subsection.id,
              )}
            >
              {subsection.label}
            </MenuItem>
          ))}
        <MenuItem
          onClick={() => {
            setAddChildAnchor(null);
            setCustomOpen(true);
          }}
        >
          Custom subsection…
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={styleAnchor}
        open={Boolean(styleAnchor)}
        onClose={() => setStyleAnchor(null)}
      >
        <MenuItem disabled>Paper color</MenuItem>
        <Stack direction="row" spacing={0.75} sx={{ px: 1.5, py: 0.75 }}>
          {GDD_BLOCK_COLORS.map((color) => (
            <IconButton
              key={color}
              aria-label={`Set block color ${color}`}
              onClick={() => setBlockStyle({ backgroundColor: color })}
              sx={{
                width: 30,
                height: 30,
                bgcolor: color,
                border: "1.5px solid #1E1E1E",
              }}
            />
          ))}
        </Stack>
        <MenuItem disabled>Border style</MenuItem>
        {(["solid", "dashed", "dotted", "double", "none"] as const).map(
          (borderStyle) => (
            <MenuItem
              key={borderStyle}
              onClick={() => setBlockStyle({ borderStyle })}
            >
              {borderStyle}
            </MenuItem>
          ),
        )}
      </Menu>
      <input
        ref={uploadInput}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg"
        aria-label="Upload subsection images"
        onChange={(event) => {
          const target = event.currentTarget.getAttribute("data-target");
          const files = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          event.currentTarget.removeAttribute("data-target");
          if (!target || !files.length) return;
          const [parentId, subsectionId] = target.split(":");
          onUpload(parentId, subsectionId, files);
        }}
      />
      <Dialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        aria-labelledby="gdd-custom-subsection-title"
      >
        <DialogTitle id="gdd-custom-subsection-title">
          Custom subsection
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Subsection title"
            value={customHeading}
            onChange={(event) => setCustomHeading(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomOpen(false)}>Cancel</Button>
          <Button
            disabled={!customHeading.trim() || !subsectionParent}
            onClick={() => addChild(undefined, customHeading)}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        aria-labelledby="gdd-remove-block-title"
      >
        <DialogTitle id="gdd-remove-block-title">Remove block?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove {removeTarget?.label} and its content from this project?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button color="error" onClick={removeBlock}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
