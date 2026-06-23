// AVL Tree Visualizer — pure TypeScript/React canvas renderer.
// Records insert operations as a sequence of steps (compare, rotate, balance),
// then plays them back step-by-step with the same play/pause/step controls
// as the WASM bar-chart visualizer.

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Slider, IconButton, Chip, LinearProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { FONTS } from '../../lib/globals';

// ─── Colours (match site palette) ────────────────────────────────────────────

const GOLD = '#ffd740';
const GREEN = '#a8d67e';
const SOFT_GREEN = '#c5e8a4';
const RED = '#d73737';
const VIOLET = '#be50dc';
const BLUE = '#3a6ea0';
const BG = '#0a0a19';
const NODE_BG = '#161628';
const NODE_BORDER = '#3a3a5a';
const EDGE_COL = '#2a2a4a';

// ─── AVL tree types ───────────────────────────────────────────────────────────

interface AVLNode {
    id: number;
    key: number;
    left: AVLNode | null;
    right: AVLNode | null;
    height: number;
}

function height(n: AVLNode | null): number { return n ? n.height : 0; }
function bf(n: AVLNode | null): number { return n ? height(n.left) - height(n.right) : 0; }
function updateHeight(n: AVLNode): void { n.height = 1 + Math.max(height(n.left), height(n.right)); }

// ─── Step system ──────────────────────────────────────────────────────────────

type StepKind =
    | 'TRAVERSE'      // visiting node during insert descent
    | 'INSERT_NODE'   // newly placed leaf
    | 'BALANCE_CHECK' // checking balance factor at a node
    | 'ROTATE_RIGHT'  // right rotation pivot
    | 'ROTATE_LEFT'   // left rotation pivot
    | 'DONE';         // final state

interface AVLStep {
    kind: StepKind;
    nodeId: number;         // primary node
    secondId?: number;      // secondary node (e.g. child being rotated)
    label?: string;         // text annotation for the info strip
    rootSnapshot: AVLNode | null; // deep-clone of tree root after this step
    keyIdx?: number;        // which key (0-based) in the preset sequence this step belongs to
}

let _nodeIdCounter = 0;
function newNode(key: number): AVLNode {
    return { id: _nodeIdCounter++, key, left: null, right: null, height: 1 };
}

function cloneTree(n: AVLNode | null): AVLNode | null {
    if (!n) return null;
    return { ...n, left: cloneTree(n.left), right: cloneTree(n.right) };
}

// ─── Rotation helpers (mutate and record steps) ───────────────────────────────

function rotateRight(y: AVLNode, steps: AVLStep[]): AVLNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    updateHeight(y);
    updateHeight(x);
    steps.push({
        kind: 'ROTATE_RIGHT', nodeId: y.id, secondId: x.id,
        label: `Right-rotate: ${y.key} ↓  ${x.key} ↑`, rootSnapshot: null
    });
    return x;
}

function rotateLeft(x: AVLNode, steps: AVLStep[]): AVLNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    updateHeight(x);
    updateHeight(y);
    steps.push({
        kind: 'ROTATE_LEFT', nodeId: x.id, secondId: y.id,
        label: `Left-rotate: ${x.key} ↓  ${y.key} ↑`, rootSnapshot: null
    });
    return y;
}

