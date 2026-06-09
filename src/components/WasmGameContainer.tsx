import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    IconButton,
    Box,
    Typography,
    CircularProgress,
    Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FONTS } from '../lib/globals';
import { type LevelFile } from '../lib/LevelSchema';
import { buildLevelCommands } from '../utils/levelLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WasmModule {
    cwrap: (name: string, ret: string | null, args: string[]) => (...args: unknown[]) => unknown;
}

interface WasmModuleFactory {
    (opts: { canvas: HTMLCanvasElement }): Promise<WasmModule>;
}

type WasmGameState = 0 | 1 | 2 | 3; // WAITING | PLAYING | DEAD | COMPLETED — mirrors C++ enum class State

interface WasmGameContainerProps {
    open: boolean;
    onClose: () => void;
    gameTitle: string;
    /** Path to the Emscripten-generated .js file under /wasm/, e.g. "platformer" */
    wasmName: string;
    /** Optional: export name of the Module factory (defaults to `${wasmName}Module`) */
    exportName?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    /** If provided, loads this level into the C++ game via the level_* API */
    levelFile?: LevelFile;
    /** Called once when the C++ game reaches the COMPLETED state (state === 3) */
    onLevelComplete?: () => void;
    /** Human-readable level label shown in the completion overlay, e.g. "Level 1 — First Steps" */
    levelLabel?: string;
}

// ─── State overlay label text ─────────────────────────────────────────────────

const STATE_LABELS: Record<WasmGameState, string> = {
    0: 'Press SPACE or click to start',
    1: '',                              // playing — no overlay needed
    2: 'Press SPACE or click to restart',
    3: '',                              // completed — full overlay rendered separately
};

// ─── Component ────────────────────────────────────────────────────────────────

