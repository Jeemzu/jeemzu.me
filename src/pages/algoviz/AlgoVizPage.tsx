// Algorithm Visualizer — dedicated full page
// Flow: wizard (4 steps) → loading → viz  [+ optional side-by-side comparison]

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
    Box, Typography, Chip, Slider,
    CircularProgress, LinearProgress, IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FONTS } from '../../lib/globals';
import AVLVisualizer, { AVL_PRESETS } from './AVLVisualizer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'wizard' | 'loading' | 'viz';
type ComparePhase = 'idle' | 'configuring' | 'loading2' | 'active';
type Category = 'sort' | 'search' | 'graph' | 'tree';

interface AlgoInfo {
    id: number;
    name: string;
    complexity: string;
    spaceComplexity: string;
    description: string;
}

interface WasmModule {
    cwrap: (name: string, ret: string | null, args: string[]) => (...args: unknown[]) => unknown;
}

type WasmFactory = (opts: { canvas: HTMLCanvasElement }) => Promise<WasmModule>;

// ─── Static data ──────────────────────────────────────────────────────────────

const GRAPH_ALGOS: AlgoInfo[] = [
    { id: 20, name: 'A* Pathfinding', complexity: 'O(E log V)', spaceComplexity: 'O(V)', description: 'Uses a heuristic (octile distance) to guide the frontier toward the goal, exploring far fewer nodes than Dijkstra on grid maps.' },
];

const TREE_ALGOS: AlgoInfo[] = [
    { id: 30, name: 'AVL Tree', complexity: 'O(log n)', spaceComplexity: 'O(n)', description: 'Self-balancing BST that maintains a height difference ≤ 1 between subtrees via LL, RR, LR, and RL rotations after every insert.' },
];

const SORT_ALGOS: AlgoInfo[] = [
    { id: 0, name: 'Bubble Sort', complexity: 'O(n²)', spaceComplexity: 'O(1)', description: 'Repeatedly compares adjacent pairs and swaps them if out of order. Simple but slow for large inputs.' },
    { id: 1, name: 'Selection Sort', complexity: 'O(n²)', spaceComplexity: 'O(1)', description: 'Finds the minimum element and places it at the start, then repeats for the remaining unsorted slice.' },
    { id: 2, name: 'Insertion Sort', complexity: 'O(n²)', spaceComplexity: 'O(1)', description: 'Builds a sorted prefix one element at a time, shifting larger elements right to make room.' },
    { id: 3, name: 'Merge Sort', complexity: 'O(n log n)', spaceComplexity: 'O(n)', description: 'Divide and conquer — recursively splits the array in half, then merges sorted halves together.' },
    { id: 4, name: 'Quick Sort', complexity: 'O(n log n)', spaceComplexity: 'O(log n)', description: 'Picks a pivot element, partitions the array around it, then recursively sorts each partition.' },
    { id: 5, name: 'Heap Sort', complexity: 'O(n log n)', spaceComplexity: 'O(1)', description: 'Builds a max-heap then repeatedly extracts the maximum element into its final sorted position.' },
];

const SEARCH_ALGOS: AlgoInfo[] = [
    { id: 10, name: 'Linear Search', complexity: 'O(n)', spaceComplexity: 'O(1)', description: 'Checks every element sequentially. Works on unsorted arrays — examines up to n elements.' },
    { id: 11, name: 'Binary Search', complexity: 'O(log n)', spaceComplexity: 'O(1)', description: 'Requires a sorted array. Halves the search window each step — extremely fast for large inputs.' },
    { id: 12, name: 'Jump Search', complexity: 'O(√n)', spaceComplexity: 'O(1)', description: 'Requires a sorted array. Jumps √n steps ahead to find a block, then scans it linearly.' },
];

const SIZE_VALUES = [8, 16, 32, 64, 128];
const SIZE_LABELS = ['Very Small', 'Small', 'Medium', 'Large', 'Very Large'];
const SIZE_MARKS = SIZE_VALUES.map((v, i) => ({ value: i, label: String(v) }));

// Grid [rows, cols] matching C++ GRID_ROWS/GRID_COLS constants
const GRID_SIZES: [number, number][] = [[10, 16], [14, 22], [18, 28], [24, 38], [30, 48]];

const SPEED_STEPS = [0.25, 1, 4, 16];
const SPEED_MARKS = SPEED_STEPS.map((v, i) => ({ value: i, label: v === 0.25 ? '¼×' : `${v}×` }));

const LEGEND = [
    { color: '#3a6ea0', label: 'Default' },
    { color: '#ffd740', label: 'Compare' },
    { color: '#d73737', label: 'Move' },
    { color: '#be50dc', label: 'Pivot' },
    { color: '#a8d67e', label: 'Sorted' },
    { color: '#c5e8a4', label: 'Found' },
];

const GOLD = '#ffd740';
const GREEN = '#a8d67e';
const SOFT_GREEN = '#c5e8a4';

const RUN_LABEL: Record<number, string> = { 0: 'Ready', 1: 'Running', 2: 'Paused', 3: 'Done' };

function uniqCpx(algos: AlgoInfo[]) { return [...new Set(algos.map(a => a.complexity))]; }

// ─── Module-level WASM script loader ─────────────────────────────────────────
// Shared so both module instances load from the same script tag.

let _scriptPromise: Promise<void> | null = null;