function insertRec(
    node: AVLNode | null,
    key: number,
    steps: AVLStep[],
): AVLNode {
    // Base: insert new leaf
    if (!node) {
        const n = newNode(key);
        steps.push({ kind: 'INSERT_NODE', nodeId: n.id, label: `Insert ${key}`, rootSnapshot: null });
        return n;
    }

    // Traverse
    steps.push({ kind: 'TRAVERSE', nodeId: node.id, label: `Compare ${key} with ${node.key}`, rootSnapshot: null });

    if (key < node.key)
        node.left = insertRec(node.left, key, steps);
    else if (key > node.key)
        node.right = insertRec(node.right, key, steps);
    else
        return node; // duplicate — ignore

    updateHeight(node);

    const balance = bf(node);
    steps.push({
        kind: 'BALANCE_CHECK', nodeId: node.id,
        label: `Balance factor at ${node.key}: ${balance >= 0 ? '+' : ''}${balance}`, rootSnapshot: null
    });

    // LL
    if (balance > 1 && node.left && key < node.left.key)
        return rotateRight(node, steps);
    // RR
    if (balance < -1 && node.right && key > node.right.key)
        return rotateLeft(node, steps);
    // LR
    if (balance > 1 && node.left && key > node.left.key) {
        node.left = rotateLeft(node.left, steps);
        return rotateRight(node, steps);
    }
    // RL
    if (balance < -1 && node.right && key < node.right.key) {
        node.right = rotateRight(node.right, steps);
        return rotateLeft(node, steps);
    }

    return node;
}

function buildSteps(keys: number[]): { steps: AVLStep[]; finalRoot: AVLNode | null } {
    _nodeIdCounter = 0;
    let root: AVLNode | null = null;
    const steps: AVLStep[] = [];

    for (let ki = 0; ki < keys.length; ki++) {
        const k = keys[ki];
        const startIdx = steps.length;
        root = insertRec(root, k, steps);
        // Stamp snapshots and tag each step with the key index
        const snap = cloneTree(root);
        for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].rootSnapshot !== null) break;
            steps[i].rootSnapshot = snap;
        }
        for (let i = startIdx; i < steps.length; i++) {
            steps[i].keyIdx = ki;
        }
    }

    steps.push({ kind: 'DONE', nodeId: -1, label: 'Tree balanced', rootSnapshot: cloneTree(root), keyIdx: keys.length });
    return { steps, finalRoot: root };
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

interface LayoutNode { x: number; y: number; node: AVLNode }

function computeLayout(
    root: AVLNode | null,
    cw: number,
    ch: number,
): Map<number, LayoutNode> {
    const map = new Map<number, LayoutNode>();
    if (!root) return map;

    // Simple recursive: x = column index from in-order traversal, y = depth
    let col = 0;
    function assign(n: AVLNode | null, depth: number): void {
        if (!n) return;
        assign(n.left, depth + 1);
        map.set(n.id, { x: col, y: depth, node: n });
        col++;
        assign(n.right, depth + 1);
    }
    assign(root, 0);

    const totalNodes = col;
    const treeHeight = Math.max(...[...map.values()].map(v => v.y)) + 1;

    const PAD_X = 80, PAD_Y = 90;
    const usableW = cw - PAD_X * 2;
    const usableH = ch - PAD_Y * 2;
    const stepX = totalNodes > 1 ? usableW / (totalNodes - 1) : 0;
    const stepY = treeHeight > 1 ? usableH / (treeHeight - 1) : 0;

    for (const [id, v] of map) {
        map.set(id, {
            ...v,
            x: PAD_X + v.x * stepX,
            y: PAD_Y + v.y * stepY,
        });
    }
    return map;
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────

const NODE_R = 16;

function renderTree(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    root: AVLNode | null,
    step: AVLStep | null,
) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cw, ch);

    if (!root) return;

    const layout = computeLayout(root, cw, ch);

    // Draw edges first (under nodes)
    function drawEdges(n: AVLNode | null) {
        if (!n) return;
        const from = layout.get(n.id);
        if (!from) return;
        for (const child of [n.left, n.right]) {
            if (!child) continue;
            const to = layout.get(child.id);
            if (!to) continue;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = EDGE_COL;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        drawEdges(n.left);
        drawEdges(n.right);
    }
    drawEdges(root);

    // Draw nodes
    function drawNode(n: AVLNode | null) {
        if (!n) return;
        const pos = layout.get(n.id);
        if (!pos) return;

        // Determine highlight
        let fillCol = NODE_BG;
        let strokeCol = NODE_BORDER;
        let textCol = '#cccccc';

        if (step) {
            if (step.kind === 'INSERT_NODE' && step.nodeId === n.id) {
                fillCol = '#1a2e10'; strokeCol = GREEN; textCol = GREEN;
            } else if ((step.kind === 'ROTATE_LEFT' || step.kind === 'ROTATE_RIGHT') && step.nodeId === n.id) {
                fillCol = '#2a1020'; strokeCol = VIOLET; textCol = VIOLET;
            } else if ((step.kind === 'ROTATE_LEFT' || step.kind === 'ROTATE_RIGHT') && step.secondId === n.id) {
                fillCol = '#1a1030'; strokeCol = RED; textCol = RED;
            } else if (step.kind === 'BALANCE_CHECK' && step.nodeId === n.id) {
                fillCol = '#1e1a00'; strokeCol = GOLD; textCol = GOLD;
            } else if (step.kind === 'TRAVERSE' && step.nodeId === n.id) {
                fillCol = '#0e1630'; strokeCol = BLUE; textCol = '#8ab4e8';
            } else if (step.kind === 'DONE') {
                fillCol = '#0e1e0a'; strokeCol = SOFT_GREEN; textCol = SOFT_GREEN;
            }
        }

        // Shadow
        ctx.shadowColor = strokeCol + '60';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = fillCol;
        ctx.fill();
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Balance factor tag
        const balance = bf(n);
        const bfStr = balance > 0 ? `+${balance}` : String(balance);
        ctx.fillStyle = Math.abs(balance) > 1 ? RED : '#555';
        ctx.font = `10px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(bfStr, pos.x + NODE_R - 4, pos.y - NODE_R + 2);

        // Key label
        ctx.fillStyle = textCol;
        ctx.font = `bold 13px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n.key), pos.x, pos.y);

        drawNode(n.left);
        drawNode(n.right);
    }
    drawNode(root);
}