const WasmGameContainer = ({
    open,
    onClose,
    gameTitle,
    wasmName,
    exportName,
    canvasWidth = 800,
    canvasHeight = 400,
    levelFile,
    onLevelComplete,
    levelLabel,
}: WasmGameContainerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const moduleRef = useRef<WasmModule | null>(null);
    const scriptRef = useRef<HTMLScriptElement | null>(null);
    const pollRef = useRef<number | null>(null);
    const completionFiredRef = useRef(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<WasmGameState>(0);

    const factoryName = exportName ?? `${wasmName}Module`;

    // ── Poll score / state from the WASM module ────────────────────────────
    const startPolling = useCallback((mod: WasmModule) => {
        const getScore = mod.cwrap('get_score', 'number', []) as () => number;
        const getState = mod.cwrap('get_state', 'number', []) as () => number;

        pollRef.current = window.setInterval(() => {
            setScore(getScore());
            setGameState(getState() as WasmGameState);
        }, 100);
    }, []);

    // ── Reset completion guard when dialog opens ──────────────────────────
    useEffect(() => {
        if (open) completionFiredRef.current = false;
    }, [open]);

    // ── Fire onLevelComplete exactly once when COMPLETED state is reached ──
    useEffect(() => {
        if (gameState === 3 && !completionFiredRef.current) {
            completionFiredRef.current = true;
            onLevelComplete?.();
        }
    }, [gameState, onLevelComplete]);

    // ── Load WASM module when dialog opens ────────────────────────────────
    useEffect(() => {
        if (!open) return;

        setLoading(true);
        setError(null);
        setScore(0);
        setGameState(0);

        const scriptSrc = `/wasm/${wasmName}.js`;

        const initModule = async (canvas: HTMLCanvasElement) => {
            const factory = (window as unknown as Record<string, unknown>)[factoryName] as WasmModuleFactory | undefined;
            if (!factory) {
                setError('WASM module factory not found. Run npm run build:wasm first.');
                setLoading(false);
                return;
            }
            try {
                const mod = await factory({ canvas });
                moduleRef.current = mod;

                // Load level file into C++ game via the command bridge
                if (levelFile && levelFile.cells.length > 0) {
                    const levelBegin = mod.cwrap('level_begin', null, []) as () => void;
                    const levelEnd = mod.cwrap('level_end', null, []) as () => void;
                    const addSpike = mod.cwrap('level_add_spike', null, ['number', 'number']) as (x: number, wy: number) => void;
                    const addPit = mod.cwrap('level_add_pit', null, ['number', 'number']) as (x: number, w: number) => void;
                    const addPlatform = mod.cwrap('level_add_platform', null, ['number', 'number', 'number', 'number']) as (x: number, wy: number, w: number, h: number) => void;
                    const setFinish = mod.cwrap('level_set_finish', null, ['number']) as (x: number) => void;

                    for (const cmd of buildLevelCommands(levelFile)) {
                        switch (cmd.cmd) {
                            case 'begin': levelBegin(); break;
                            case 'spike': addSpike(cmd.worldX, cmd.worldY); break;
                            case 'pit': addPit(cmd.worldX, cmd.width); break;
                            case 'platform': addPlatform(cmd.worldX, cmd.worldY, cmd.width, cmd.height); break;
                            case 'end': levelEnd(); break;
                            case 'set_finish': setFinish(cmd.worldX); break;
                        }
                    }
                }

                startPolling(mod);
                setLoading(false);
            } catch (err) {
                setError(`Failed to initialise WASM module: ${err}`);
                setLoading(false);
            }
        };

        // Give the canvas a frame to mount, then load the script
        const timer = setTimeout(() => {
            if (!canvasRef.current) { setLoading(false); return; }
            const canvas = canvasRef.current;

            // If already loaded (e.g. dialog reopened), init directly
            if ((window as unknown as Record<string, unknown>)[factoryName]) {
                initModule(canvas);
                return;
            }

            const script = document.createElement('script');
            script.src = scriptSrc;
            script.async = true;
            script.onload = () => initModule(canvas);
            script.onerror = () => {
                setError(`Could not load ${scriptSrc}. Run npm run build:wasm.`);
                setLoading(false);
            };
            scriptRef.current = script;
            document.body.appendChild(script);
        }, 50);

        return () => clearTimeout(timer);
    }, [open, wasmName, factoryName, startPolling]);

    // ── Cleanup when dialog closes ─────────────────────────────────────────
    useEffect(() => {
        if (open) return;
        if (pollRef.current !== null) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        moduleRef.current = null;
    }, [open]);

    // ── Jump on spacebar (canvas may not catch focus in dialog) ───────────
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                const mod = moduleRef.current;
                if (mod) (mod.cwrap('do_jump', null, []) as () => void)();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    // ── Canvas click → jump ───────────────────────────────────────────────
    const handleCanvasClick = () => {
        const mod = moduleRef.current;
        if (mod) (mod.cwrap('do_jump', null, []) as () => void)();
    };

    // ─────────────────────────────────────────────────────────────────────

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    bgcolor: '#0a0a19',
                    backgroundImage: 'none',
                    borderRadius: 2,
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                        sx={{
                            fontFamily: FONTS.NECTO_MONO,
                            color: '#ffd740',
                            fontSize: '1.15rem',
                            letterSpacing: 1,
                        }}
                    >
                        {gameTitle}
                    </Typography>
                    {/* C++ badge */}
                    <Box
                        sx={{
                            px: 0.8,
                            py: 0.15,
                            borderRadius: 0.75,
                            border: '1px solid rgba(100,180,255,0.5)',
                            bgcolor: 'rgba(100,180,255,0.08)',
                        }}
                    >
                        <Typography sx={{ color: '#64b4ff', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO, letterSpacing: 1 }}>
                            C++ / WASM
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Live score (playing) or final score (completed) */}
                    {(gameState === 1 || gameState === 3) && (
                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: '#ffd740', fontSize: '0.9rem' }}>
                            {score.toString().padStart(5, '0')}
                        </Typography>
                    )}
                    <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <DialogContent sx={{ p: 0, position: 'relative', lineHeight: 0 }}>
                {/* SDL2 canvas — Emscripten renders into this */}
                <canvas
                    ref={canvasRef}
                    id="canvas"
                    width={canvasWidth}
                    height={canvasHeight}
                    onClick={handleCanvasClick}
                    style={{ display: 'block', cursor: 'pointer' }}
                />

                {/* Loading spinner */}
                {loading && (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(10,10,25,0.92)',
                        gap: 2,
                    }}>
                        <CircularProgress size={40} sx={{ color: '#ffd740' }} />
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontFamily: FONTS.NECTO_MONO }}>
                            Loading WASM…
                        </Typography>
                    </Box>
                )}

                {/* Error state */}
                {error && (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(10,10,25,0.95)',
                        gap: 1.5, p: 3,
                    }}>
                        <Typography sx={{ color: '#ff5555', fontFamily: FONTS.NECTO_MONO, textAlign: 'center', fontSize: '0.85rem' }}>
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* Level Complete overlay */}
                {!loading && !error && gameState === 3 && (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 1.5,
                        bgcolor: 'rgba(0,0,0,0.55)',
                    }}>
                        <Typography sx={{
                            fontFamily: FONTS.NECTO_MONO,
                            color: '#ffd740',
                            fontSize: '2rem',
                            letterSpacing: 3,
                            textTransform: 'uppercase',
                        }}>
                            Level Complete!
                        </Typography>
                        {levelLabel && (
                            <Typography sx={{
                                fontFamily: FONTS.NECTO_MONO,
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.68rem',
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                            }}>
                                {levelLabel}
                            </Typography>
                        )}
                        <Typography sx={{
                            fontFamily: FONTS.NECTO_MONO,
                            color: 'rgba(255,215,64,0.85)',
                            fontSize: '1rem',
                            letterSpacing: 2,
                            mt: 0.5,
                        }}>
                            {score.toString().padStart(5, '0')}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={onClose}
                            sx={{
                                mt: 1,
                                fontFamily: FONTS.NECTO_MONO,
                                fontSize: '0.7rem',
                                letterSpacing: 2,
                                color: '#ffd740',
                                borderColor: 'rgba(255,215,64,0.5)',
                                textTransform: 'uppercase',
                                '&:hover': {
                                    borderColor: '#ffd740',
                                    bgcolor: 'rgba(255,215,64,0.08)',
                                },
                            }}
                        >
                            Back to Level Select
                        </Button>
                    </Box>
                )}

                {/* State overlay label (WAITING / DEAD) — sits over the canvas dark overlay drawn by C++ */}
                {!loading && !error && gameState !== 1 && gameState !== 3 && (
                    <Box sx={{
                        position: 'absolute', bottom: 32, left: 0, right: 0,
                        display: 'flex', justifyContent: 'center',
                        pointerEvents: 'none',
                    }}>
                        <Typography sx={{
                            fontFamily: FONTS.NECTO_MONO,
                            color: 'rgba(255,215,64,0.9)',
                            fontSize: '0.78rem',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                        }}>
                            {STATE_LABELS[gameState]}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default WasmGameContainer;