function ensureAlgovizScript(): Promise<void> {
    if ((window as unknown as Record<string, unknown>)['algovizModule']) return Promise.resolve();
    if (_scriptPromise) return _scriptPromise;
    _scriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/wasm/algoviz.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { _scriptPromise = null; reject(new Error('Could not load /wasm/algoviz.js — run npm run build:all.')); };
        document.body.appendChild(s);
    });
    return _scriptPromise;
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function AlgoVizPage() {
    const [, navigate] = useLocation();

    // ── Primary wizard ────────────────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>('wizard');
    const [wizStep, setWizStep] = useState(1);
    const [category, setCategory] = useState<Category | null>(null);
    const [cpxFilter, setCpxFilter] = useState<string | null>(null);
    const [selAlgo, setSelAlgo] = useState<AlgoInfo | null>(null);
    const [sizeIdx, setSizeIdx] = useState(2);
    // AVL preset index (tree category)
    const [avlPresetIdx, setAvlPresetIdx] = useState(0);
    // Grid dimensions (populated from WASM after configure for graph category)
    const [gridRows, setGridRows] = useState(0);
    const [gridCols, setGridCols] = useState(0);

    // ── Primary WASM ──────────────────────────────────────────────────────
    const canvas1Ref = useRef<HTMLCanvasElement>(null);
    const poll1Ref = useRef<number | null>(null);
    const ctrl1Ref = useRef<Record<string, (...a: unknown[]) => unknown> | null>(null);

    // ── Primary viz state ─────────────────────────────────────────────────
    const [runState, setRunState] = useState(0);
    const [comparisons, setComparisons] = useState(0);
    const [moves, setMoves] = useState(0);
    const [stepCur, setStepCur] = useState(0);
    const [stepTotal, setStepTotal] = useState(1);
    const [target, setTarget] = useState(-1);

    // ── Comparison state ──────────────────────────────────────────────────
    const [cmpPhase, setCmpPhase] = useState<ComparePhase>('idle');
    const [cmpCpxFilter, setCmpCpxFilter] = useState<string | null>(null);
    const [cmpSelAlgo, setCmpSelAlgo] = useState<AlgoInfo | null>(null);

    // ── Second WASM ───────────────────────────────────────────────────────
    const canvas2Ref = useRef<HTMLCanvasElement>(null);
    const poll2Ref = useRef<number | null>(null);
    const ctrl2Ref = useRef<Record<string, (...a: unknown[]) => unknown> | null>(null);

    // ── Second viz state ──────────────────────────────────────────────────
    const [runState2, setRunState2] = useState(0);
    const [comparisons2, setComparisons2] = useState(0);
    const [moves2, setMoves2] = useState(0);
    const [stepCur2, setStepCur2] = useState(0);
    const [stepTotal2, setStepTotal2] = useState(1);
    const [target2, setTarget2] = useState(-1);

    // ── Shared ────────────────────────────────────────────────────────────
    const [speedVal, setSpeedVal] = useState(1);
    const [error, setError] = useState<string | null>(null);

    // Stable refs for async closures
    const selAlgoRef = useRef(selAlgo);
    const sizeIdxRef = useRef(sizeIdx);
    const cmpAlgoRef = useRef(cmpSelAlgo);
    const speedRef = useRef(speedVal);
    useEffect(() => { selAlgoRef.current = selAlgo; }, [selAlgo]);
    useEffect(() => { sizeIdxRef.current = sizeIdx; }, [sizeIdx]);
    useEffect(() => { cmpAlgoRef.current = cmpSelAlgo; }, [cmpSelAlgo]);
    useEffect(() => { speedRef.current = speedVal; }, [speedVal]);

    // ── Cleanup on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (poll1Ref.current) clearInterval(poll1Ref.current);
            if (poll2Ref.current) clearInterval(poll2Ref.current);
        };
    }, []);

    // ── PRIMARY: init when phase = 'loading' ──────────────────────────────
    useEffect(() => {
        if (phase !== 'loading') return;

        // Tree category: no WASM — jump straight to viz (AVLVisualizer handles itself)
        if (category === 'tree') {
            setPhase('viz');
            return;
        }

        const algo = selAlgoRef.current;
        const size = sizeIdxRef.current;
        if (!algo) { setError('No algorithm selected.'); setPhase('wizard'); return; }

        const frameId = requestAnimationFrame(async () => {
            if (!canvas1Ref.current) { setError('Canvas not ready — try again.'); setPhase('wizard'); return; }
            const canvas = canvas1Ref.current;
            try {
                await ensureAlgovizScript();
                const factory = (window as unknown as Record<string, unknown>)['algovizModule'] as WasmFactory;
                const mod = await factory({ canvas });

                const bind = (n: string, r: string | null, a: string[]) =>
                    mod.cwrap(n, r, a) as (...x: unknown[]) => unknown;

                const configure = bind('viz_configure', null, ['number', 'number']);
                const getState = bind('viz_get_state', 'number', []);
                const getComps = bind('viz_get_comparisons', 'number', []);
                const getMoves = bind('viz_get_moves', 'number', []);
                const getStep = bind('viz_get_step', 'number', []);
                const getTotal = bind('viz_get_total_steps', 'number', []);
                const getTarget = bind('viz_get_target', 'number', []);

                const getGridRows = bind('viz_get_grid_rows', 'number', []);
                const getGridCols = bind('viz_get_grid_cols', 'number', []);

                ctrl1Ref.current = {
                    start: bind('viz_start', null, []),
                    pause: bind('viz_pause', null, []),
                    resume: bind('viz_resume', null, []),
                    stepOnce: bind('viz_step_once', null, []),
                    reset: bind('viz_reset', null, []),
                    setSpeed: bind('viz_set_speed', null, ['number']),
                };

                configure(algo.id, size);
                setTarget(getTarget() as number);
                setStepTotal((getTotal() as number) || 1);
                setGridRows(getGridRows() as number);
                setGridCols(getGridCols() as number);
                (ctrl1Ref.current.start as () => void)();

                poll1Ref.current = window.setInterval(() => {
                    setRunState(getState() as number);
                    setComparisons(getComps() as number);
                    setMoves(getMoves() as number);
                    setStepCur(getStep() as number);
                }, 100);

                setPhase('viz');
            } catch (err) {
                setError(String(err));
                setPhase('wizard');
            }
        });

        return () => cancelAnimationFrame(frameId);
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── SECONDARY: init when cmpPhase = 'loading2' ───────────────────────
    useEffect(() => {
        if (cmpPhase !== 'loading2') return;

        const algo = cmpAlgoRef.current;
        const size = sizeIdxRef.current;
        if (!algo) { setCmpPhase('configuring'); return; }

        const frameId = requestAnimationFrame(async () => {
            if (!canvas2Ref.current) { setCmpPhase('configuring'); return; }
            const canvas = canvas2Ref.current;
            try {
                await ensureAlgovizScript();
                const factory = (window as unknown as Record<string, unknown>)['algovizModule'] as WasmFactory;
                const mod = await factory({ canvas });

                const bind = (n: string, r: string | null, a: string[]) =>
                    mod.cwrap(n, r, a) as (...x: unknown[]) => unknown;

                const configure = bind('viz_configure', null, ['number', 'number']);
                const getState = bind('viz_get_state', 'number', []);
                const getComps = bind('viz_get_comparisons', 'number', []);
                const getMoves = bind('viz_get_moves', 'number', []);
                const getStep = bind('viz_get_step', 'number', []);
                const getTotal = bind('viz_get_total_steps', 'number', []);
                const getTarget = bind('viz_get_target', 'number', []);

                ctrl2Ref.current = {
                    start: bind('viz_start', null, []),
                    pause: bind('viz_pause', null, []),
                    resume: bind('viz_resume', null, []),
                    stepOnce: bind('viz_step_once', null, []),
                    reset: bind('viz_reset', null, []),
                    setSpeed: bind('viz_set_speed', null, ['number']),
                };

                configure(algo.id, size);
                setTarget2(getTarget() as number);
                setStepTotal2((getTotal() as number) || 1);

                // Reset & restart primary so both run from the same starting point
                (ctrl1Ref.current?.reset as (() => void) | undefined)?.();
                (ctrl1Ref.current?.setSpeed as ((s: number) => void) | undefined)?.(speedRef.current);
                setRunState(0); setComparisons(0); setMoves(0); setStepCur(0);

                (ctrl2Ref.current.setSpeed as (s: number) => void)(speedRef.current);
                (ctrl1Ref.current?.start as (() => void) | undefined)?.();
                (ctrl2Ref.current.start as () => void)();

                poll2Ref.current = window.setInterval(() => {
                    setRunState2(getState() as number);
                    setComparisons2(getComps() as number);
                    setMoves2(getMoves() as number);
                    setStepCur2(getStep() as number);
                }, 100);

                setCmpPhase('active');
            } catch (err) {
                setError(String(err));
                setCmpPhase('idle');
            }
        });

        return () => cancelAnimationFrame(frameId);
    }, [cmpPhase]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────

    const backToWizard = useCallback(() => {
        if (poll1Ref.current) { clearInterval(poll1Ref.current); poll1Ref.current = null; }
        if (poll2Ref.current) { clearInterval(poll2Ref.current); poll2Ref.current = null; }
        ctrl1Ref.current = null;
        ctrl2Ref.current = null;
        setPhase('wizard');
        setCmpPhase('idle'); setCmpSelAlgo(null); setCmpCpxFilter(null);
        setRunState(0); setComparisons(0); setMoves(0); setStepCur(0); setStepTotal(1);
        setRunState2(0); setComparisons2(0); setMoves2(0); setStepCur2(0); setStepTotal2(1);
        setSpeedVal(1); setError(null);
        setGridRows(0); setGridCols(0);
    }, []);

    const handleRemoveCompare = useCallback(() => {
        if (poll2Ref.current) { clearInterval(poll2Ref.current); poll2Ref.current = null; }
        ctrl2Ref.current = null;
        setCmpPhase('idle'); setCmpSelAlgo(null); setCmpCpxFilter(null);
        setRunState2(0); setComparisons2(0); setMoves2(0); setStepCur2(0); setStepTotal2(1);
    }, []);

    const handlePlayPause = useCallback(() => {
        const eitherRunning = runState === 1 || (cmpPhase === 'active' && runState2 === 1);
        if (eitherRunning) {
            (ctrl1Ref.current?.pause as (() => void) | undefined)?.();
            if (cmpPhase === 'active') (ctrl2Ref.current?.pause as (() => void) | undefined)?.();
        } else {
            if (runState === 0) (ctrl1Ref.current?.start as (() => void) | undefined)?.();
            else if (runState === 2) (ctrl1Ref.current?.resume as (() => void) | undefined)?.();
            if (cmpPhase === 'active') {
                if (runState2 === 0) (ctrl2Ref.current?.start as (() => void) | undefined)?.();
                else if (runState2 === 2) (ctrl2Ref.current?.resume as (() => void) | undefined)?.();
            }
        }
    }, [runState, runState2, cmpPhase]);

    const handleStepOnce = useCallback(() => {
        (ctrl1Ref.current?.stepOnce as (() => void) | undefined)?.();
        if (cmpPhase === 'active') (ctrl2Ref.current?.stepOnce as (() => void) | undefined)?.();
    }, [cmpPhase]);

    const handleReset = useCallback(() => {
        (ctrl1Ref.current?.reset as (() => void) | undefined)?.();
        setRunState(0); setComparisons(0); setMoves(0); setStepCur(0);
        if (cmpPhase === 'active') {
            (ctrl2Ref.current?.reset as (() => void) | undefined)?.();
            setRunState2(0); setComparisons2(0); setMoves2(0); setStepCur2(0);
        }
    }, [cmpPhase]);

    // ── Derived ───────────────────────────────────────────────────────────

    const algos = category === 'sort' ? SORT_ALGOS
        : category === 'search' ? SEARCH_ALGOS
            : category === 'graph' ? GRAPH_ALGOS
                : TREE_ALGOS;
    const filtered = cpxFilter ? algos.filter(a => a.complexity === cpxFilter) : algos;
    const progress1 = (stepCur / stepTotal) * 100;
    const progress2 = (stepCur2 / stepTotal2) * 100;
    const maxSizeN = SIZE_VALUES[sizeIdx];
    const isSearch = selAlgo && selAlgo.id >= 10;
    const tgtMissing = isSearch && target > maxSizeN;
    const tgt2Missing = isSearch && target2 > maxSizeN;
    const eitherRunning = runState === 1 || (cmpPhase === 'active' && runState2 === 1);
    const canPlayPause = cmpPhase === 'active'
        ? (runState === 0 || runState === 1 || runState === 2 || runState2 === 0 || runState2 === 1 || runState2 === 2)
        : (runState === 0 || runState === 1 || runState === 2);
    const canStep = cmpPhase === 'active'
        ? !((runState === 1 || runState2 === 1) || (runState === 3 && runState2 === 3))
        : !(runState === 1 || runState === 3);

    // ─────────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a19' }}>

            {/* ═══════════════════════════════════════════════════════════
                VIZ / LOADING PHASE
                ═══════════════════════════════════════════════════════ */}
            {phase !== 'wizard' && category === 'tree' && phase === 'viz' && (
                <AVLVisualizer presetIdx={avlPresetIdx} onBack={backToWizard} />
            )}

            {phase !== 'wizard' && category !== 'tree' && (
                <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 }, py: 2, boxSizing: 'border-box' }}>

                    {/* Canvas row */}
                    <Box sx={{
                        display: 'flex',
                        maxWidth: cmpPhase === 'active' ? 1600 : 1100,
                        mx: 'auto',
                        gap: cmpPhase === 'active' ? 2 : 0,
                        alignItems: 'flex-start',
                    }}>

                        {/* ── Primary canvas ── */}
                        <Box sx={
                            cmpPhase === 'active'
                                ? {
                                    flex: 1, position: 'relative', aspectRatio: '960/720', minWidth: 0,
                                    borderRadius: 2, overflow: 'hidden',
                                    boxShadow: `0 0 0 1px ${GOLD}30, 0 8px 32px rgba(0,0,0,0.5)`,
                                }
                                : { flex: 1, position: 'relative', aspectRatio: '960/720', minWidth: 0 }
                        }>
                            <canvas
                                ref={canvas1Ref}
                                width={960}
                                height={720}
                                style={{ display: 'block', width: '100%', height: '100%' }}
                            />

                            {/* Loading overlay */}
                            {phase === 'loading' && (
                                <Box sx={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    bgcolor: 'rgba(10,10,25,0.9)',
                                }}>
                                    <CircularProgress size={56} sx={{ color: GOLD, mb: 2 }} />
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: '#b0b0b0' }}>
                                        Generating {selAlgo?.name ?? 'algorithm'}…
                                    </Typography>
                                </Box>
                            )}

                            {/* Info strip */}
                            {phase === 'viz' && (
                                <Box sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0,
                                    px: 3, py: 1,
                                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                                    bgcolor: '#0d0d20',
                                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                                }}>
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#e8e8e8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selAlgo?.name}
                                        {cmpPhase === 'active' && <Box component="span" sx={{ color: GOLD, fontSize: '0.75rem', ml: 0.75 }}>(A)</Box>}
                                    </Typography>
                                    <InfoChip label={selAlgo?.complexity ?? ''} color={GOLD} bg="#1e1a00" />
                                    <InfoChip label={`Space ${selAlgo?.spaceComplexity ?? ''}`} color="#aaa" bg="#141420" />
                                    {isSearch && !tgtMissing && <InfoChip label={`Target: ${target}`} color={GREEN} bg="#121e10" />}
                                    {isSearch && tgtMissing && <InfoChip label={`Target: ${target} (absent)`} color="#d73737" bg="#1e1010" />}
                                    {category === 'graph' && gridRows > 0 && <InfoChip label={`Grid: ${gridRows}×${gridCols}`} color="#8ab4e8" bg="#0e1630" />}
                                </Box>
                            )}

                            {/* Progress */}
                            {phase === 'viz' && (
                                <LinearProgress
                                    variant="determinate"
                                    value={progress1}
                                    sx={{
                                        position: 'absolute', top: 46, left: 0, right: 0, height: 4,
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        '& .MuiLinearProgress-bar': { bgcolor: runState === 3 ? GREEN : GOLD },
                                    }}
                                />
                            )}
                        </Box>

                        {/* ── Secondary canvas (compare) ── */}
                        {(cmpPhase === 'loading2' || cmpPhase === 'active') && (
                            <Box sx={{
                                flex: 1, position: 'relative',
                                aspectRatio: '960/720', minWidth: 0,
                                borderRadius: 2, overflow: 'hidden',
                                boxShadow: `0 0 0 1px ${GREEN}30, 0 8px 32px rgba(0,0,0,0.5)`,
                            }}>
                                <canvas
                                    ref={canvas2Ref}
                                    width={960}
                                    height={720}
                                    style={{ display: 'block', width: '100%', height: '100%' }}
                                />

                                {cmpPhase === 'loading2' && (
                                    <Box sx={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        bgcolor: 'rgba(10,10,25,0.9)',
                                    }}>
                                        <CircularProgress size={48} sx={{ color: GREEN, mb: 2 }} />
                                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: '#b0b0b0' }}>
                                            Preparing comparison…
                                        </Typography>
                                    </Box>
                                )}

                                {cmpPhase === 'active' && (
                                    <>
                                        <Box sx={{
                                            position: 'absolute', top: 0, left: 0, right: 0,
                                            px: 3, py: 1,
                                            display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                                            bgcolor: '#0d0d20',
                                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                                        }}>
                                            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#e8e8e8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cmpSelAlgo?.name}
                                                <Box component="span" sx={{ color: GREEN, fontSize: '0.75rem', ml: 0.75 }}>(B)</Box>
                                            </Typography>
                                            <InfoChip label={cmpSelAlgo?.complexity ?? ''} color={GREEN} bg="#0e1e10" />
                                            <InfoChip label={`Space ${cmpSelAlgo?.spaceComplexity ?? ''}`} color="#aaa" bg="#141420" />
                                            {isSearch && !tgt2Missing && <InfoChip label={`Target: ${target2}`} color={GREEN} bg="#0e1e10" />}
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={progress2}
                                            sx={{
                                                position: 'absolute', top: 46, left: 0, right: 0, height: 4,
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                '& .MuiLinearProgress-bar': { bgcolor: runState2 === 3 ? SOFT_GREEN : GREEN },
                                            }}
                                        />
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* ── Controls bar ─────────────────────────────────── */}
                    {phase === 'viz' && (
                        <Box sx={{
                            maxWidth: cmpPhase === 'active' ? 1600 : 1100,
                            mx: 'auto', px: 3, py: 2,
                            mt: 2,
                            bgcolor: '#0e0e1e',
                            borderTop: `1px solid ${GOLD}22`,
                            display: 'flex', flexDirection: 'column', gap: 2,
                        }}>

                            {/* ─ Compare config panel ─ */}
                            {cmpPhase === 'configuring' && (
                                <ComparePicker
                                    algos={algos}
                                    primaryId={selAlgo?.id ?? -1}
                                    sizeN={SIZE_VALUES[sizeIdx]}
                                    cpxFilter={cmpCpxFilter}
                                    setCpxFilter={setCmpCpxFilter}
                                    selAlgo={cmpSelAlgo}
                                    setSelAlgo={setCmpSelAlgo}
                                    onConfirm={(algo) => {
                                        setCmpSelAlgo(algo);
                                        cmpAlgoRef.current = algo;
                                        setCmpPhase('loading2');
                                    }}
                                    onCancel={() => {
                                        setCmpPhase('idle');
                                        setCmpSelAlgo(null);
                                        setCmpCpxFilter(null);
                                    }}
                                />
                            )}

                            {/* ─ Loading compare spinner ─ */}
                            {cmpPhase === 'loading2' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                                    <CircularProgress size={20} sx={{ color: GREEN }} />
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.9rem', color: '#777' }}>
                                        Initializing comparison…
                                    </Typography>
                                </Box>
                            )}

                            {/* ─ Stats ─ */}
                            {(cmpPhase === 'idle' || cmpPhase === 'active') && (
                                cmpPhase === 'active' ? (
                                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {/* Primary stats */}
                                        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flex: 1, minWidth: 200 }}>
                                            <Box sx={{
                                                width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
                                                bgcolor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', color: '#000', fontWeight: 700 }}>A</Typography>
                                            </Box>
                                            <StatPill label={category === 'graph' ? 'Visited' : 'Comps'} value={comparisons} />
                                            <StatPill label={category === 'graph' ? 'Path Len' : 'Moves'} value={moves} />
                                            <StatPill label="Step" value={`${stepCur}/${stepTotal}`} />
                                            <RunChip state={runState} />
                                        </Box>

                                        <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />

                                        {/* Secondary stats */}
                                        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flex: 1, minWidth: 200 }}>
                                            <Box sx={{
                                                width: 18, height: 18, borderRadius: '4px', flexShrink: 0,
                                                bgcolor: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', color: '#000', fontWeight: 700 }}>B</Typography>
                                            </Box>
                                            <StatPill label="Comps" value={comparisons2} />
                                            <StatPill label="Moves" value={moves2} />
                                            <StatPill label="Step" value={`${stepCur2}/${stepTotal2}`} />
                                            <RunChip state={runState2} />
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 3.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <StatPill label={category === 'graph' ? 'Nodes Visited' : 'Comparisons'} value={comparisons} />
                                        <StatPill label={category === 'graph' ? 'Path Length' : 'Moves'} value={moves} />
                                        <StatPill label="Step" value={`${stepCur} / ${stepTotal}`} />
                                        <Box sx={{ ml: 'auto' }}>
                                            <RunChip state={runState} />
                                        </Box>
                                    </Box>
                                )
                            )}

                            {/* ─ Playback row ─ */}
                            {(cmpPhase === 'idle' || cmpPhase === 'active') && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    <IconButton size="medium" onClick={handleReset} title="Reset" sx={ctrlBtn}>
                                        <ReplayIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                    <IconButton
                                        size="medium" onClick={handleStepOnce}
                                        disabled={!canStep}
                                        title="Advance one step"
                                        sx={ctrlBtn}
                                    >
                                        <SkipNextIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                    <IconButton
                                        size="medium" onClick={handlePlayPause}
                                        disabled={!canPlayPause}
                                        title={eitherRunning ? 'Pause' : 'Resume'}
                                        sx={{ ...ctrlBtn, bgcolor: `${GOLD}18`, '&:hover': { bgcolor: `${GOLD}30`, color: GOLD } }}
                                    >
                                        {eitherRunning
                                            ? <PauseIcon sx={{ fontSize: 22 }} />
                                            : <PlayArrowIcon sx={{ fontSize: 22 }} />
                                        }
                                    </IconButton>

                                    <Box sx={{ flex: 1 }} />

                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mr: 2 }}>
                                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.72rem', color: '#555', mb: 0.25 }}>
                                            Speed
                                        </Typography>
                                        <Box sx={{ width: 240 }}>
                                            <Slider
                                                value={SPEED_STEPS.indexOf(speedVal)}
                                                min={0} max={3} step={1}
                                                marks={SPEED_MARKS}
                                                onChange={(_, idx) => {
                                                    const s = SPEED_STEPS[idx as number];
                                                    setSpeedVal(s);
                                                    (ctrl1Ref.current?.setSpeed as ((s: number) => void) | undefined)?.(s);
                                                    if (cmpPhase === 'active') (ctrl2Ref.current?.setSpeed as ((s: number) => void) | undefined)?.(s);
                                                }}
                                                sx={{
                                                    color: GOLD,
                                                    '& .MuiSlider-markLabel': { fontFamily: FONTS.NECTO_MONO, fontSize: '0.72rem', color: '#555' },
                                                    '& .MuiSlider-markLabel:first-child': { transform: 'translateX(0%)' },
                                                    '& .MuiSlider-markLabel:last-child': { transform: 'translateX(-100%)' },
                                                    '& .MuiSlider-thumb': { bgcolor: GOLD },
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {LEGEND.map(({ color, label }) => (
                                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                                <Box sx={{ width: 12, height: 12, bgcolor: color, borderRadius: '3px', flexShrink: 0 }} />
                                                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: '#666' }}>
                                                    {label}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* ─ Footer row: reconfigure + compare toggle ─ */}
                            {(cmpPhase === 'idle' || cmpPhase === 'active') && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 0.25 }}>
                                    <ActionBtn onClick={backToWizard} label="← Reconfigure" />

                                    {(category === 'sort' || category === 'search') && (
                                        cmpPhase === 'idle' ? (
                                            <ActionBtn
                                                onClick={() => setCmpPhase('configuring')}
                                                label="⊕ Add Comparison"
                                                color={GREEN}
                                                borderColor={`${GREEN}40`}
                                                hoverBg={`${GREEN}10`}
                                            />
                                        ) : (
                                            <ActionBtn
                                                onClick={handleRemoveCompare}
                                                label="✕ Remove Comparison"
                                                color="#d73737"
                                                borderColor="rgba(215,55,55,0.4)"
                                                hoverBg="rgba(215,55,55,0.08)"
                                            />
                                        )
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            {/* ═══════════════════════════════════════════════════════════
                WIZARD PHASE
                ═══════════════════════════════════════════════════════ */}
            {phase === 'wizard' && (
                <Box sx={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, px: { xs: 2, sm: 3 } }}>

                    {/* Hero card — centered, inner content left-aligned */}
                    <Box sx={{
                        width: '100%',
                        maxWidth: 680,
                        bgcolor: '#141428',
                        borderRadius: 2,
                        p: { xs: 3, md: 5 },
                        boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        {/* Page header */}
                        <Typography variant="h3" sx={{
                            fontFamily: FONTS.NECTO_MONO, color: GOLD,
                            mb: 1, textAlign: 'left',
                        }}>
                            Algorithm Visualizer
                        </Typography>
                        <Typography variant="h6" sx={{
                            fontFamily: FONTS.NECTO_MONO, fontWeight: 400,
                            color: '#666', mb: 4, textAlign: 'left',
                        }}>
                            Watch algorithms execute step by step — sorting, searching, graph pathfinding, and trees.
                        </Typography>

                        {/* Divider */}
                        <Box sx={{ height: '1px', bgcolor: 'rgba(255,255,255,0.06)', mb: 4 }} />

                        {error && (
                            <Typography sx={{
                                color: '#d73737', mb: 3,
                                fontSize: '0.95rem', fontFamily: FONTS.NECTO_MONO,
                                textAlign: 'left',
                            }}>
                                ⚠ {error}
                            </Typography>
                        )}

                        {/* Step 1: Category */}
                        {wizStep === 1 && (
                            <Box>
                                <WizHeader step={1} label="What do you want to visualize?" />
                                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                                    <CategoryCard
                                        emoji="📊" title="Sorting"
                                        desc="Arrange elements in ascending order. Bubble, Merge, Quick, Heap, and more."
                                        onSelect={() => { setCategory('sort'); setCpxFilter(null); setSelAlgo(null); setWizStep(2); }}
                                    />
                                    <CategoryCard
                                        emoji="🔍" title="Searching"
                                        desc="Locate a target value in an array. Linear, Binary, and Jump search."
                                        onSelect={() => { setCategory('search'); setCpxFilter(null); setSelAlgo(null); setWizStep(2); }}
                                    />
                                    <CategoryCard
                                        emoji="🗺️" title="Graph"
                                        desc="Pathfinding on a 2-D grid. A* uses a heuristic to find the shortest path efficiently."
                                        onSelect={() => { setCategory('graph'); setCpxFilter(null); setSelAlgo(null); setWizStep(2); }}
                                    />
                                    <CategoryCard
                                        emoji="🌳" title="Tree"
                                        desc="Self-balancing binary search trees. Watch AVL rotations keep the tree height-optimal."
                                        onSelect={() => { setCategory('tree'); setCpxFilter(null); setSelAlgo(null); setWizStep(2); }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {/* Step 2: Complexity filter */}
                        {wizStep === 2 && category && (
                            <Box>
                                <WizHeader step={2} label="Filter by time complexity (optional)" />
                                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mt: 2.5 }}>
                                    <FilterChip label="All" active={cpxFilter === null} onClick={() => setCpxFilter(null)} />
                                    {uniqCpx(algos).map(c => (
                                        <FilterChip key={c} label={c} active={cpxFilter === c}
                                            onClick={() => setCpxFilter(cpxFilter === c ? null : c)} />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1.25, mt: 3.5 }}>
                                    <WizBack onClick={() => setWizStep(1)} />
                                    <WizNext onClick={() => setWizStep(3)} />
                                </Box>
                            </Box>
                        )}

                        {/* Step 3: Algorithm */}
                        {wizStep === 3 && (
                            <Box>
                                <WizHeader step={3} label="Choose an algorithm" />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2.5 }}>
                                    {filtered.map(algo => (
                                        <AlgoCard
                                            key={algo.id} algo={algo}
                                            selected={selAlgo?.id === algo.id}
                                            onSelect={() => { setSelAlgo(algo); setWizStep(4); }}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ mt: 2.5 }}>
                                    <WizBack onClick={() => setWizStep(2)} />
                                </Box>
                            </Box>
                        )}

                        {/* Step 4: Size / preset + launch */}
                        {wizStep === 4 && selAlgo && category !== 'tree' && (
                            <Box>
                                <WizHeader step={4} label={category === 'graph' ? 'Choose grid size' : 'Choose input size'} />
                                <Typography sx={{
                                    fontFamily: FONTS.NECTO_MONO, color: '#666',
                                    fontSize: '0.9rem', mt: 1, mb: 3.5, textAlign: 'left',
                                }}>
                                    {category === 'graph'
                                        ? 'Larger grids make the search frontier more visible but slow playback.'
                                        : 'Larger inputs reveal how the algorithm scales with n.'}
                                </Typography>
                                <Box sx={{ mb: 1 }}>
                                    <Slider
                                        value={sizeIdx} min={0} max={4} step={1}
                                        marks={SIZE_MARKS}
                                        onChange={(_, v) => setSizeIdx(v as number)}
                                        sx={{
                                            color: GOLD,
                                            '& .MuiSlider-markLabel': { fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', color: '#666' },
                                            '& .MuiSlider-thumb': { bgcolor: GOLD },
                                        }}
                                    />
                                </Box>
                                <Typography sx={{
                                    fontFamily: FONTS.NECTO_MONO, fontSize: '1rem',
                                    color: GOLD, mb: 4, textAlign: 'left',
                                }}>
                                    {SIZE_LABELS[sizeIdx]} — {category === 'graph'
                                        ? `${GRID_SIZES[sizeIdx][0]} × ${GRID_SIZES[sizeIdx][1]} grid`
                                        : `${SIZE_VALUES[sizeIdx]} elements`}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <WizBack onClick={() => setWizStep(3)} />
                                    <LaunchBtn onClick={() => setPhase('loading')} />
                                </Box>
                            </Box>
                        )}

                        {/* Step 4: Tree preset picker */}
                        {wizStep === 4 && selAlgo && category === 'tree' && (
                            <Box>
                                <WizHeader step={4} label="Choose a key sequence" />
                                <Typography sx={{
                                    fontFamily: FONTS.NECTO_MONO, color: '#666',
                                    fontSize: '0.9rem', mt: 1, mb: 2.5, textAlign: 'left',
                                }}>
                                    Each preset inserts a different set of values — some trigger many rotations, others stay nearly balanced.
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {AVL_PRESETS.map((p, i) => (
                                        <Box
                                            key={p.label}
                                            onClick={() => setAvlPresetIdx(i)}
                                            sx={{
                                                p: 2.5, borderRadius: 2, cursor: 'pointer',
                                                border: `1px solid ${avlPresetIdx === i ? GOLD : 'rgba(255,255,255,0.08)'}`,
                                                bgcolor: avlPresetIdx === i ? `${GOLD}0d` : '#161624',
                                                display: 'flex', flexDirection: 'column', gap: 0.75,
                                                transition: 'all 0.15s ease',
                                                '&:hover': { borderColor: GOLD, bgcolor: `${GOLD}08` },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#e8e8e8' }}>
                                                    {p.label}
                                                </Typography>
                                                <Chip label={`${p.keys.length} keys`} size="small"
                                                    sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem', bgcolor: '#1e1a00', color: GOLD, height: 24 }} />
                                            </Box>
                                            <Typography sx={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, textAlign: 'left' }}>
                                                {p.desc}
                                            </Typography>
                                            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: '#555', mt: 0.25 }}>
                                                [{p.keys.join(', ')}]
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <WizBack onClick={() => setWizStep(3)} />
                                    <LaunchBtn onClick={() => setPhase('loading')} />
                                </Box>
                            </Box>
                        )}

                    </Box>
                </Box>
            )}
        </Box>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WizHeader({ step, label }: { step: number; label: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <Box sx={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                bgcolor: GOLD, color: '#0a0a0a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONTS.NECTO_MONO, fontSize: '0.95rem', fontWeight: 700,
            }}>
                {step}
            </Box>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', color: '#e8e8e8' }}>
                {label}
            </Typography>
        </Box>
    );
}

function CategoryCard({ emoji, title, desc, onSelect }: {
    emoji: string; title: string; desc: string; onSelect: () => void;
}) {
    return (
        <Box
            onClick={onSelect}
            sx={{
                flex: '1 1 220px', p: 3.5, borderRadius: 2, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#161628',
                // Explicit column flex so emoji + title + desc stack vertically
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 1.25,
                transition: 'all 0.18s ease',
                '&:hover': { borderColor: GOLD, bgcolor: `${GOLD}08`, transform: 'translateY(-2px)' },
            }}
        >
            <Box sx={{ fontSize: '2.5rem', lineHeight: 1 }}>{emoji}</Box>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', color: '#e8e8e8', display: 'block', textAlign: 'left' }}>
                {title}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, display: 'block', textAlign: 'left' }}>
                {desc}
            </Typography>
        </Box>
    );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <Chip
            label={label}
            onClick={onClick}
            sx={{
                fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', cursor: 'pointer',
                height: 36,
                border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.12)'}`,
                bgcolor: active ? `${GOLD}1a` : 'transparent',
                color: active ? GOLD : '#999',
                '&:hover': { borderColor: GOLD, bgcolor: `${GOLD}0d` },
            }}
        />
    );
}

function AlgoCard({ algo, selected, onSelect, compact = false }: {
    algo: AlgoInfo; selected: boolean; onSelect: () => void; compact?: boolean;
}) {
    return (
        <Box
            onClick={onSelect}
            sx={{
                p: compact ? 1.75 : 2.5, borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${selected ? GOLD : 'rgba(255,255,255,0.08)'}`,
                bgcolor: selected ? `${GOLD}0d` : '#161624',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: compact ? 0.5 : 0.75,
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: GOLD, bgcolor: `${GOLD}08` },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: compact ? '0.9rem' : '1rem', color: '#e8e8e8' }}>
                    {algo.name}
                </Typography>
                <InfoChip label={algo.complexity} color={GOLD} bg="#1e1a00" />
                <InfoChip label={`Space: ${algo.spaceComplexity}`} color="#888" bg="#12121e" />
            </Box>
            {!compact && (
                <Typography sx={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, textAlign: 'left' }}>
                    {algo.description}
                </Typography>
            )}
        </Box>
    );
}

function InfoChip({ label, color, bg }: { label: string; color: string; bg: string }) {
    return (
        <Chip
            label={label}
            size="small"
            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem', bgcolor: bg, color, border: 'none', height: 26 }}
        />
    );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1 }}>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.62rem', color: '#555', lineHeight: 1 }}>{label}</Typography>
            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#ddd', lineHeight: 1.2 }}>{value}</Typography>
        </Box>
    );
}

function RunChip({ state }: { state: number }) {
    const colors = {
        bg: state === 1 ? '#1a2800' : state === 2 ? '#2a1e00' : state === 3 ? '#0e1e0a' : '#141428',
        text: state === 1 ? GREEN : state === 2 ? GOLD : state === 3 ? SOFT_GREEN : '#777',
        bdr: state === 1 ? GREEN : state === 2 ? GOLD : state === 3 ? SOFT_GREEN : 'rgba(255,255,255,0.1)',
    };
    return (
        <Chip
            label={RUN_LABEL[state] ?? 'Ready'}
            size="small"
            sx={{
                fontFamily: FONTS.NECTO_MONO, fontSize: '0.78rem',
                bgcolor: colors.bg, color: colors.text,
                border: `1px solid ${colors.bdr}50`,
            }}
        />
    );
}

function WizBack({ onClick, sx }: { onClick: () => void; sx?: object }) {
    return (
        <Box component="button" onClick={onClick} sx={{
            px: 2.5, py: 1,
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1,
            bgcolor: 'transparent', color: '#888',
            fontFamily: FONTS.NECTO_MONO, fontSize: '0.92rem', cursor: 'pointer',
            display: 'inline-block',
            '&:hover': { borderColor: 'rgba(255,255,255,0.3)', color: '#ccc' },
            ...sx,
        }}>← Back</Box>
    );
}

function WizNext({ onClick }: { onClick: () => void }) {
    return (
        <Box component="button" onClick={onClick} sx={{
            px: 3, py: 1,
            border: `1px solid ${GOLD}60`, borderRadius: 1,
            bgcolor: 'transparent', color: GOLD,
            fontFamily: FONTS.NECTO_MONO, fontSize: '0.92rem', cursor: 'pointer',
            display: 'inline-block',
            '&:hover': { bgcolor: `${GOLD}10` },
        }}>Next →</Box>
    );
}

function LaunchBtn({ onClick }: { onClick: () => void }) {
    return (
        <Box component="button" onClick={onClick} sx={{
            px: 4, py: 1.25,
            border: 'none', borderRadius: 1,
            bgcolor: GOLD, color: '#0a0a0a',
            fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', fontWeight: 700,
            cursor: 'pointer', display: 'inline-block',
            transition: 'background-color 0.15s ease',
            '&:hover': { bgcolor: '#ffe066' },
        }}>▶ Visualize</Box>
    );
}

function ActionBtn({ onClick, label, color = '#666', borderColor = 'rgba(255,255,255,0.12)', hoverBg = 'rgba(255,255,255,0.04)' }: {
    onClick: () => void; label: string;
    color?: string; borderColor?: string; hoverBg?: string;
}) {
    return (
        <Box component="button" onClick={onClick} sx={{
            px: 2, py: 0.75,
            bgcolor: 'transparent', border: `1px solid ${borderColor}`,
            borderRadius: 1, color,
            fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', cursor: 'pointer',
            display: 'inline-block',
            '&:hover': { bgcolor: hoverBg, borderColor },
        }}>{label}</Box>
    );
}

// ─── Compare picker panel ─────────────────────────────────────────────────────

function ComparePicker({
    algos, primaryId, sizeN, cpxFilter, setCpxFilter, selAlgo, setSelAlgo, onConfirm, onCancel,
}: {
    algos: AlgoInfo[];
    primaryId: number;
    sizeN: number;
    cpxFilter: string | null;
    setCpxFilter: (v: string | null) => void;
    selAlgo: AlgoInfo | null;
    setSelAlgo: (a: AlgoInfo | null) => void;
    onConfirm: (algo: AlgoInfo) => void;
    onCancel: () => void;
}) {
    const others = algos.filter(a => a.id !== primaryId);
    const filtered = cpxFilter ? others.filter(a => a.complexity === cpxFilter) : others;

    return (
        <Box sx={{
            p: 2.5, borderRadius: 2,
            border: `1px solid ${GREEN}30`, bgcolor: '#0c180e',
            display: 'flex', flexDirection: 'column', gap: 2,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: GREEN }}>
                    Compare against — same n = {sizeN} elements
                </Typography>
                <IconButton size="small" onClick={onCancel} sx={{ color: '#555', '&:hover': { color: '#aaa' } }}>
                    <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>✕</Box>
                </IconButton>
            </Box>

            {/* Complexity filter */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <FilterChip label="All" active={cpxFilter === null} onClick={() => setCpxFilter(null)} />
                {uniqCpx(others).map(c => (
                    <FilterChip key={c} label={c} active={cpxFilter === c}
                        onClick={() => setCpxFilter(cpxFilter === c ? null : c)} />
                ))}
            </Box>

            {/* Algorithm list — compact cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filtered.length === 0 && (
                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', color: '#555' }}>
                        No other algorithms match this filter.
                    </Typography>
                )}
                {filtered.map(algo => (
                    <AlgoCard
                        key={algo.id} algo={algo} compact
                        selected={selAlgo?.id === algo.id}
                        onSelect={() => setSelAlgo(algo)}
                    />
                ))}
            </Box>

            {/* Confirm / cancel */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
                <WizBack onClick={onCancel} />
                <Box
                    component="button"
                    onClick={() => { if (selAlgo) onConfirm(selAlgo); }}
                    sx={{
                        px: 3, py: 1, border: 'none', borderRadius: 1,
                        bgcolor: selAlgo ? GREEN : '#1a2a1a',
                        color: selAlgo ? '#0a0a0a' : '#3a5a3a',
                        fontFamily: FONTS.NECTO_MONO, fontSize: '0.92rem',
                        fontWeight: selAlgo ? 700 : 400,
                        cursor: selAlgo ? 'pointer' : 'default',
                        display: 'inline-block',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: selAlgo ? SOFT_GREEN : undefined },
                    }}
                >
                    ▶ Compare
                </Box>
            </Box>
        </Box>
    );
}

// ─── Shared sx constants ──────────────────────────────────────────────────────

const ctrlBtn = {
    color: '#888',
    '&:hover': { color: '#ddd', bgcolor: 'rgba(255,255,255,0.07)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.18)' },
} as const;