// ─── Preset sequences ─────────────────────────────────────────────────────────

const PRESETS: { label: string; desc: string; keys: number[] }[] = [
    {
        label: 'Classic Rotations',
        desc: '10 values chosen to trigger all four rotation types (LL, RR, LR, RL).',
        keys: [30, 20, 40, 10, 25, 35, 50, 5, 15, 28],
    },
    {
        label: 'Ascending Insert',
        desc: 'Insert 1–12 in order — triggers maximum RR rotations without rebalancing pauses.',
        keys: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    {
        label: 'Balanced Build',
        desc: 'Insertions that produce a perfectly balanced tree with minimal rotations.',
        keys: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15],
    },
    {
        label: 'Zigzag Pattern',
        desc: 'Alternating low/high values — exercises LR and RL rotations heavily.',
        keys: [50, 10, 90, 5, 30, 70, 95, 20, 40, 60, 80],
    },
];

const SPEED_STEPS = [0.5, 1, 2, 4];
const SPEED_MARKS = SPEED_STEPS.map((v, i) => ({ value: i, label: `${v}×` }));
const RUN_LABEL: Record<string, string> = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Done' };

// ─── Main component ───────────────────────────────────────────────────────────

interface AVLVisualizerProps {
    presetIdx: number;
    onBack: () => void;
}

export default function AVLVisualizer({ presetIdx, onBack }: AVLVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stepsRef = useRef<AVLStep[]>([]);
    const stepIdxRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const accumRef = useRef(0);
    const lastTickRef = useRef(0);
    const speedRef = useRef(1);

    const [runState, setRunState] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
    const [stepCur, setStepCur] = useState(0);
    const [stepTotal, setStepTotal] = useState(1);
    const [speedIdx, setSpeedIdx] = useState(1);
    const [currentLabel, setCurrentLabel] = useState('');
    const [currentKind, setCurrentKind] = useState<StepKind | ''>('');
    const [activeKeyIdx, setActiveKeyIdx] = useState(-1);

    // Build steps when preset changes
    useEffect(() => {
        const preset = PRESETS[presetIdx];
        const { steps } = buildSteps(preset.keys);
        stepsRef.current = steps;
        stepIdxRef.current = 0;
        accumRef.current = 0;
        setRunState('idle');
        setStepCur(0);
        setStepTotal(steps.length);
        setCurrentLabel('');
        setCurrentKind('');
        setActiveKeyIdx(-1);

        // Draw initial (empty) tree
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) renderTree(ctx, canvas.width, canvas.height, null, null);
        }
    }, [presetIdx]);

    // Draw the current step
    const drawStep = useCallback((idx: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const steps = stepsRef.current;
        if (idx < 0 || idx >= steps.length) return;
        const step = steps[idx];
        renderTree(ctx, canvas.width, canvas.height, step.rootSnapshot, step);
        setCurrentLabel(step.label ?? '');
        setCurrentKind(step.kind);
        setActiveKeyIdx(step.keyIdx ?? -1);
    }, []);

    // Animation loop
    const startLoop = useCallback(() => {
        lastTickRef.current = performance.now();

        function loop(now: number) {
            const dt = Math.min((now - lastTickRef.current) * 0.001, 0.1);
            lastTickRef.current = now;

            const baseSps = 4 * speedRef.current; // steps per second at 1×
            accumRef.current += dt * baseSps;
            const advance = Math.floor(accumRef.current);
            accumRef.current -= advance;

            for (let i = 0; i < advance; i++) {
                if (stepIdxRef.current >= stepsRef.current.length - 1) {
                    stepIdxRef.current = stepsRef.current.length - 1;
                    drawStep(stepIdxRef.current);
                    setStepCur(stepIdxRef.current);
                    setRunState('done');
                    return;
                }
                stepIdxRef.current++;
            }
            drawStep(stepIdxRef.current);
            setStepCur(stepIdxRef.current);
            rafRef.current = requestAnimationFrame(loop);
        }

        rafRef.current = requestAnimationFrame(loop);
    }, [drawStep]);

    const stopLoop = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    // Controls
    const handlePlayPause = useCallback(() => {
        setRunState(prev => {
            if (prev === 'running') {
                stopLoop();
                return 'paused';
            }
            if (prev === 'idle' || prev === 'paused') {
                startLoop();
                return 'running';
            }
            return prev;
        });
    }, [startLoop, stopLoop]);

    const handleStep = useCallback(() => {
        if (runState === 'running') return;
        if (stepIdxRef.current >= stepsRef.current.length - 1) return;
        stepIdxRef.current++;
        drawStep(stepIdxRef.current);
        setStepCur(stepIdxRef.current);
        if (stepIdxRef.current >= stepsRef.current.length - 1)
            setRunState('done');
    }, [runState, drawStep]);

    const handleReset = useCallback(() => {
        stopLoop();
        stepIdxRef.current = 0;
        accumRef.current = 0;
        setRunState('idle');
        setStepCur(0);
        setCurrentLabel('');
        setCurrentKind('');
        setActiveKeyIdx(-1);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) renderTree(ctx, canvas.width, canvas.height, null, null);
        }
    }, [stopLoop]);

    const handleSpeedChange = useCallback((_: unknown, v: unknown) => {
        const s = SPEED_STEPS[v as number];
        speedRef.current = s;
        setSpeedIdx(v as number);
    }, []);

    // Cleanup on unmount
    useEffect(() => () => stopLoop(), [stopLoop]);

    const isRunning = runState === 'running';
    const canPlayPause = runState !== 'done';
    const canStep = !isRunning && runState !== 'done';
    const progress = (stepCur / Math.max(stepTotal - 1, 1)) * 100;

    const kindColors: Record<string, string> = {
        TRAVERSE: BLUE,
        INSERT_NODE: GREEN,
        BALANCE_CHECK: GOLD,
        ROTATE_LEFT: VIOLET,
        ROTATE_RIGHT: VIOLET,
        DONE: SOFT_GREEN,
    };
    const labelColor = currentKind ? (kindColors[currentKind] ?? '#aaa') : '#aaa';

    const preset = PRESETS[presetIdx];

    return (
        <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 }, py: 2, boxSizing: 'border-box' }}>

            {/* Canvas + key panel row */}
            <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', gap: 2, alignItems: 'flex-start' }}>

                {/* Canvas */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ position: 'relative', aspectRatio: '960/720' }}>
                    <canvas
                        ref={canvasRef}
                        width={960}
                        height={720}
                        style={{ display: 'block', width: '100%', height: '100%' }}
                    />

                    {/* Info strip */}
                    <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        px: 3, py: 1,
                        display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                        bgcolor: '#0d0d20',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>
                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#e8e8e8', flex: 1 }}>
                            AVL Tree
                        </Typography>
                        <Chip
                            label="O(log n) insert"
                            size="small"
                            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem', bgcolor: '#1e1a00', color: GOLD, height: 26 }}
                        />
                        <Chip
                            label="Space O(n)"
                            size="small"
                            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem', bgcolor: '#141420', color: '#888', height: 26 }}
                        />
                        {currentLabel && (
                            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.82rem', color: labelColor }}>
                                {currentLabel}
                            </Typography>
                        )}
                    </Box>

                    {/* Progress bar */}
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            position: 'absolute', top: 46, left: 0, right: 0, height: 4,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            '& .MuiLinearProgress-bar': { bgcolor: runState === 'done' ? GREEN : GOLD },
                        }}
                    />
                </Box>
                </Box>{/* end canvas flex child */}

                {/* Key sequence panel */}
                <Box sx={{
                    width: 148,
                    flexShrink: 0,
                    bgcolor: '#0a0a18',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.6,
                    overflowY: 'auto',
                    maxHeight: 480,
                }}>
                    <Typography sx={{
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.68rem',
                        color: '#555',
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}>
                        Key Sequence
                    </Typography>
                    {preset.keys.map((k, i) => {
                        const isDone = runState === 'done' || i < activeKeyIdx;
                        const isActive = runState !== 'done' && i === activeKeyIdx;
                        return (
                            <Box key={i} sx={{
                                px: 1.25, py: 0.4,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: isDone ? '#0e1e0a' : isActive ? `${GOLD}14` : '#141428',
                                border: `1px solid ${isDone ? GREEN + '35' : isActive ? GOLD + '55' : 'rgba(255,255,255,0.05)'}`,
                                transition: 'background 0.2s, border-color 0.2s',
                            }}>
                                <Typography sx={{
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.85rem',
                                    color: isDone ? GREEN : isActive ? GOLD : '#3a3a5a',
                                    fontWeight: isActive ? 700 : 400,
                                }}>
                                    {k}
                                </Typography>
                                {isDone && (
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', color: GREEN }}>✓</Typography>
                                )}
                                {isActive && (
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', color: GOLD }}>→</Typography>
                                )}
                            </Box>
                        );
                    })}
                </Box>

            </Box>{/* end canvas + panel row */}

            {/* Controls */}
            <Box sx={{
                maxWidth: 1100, mx: 'auto', px: 3, py: 2, mt: 2,
                bgcolor: '#0e0e1e',
                borderTop: `1px solid ${GOLD}22`,
                display: 'flex', flexDirection: 'column', gap: 2,
            }}>

                {/* Stats row */}
                <Box sx={{ display: 'flex', gap: 3.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatPill label="Keys" value={PRESETS[presetIdx].keys.length} />
                    <StatPill label="Step" value={`${stepCur} / ${stepTotal - 1}`} />
                    <Box sx={{ ml: 'auto' }}>
                        <RunChip state={runState} />
                    </Box>
                </Box>

                {/* Playback row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <IconButton size="medium" onClick={handleReset} title="Reset" sx={ctrlBtn}>
                        <ReplayIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                    <IconButton
                        size="medium" onClick={handleStep}
                        disabled={!canStep}
                        title="Advance one step"
                        sx={ctrlBtn}
                    >
                        <SkipNextIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                    <IconButton
                        size="medium" onClick={handlePlayPause}
                        disabled={!canPlayPause}
                        title={isRunning ? 'Pause' : 'Play'}
                        sx={{ ...ctrlBtn, bgcolor: `${GOLD}18`, '&:hover': { bgcolor: `${GOLD}30`, color: GOLD } }}
                    >
                        {isRunning ? <PauseIcon sx={{ fontSize: 22 }} /> : <PlayArrowIcon sx={{ fontSize: 22 }} />}
                    </IconButton>

                    <Box sx={{ flex: 1 }} />

                    {/* Speed */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mr: 2 }}>
                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.72rem', color: '#555', mb: 0.25 }}>
                            Speed
                        </Typography>
                        <Box sx={{ width: 200 }}>
                            <Slider
                                value={speedIdx}
                                min={0} max={3} step={1}
                                marks={SPEED_MARKS}
                                onChange={handleSpeedChange}
                                sx={{
                                    color: GOLD,
                                    '& .MuiSlider-markLabel': { fontFamily: FONTS.NECTO_MONO, fontSize: '0.72rem', color: '#555' },
                                    '& .MuiSlider-thumb': { bgcolor: GOLD },
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {AVL_LEGEND.map(({ color, label }) => (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Box sx={{ width: 12, height: 12, bgcolor: color, borderRadius: '3px', flexShrink: 0 }} />
                                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: '#666' }}>
                                    {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 0.25 }}>
                    <BackBtn onClick={onBack} />
                </Box>
            </Box>
        </Box>
    );
}

// ─── Sub-components (scoped to AVL) ──────────────────────────────────────────

const AVL_LEGEND = [
    { color: BLUE, label: 'Traverse' },
    { color: GREEN, label: 'Insert' },
    { color: GOLD, label: 'Balance check' },
    { color: VIOLET, label: 'Rotation' },
    { color: SOFT_GREEN, label: 'Done' },
];

const ctrlBtn = {
    color: '#888',
    '&:hover': { color: '#ddd', bgcolor: 'rgba(255,255,255,0.06)' },
    '&.Mui-disabled': { color: '#333' },
};

function StatPill({ label, value }: { label: string; value: string | number }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1 }}>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.62rem', color: '#555', lineHeight: 1 }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#ddd', lineHeight: 1.2 }}>
                {value}
            </Typography>
        </Box>
    );
}

function RunChip({ state }: { state: string }) {
    const running = state === 'running';
    const paused = state === 'paused';
    const done = state === 'done';
    const bg = running ? '#1a2800' : paused ? '#2a1e00' : done ? '#0e1e0a' : '#141428';
    const text = running ? GREEN : paused ? GOLD : done ? SOFT_GREEN : '#777';
    const bdr = running ? GREEN : paused ? GOLD : done ? SOFT_GREEN : 'rgba(255,255,255,0.1)';
    return (
        <Chip
            label={RUN_LABEL[state] ?? 'Ready'}
            size="small"
            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem', bgcolor: bg, color: text, border: `1px solid ${bdr}50` }}
        />
    );
}

function BackBtn({ onClick }: { onClick: () => void }) {
    return (
        <Box component="button" onClick={onClick} sx={{
            px: 2, py: 0.75,
            bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 1, color: '#666',
            fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.25)' },
        }}>← Reconfigure</Box>
    );
}

// ─── Preset picker (used by AlgoVizPage wizard step 4 for tree category) ──────

export const AVL_PRESETS = PRESETS;
