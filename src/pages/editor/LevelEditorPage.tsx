import { useRef, useState, useCallback, useEffect } from 'react';
import {
    Box, Button, Slider, Typography, Tooltip, ToggleButton,
    ToggleButtonGroup, Divider, Stack,
} from '@mui/material';
import WasmGameContainer from '../../components/WasmGameContainer';
import { type LevelObject, type LevelData } from '../../lib/LevelTypes';
import { FONTS } from '../../lib/globals';

// ─── Game constants (must match cpp/platformer/main.cpp) ─────────────────────
const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = 320;
const TILE = 32;
const SPIKE_W = 32;
const SPIKE_H = 40;
const PW = 32;
const PH = 32;
const WORLD_W = 5120; // 160 tiles — max level length
// Max jump height ≈ JUMP_VEL² / (2 × GRAVITY) = 8.0²/0.8 ≈ 80px
const MAX_JUMP_H = 80;

type Tool = 'spike' | 'pit' | 'platform' | 'eraser';

interface DragState {
    tool: Tool;
    startWorldX: number;
    startScreenY: number;
    curWorldX: number;
    curScreenY: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function snapX(wx: number): number { return Math.floor(wx / TILE) * TILE; }
function snapY(sy: number): number { return Math.floor(sy / TILE) * TILE; }

function rangeX(drag: DragState): { minX: number; maxX: number } {
    const min = snapX(Math.min(drag.startWorldX, drag.curWorldX));
    const max = snapX(Math.max(drag.startWorldX, drag.curWorldX)) + TILE;
    return { minX: min, maxX: Math.max(max, min + TILE) };
}

// ─── Canvas draw function (reads all params, no stale closure issues) ─────────

function drawCanvas(
    canvas: HTMLCanvasElement,
    objects: LevelObject[],
    scrollX: number,
    tool: Tool,
    platH: number,
    drag: DragState | null,
    hoverWorldX: number | null,
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0a0a19';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Grid ──
    const startTile = Math.floor(scrollX / TILE);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let t = startTile; t <= startTile + CANVAS_W / TILE + 1; t++) {
        const cx = t * TILE - scrollX;
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += TILE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // ── Max jump height guide ──
    const guideY = GROUND_Y - MAX_JUMP_H;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, guideY); ctx.lineTo(CANVAS_W, guideY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,80,80,0.35)';
    ctx.font = '9px monospace';
    ctx.fillText('max jump', 4, guideY - 3);

    // ── Ground fill ──
    ctx.fillStyle = '#2a2a44';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // ── Existing pits (cut into ground) ──
    for (const obj of objects) {
        if (obj.type !== 'pit') continue;
        const cx = obj.worldX - scrollX;
        const cr = cx + obj.width;
        if (cr < 0 || cx > CANVAS_W) continue;
        ctx.fillStyle = '#0a0a19';
        ctx.fillRect(cx, GROUND_Y, obj.width, CANVAS_H - GROUND_Y);
    }

    // ── Ground surface line ──
    ctx.strokeStyle = '#5f5f96';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke();

    // Erase line over pits and draw edge ticks
    for (const obj of objects) {
        if (obj.type !== 'pit') continue;
        const cx = obj.worldX - scrollX;
        const cr = cx + obj.width;
        if (cr < 0 || cx > CANVAS_W) continue;
        ctx.fillStyle = '#0a0a19';
        ctx.fillRect(Math.max(0, cx), GROUND_Y - 1, Math.min(cr, CANVAS_W) - Math.max(0, cx), 3);
        ctx.strokeStyle = '#5f5f96';
        ctx.lineWidth = 1;
        if (cx > 0 && cx < CANVAS_W) { ctx.beginPath(); ctx.moveTo(cx, GROUND_Y - 7); ctx.lineTo(cx, GROUND_Y); ctx.stroke(); }
        if (cr > 0 && cr < CANVAS_W) { ctx.beginPath(); ctx.moveTo(cr, GROUND_Y - 7); ctx.lineTo(cr, GROUND_Y); ctx.stroke(); }
    }

    // ── Platforms ──
    for (const obj of objects) {
        if (obj.type !== 'platform') continue;
        const cx = obj.worldX - scrollX;
        if (cx + obj.width < 0 || cx > CANVAS_W) continue;
        const cy = GROUND_Y - obj.worldY - obj.height;
        ctx.fillStyle = '#3a6a9a';
        ctx.fillRect(cx, cy, obj.width, obj.height);
        ctx.strokeStyle = '#78b4e6';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + obj.width, cy); ctx.stroke();
        ctx.lineWidth = 1;
    }

    // ── Spikes ──
    for (const obj of objects) {
        if (obj.type !== 'spike') continue;
        const cx = obj.worldX - scrollX;
        if (cx + SPIKE_W < 0 || cx > CANVAS_W) continue;
        const tipX = cx + SPIKE_W / 2;
        const tipY = GROUND_Y - SPIKE_H;
        ctx.fillStyle = '#d73737';
        ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(cx, GROUND_Y); ctx.lineTo(cx + SPIKE_W, GROUND_Y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8c1919';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── Player spawn indicator ──
    const playerCX = 120 - scrollX;
    if (playerCX > -PW && playerCX < CANVAS_W) {
        ctx.fillStyle = 'rgba(255,195,0,0.18)';
        ctx.fillRect(playerCX, GROUND_Y - PH, PW, PH);
        ctx.strokeStyle = 'rgba(255,195,0,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(playerCX, GROUND_Y - PH, PW, PH);
        ctx.fillStyle = 'rgba(255,195,0,0.4)';
        ctx.font = '9px monospace';
        ctx.fillText('start', playerCX, GROUND_Y - PH - 3);
    }

    // ── Hover highlight ──
    if (hoverWorldX !== null && !drag) {
        const hcx = snapX(hoverWorldX) - scrollX;
        if (tool === 'spike') {
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#ff6666';
            const tipX = hcx + SPIKE_W / 2;
            ctx.beginPath(); ctx.moveTo(tipX, GROUND_Y - SPIKE_H); ctx.lineTo(hcx, GROUND_Y); ctx.lineTo(hcx + SPIKE_W, GROUND_Y); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
        } else if (tool === 'eraser') {
            ctx.strokeStyle = 'rgba(255,80,80,0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hcx, 0, TILE, CANVAS_H);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(hcx, 0, TILE, CANVAS_H);
        }
    }

    // ── Drag preview ──
    if (drag) {
        const { minX, maxX } = rangeX(drag);
        const cxMin = minX - scrollX;
        const w = maxX - minX;
        ctx.globalAlpha = 0.65;

        if (drag.tool === 'spike') {
            const sx = snapX(drag.curWorldX) - scrollX;
            const tipX = sx + SPIKE_W / 2;
            ctx.fillStyle = '#ff9999';
            ctx.beginPath(); ctx.moveTo(tipX, GROUND_Y - SPIKE_H); ctx.lineTo(sx, GROUND_Y); ctx.lineTo(sx + SPIKE_W, GROUND_Y); ctx.closePath(); ctx.fill();
        } else if (drag.tool === 'pit') {
            ctx.fillStyle = '#0a0a19';
            ctx.fillRect(cxMin, GROUND_Y, w, CANVAS_H - GROUND_Y);
            ctx.strokeStyle = '#ff7777';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cxMin, GROUND_Y, w, CANVAS_H - GROUND_Y);
        } else if (drag.tool === 'platform') {
            const cy = snapY(Math.min(drag.startScreenY, drag.curScreenY));
            ctx.fillStyle = '#5a8abf';
            ctx.fillRect(cxMin, cy, w, platH);
            ctx.strokeStyle = '#78d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cxMin, cy); ctx.lineTo(cxMin + w, cy); ctx.stroke();
            ctx.lineWidth = 1;
        }
        ctx.globalAlpha = 1;
    }

    // ── World ruler (top bar) ──
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '9px monospace';
    for (let t = startTile; t <= startTile + CANVAS_W / TILE + 1; t++) {
        if (t % 4 === 0) {
            const cx = t * TILE - scrollX;
            if (cx >= 0 && cx < CANVAS_W - 20) ctx.fillText(`${t * TILE}`, cx + 2, 13);
        }
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LevelEditorPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const hoverRef = useRef<number | null>(null); // hovered worldX

    const [objects, setObjects] = useState<LevelObject[]>([]);
    const [scrollX, setScrollX] = useState(0);
    const [tool, setTool] = useState<Tool>('spike');
    const [platH, setPlatH] = useState(16);
    const [gameOpen, setGameOpen] = useState(false);
    const [levelData, setLevelData] = useState<LevelData | null>(null);
    const [objCount, setObjCount] = useState(0); // forces re-render for count display

    // ── Draw whenever relevant state changes ──
    const redraw = useCallback((
        objs: LevelObject[], sx: number, t: Tool, ph: number,
        drag: DragState | null, hover: number | null,
    ) => {
        const canvas = canvasRef.current;
        if (canvas) drawCanvas(canvas, objs, sx, t, ph, drag, hover);
    }, []);

    useEffect(() => {
        redraw(objects, scrollX, tool, platH, dragRef.current, hoverRef.current);
    }, [objects, scrollX, tool, platH, redraw]);

    // ── Canvas event helpers ──
    const canvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            worldX: e.clientX - rect.left + scrollX,
            screenY: e.clientY - rect.top,
        };
    };

    const hitTest = useCallback((worldX: number, screenY: number, objs: LevelObject[]): string | null => {
        // Returns ID of the first object near the click, or null.
        for (let i = objs.length - 1; i >= 0; i--) {
            const obj = objs[i];
            if (obj.type === 'spike') {
                if (Math.abs(worldX - (obj.worldX + SPIKE_W / 2)) < SPIKE_W / 2 + 4) return obj.id;
            } else if (obj.type === 'pit') {
                if (worldX >= obj.worldX && worldX <= obj.worldX + obj.width && screenY >= GROUND_Y - TILE) return obj.id;
            } else if (obj.type === 'platform') {
                const top = GROUND_Y - obj.worldY - obj.height;
                const bot = GROUND_Y - obj.worldY;
                if (worldX >= obj.worldX && worldX <= obj.worldX + obj.width && screenY >= top - 4 && screenY <= bot + 4) return obj.id;
            }
        }
        return null;
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        const { worldX, screenY } = canvasCoords(e);
        dragRef.current = { tool, startWorldX: worldX, startScreenY: screenY, curWorldX: worldX, curScreenY: screenY };

        if (tool === 'eraser') {
            const id = hitTest(worldX, screenY, objects);
            if (id) {
                const next = objects.filter(o => o.id !== id);
                setObjects(next);
                setObjCount(next.length);
                dragRef.current = null;
                redraw(next, scrollX, tool, platH, null, hoverRef.current);
            }
            return;
        }
        if (tool === 'spike') {
            // Place immediately on mousedown
            const wx = snapX(worldX);
            const next: LevelObject[] = [...objects, { type: 'spike', id: uid(), worldX: wx }];
            setObjects(next);
            setObjCount(next.length);
            dragRef.current = null;
            redraw(next, scrollX, tool, platH, null, hoverRef.current);
        }
        // pit / platform: wait for mouseup to finalize
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { worldX, screenY } = canvasCoords(e);
        hoverRef.current = worldX;
        if (dragRef.current) {
            dragRef.current.curWorldX = worldX;
            dragRef.current.curScreenY = screenY;
        }
        redraw(objects, scrollX, tool, platH, dragRef.current, hoverRef.current);
    };

    const handleMouseUp = (_e: React.MouseEvent<HTMLCanvasElement>) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag || drag.tool === 'spike' || drag.tool === 'eraser') return;

        const { minX, maxX } = rangeX(drag);
        const w = maxX - minX;
        if (w < TILE) return; // too small

        let next: LevelObject[];
        if (drag.tool === 'pit') {
            next = [...objects, { type: 'pit', id: uid(), worldX: minX, width: w }];
        } else {
            // platform
            const topY = snapY(Math.min(drag.startScreenY, drag.curScreenY));
            const wy = GROUND_Y - topY; // pixels above GROUND_Y
            next = [...objects, { type: 'platform', id: uid(), worldX: minX, worldY: wy, width: w, height: platH }];
        }
        setObjects(next);
        setObjCount(next.length);
        redraw(next, scrollX, tool, platH, null, hoverRef.current);
    };

    const handleMouseLeave = () => {
        hoverRef.current = null;
        dragRef.current = null;
        redraw(objects, scrollX, tool, platH, null, null);
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const next = Math.max(0, Math.min(WORLD_W - CANVAS_W, scrollX + e.deltaY * 1.2));
        setScrollX(next);
    };

    // ── Actions ──
    const handleClear = () => { setObjects([]); setObjCount(0); };

    const handleExport = () => {
        const data: LevelData = { objects };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'level.json';
        a.click();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            file.text().then(text => {
                try {
                    const data = JSON.parse(text) as LevelData;
                    if (!Array.isArray(data.objects)) throw new Error('Invalid format');
                    setObjects(data.objects);
                    setObjCount(data.objects.length);
                } catch { alert('Invalid level JSON'); }
            });
        };
        input.click();
    };

    const handlePlay = () => {
        setLevelData({ objects: [...objects] });
        setGameOpen(true);
    };

    const TOOL_COLORS: Record<Tool, string> = {
        spike: '#d73737',
        pit: '#5f5f96',
        platform: '#3a6a9a',
        eraser: '#888',
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#0a0a19', color: 'white' }}>

            {/* ── Header ── */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: FONTS.ANTON, color: '#ffd740', letterSpacing: 1, mr: 1 }}>
                    Platform Rush — Level Editor
                </Typography>

                <Box sx={{ px: 0.8, py: 0.1, borderRadius: 0.75, border: '1px solid rgba(100,180,255,0.4)', bgcolor: 'rgba(100,180,255,0.07)' }}>
                    <Typography sx={{ color: '#64b4ff', fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: 1 }}>
                        C++ / WASM
                    </Typography>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 0.5 }} />

                {/* Tool selector */}
                <ToggleButtonGroup
                    exclusive
                    value={tool}
                    onChange={(_, v) => { if (v) setTool(v as Tool); }}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'monospace', fontSize: '0.72rem', px: 1.5, py: 0.5 }, '& .Mui-selected': { bgcolor: 'rgba(255,255,255,0.1) !important', color: 'white !important' } }}
                >
                    {(['spike', 'pit', 'platform', 'eraser'] as Tool[]).map(t => (
                        <ToggleButton key={t} value={t} sx={{ '&.Mui-selected': { borderColor: `${TOOL_COLORS[t]} !important`, color: `${TOOL_COLORS[t]} !important` } }}>
                            {t === 'spike' ? '▲ Spike' : t === 'pit' ? '⬛ Pit' : t === 'platform' ? '═ Platform' : '✕ Erase'}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {/* Platform height (only shown when platform tool active) */}
                {tool === 'platform' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                            Height: {platH}px
                        </Typography>
                        <Slider
                            value={platH} min={8} max={64} step={8}
                            onChange={(_, v) => setPlatH(v as number)}
                            size="small"
                            sx={{ color: '#3a6a9a', width: 100 }}
                        />
                    </Box>
                )}

                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                        {objCount} object{objCount !== 1 ? 's' : ''}
                    </Typography>
                </Box>
            </Box>

            {/* ── Canvas ── */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                <Box sx={{ position: 'relative' }}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onWheel={handleWheel}
                        style={{ display: 'block', cursor: tool === 'eraser' ? 'crosshair' : 'cell', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}
                    />
                    {/* Legend overlay */}
                    <Box sx={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', gap: 2, opacity: 0.55, pointerEvents: 'none' }}>
                        {[
                            { color: 'rgba(255,195,0,0.7)', label: 'player start' },
                            { color: 'rgba(255,80,80,0.5)', label: 'max jump height' },
                        ].map(({ color, label }) => (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: 0.5 }} />
                                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* ── Scrollbar ── */}
            <Box sx={{ px: 3, pb: 0.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', minWidth: 64 }}>
                    x: {Math.round(scrollX)}
                </Typography>
                <Slider
                    value={scrollX}
                    min={0}
                    max={WORLD_W - CANVAS_W}
                    onChange={(_, v) => setScrollX(v as number)}
                    size="small"
                    sx={{ color: 'rgba(255,255,255,0.2)', flex: 1 }}
                />
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', minWidth: 64, textAlign: 'right' }}>
                    {WORLD_W - CANVAS_W - Math.round(scrollX)} left
                </Typography>
            </Box>

            {/* ── Actions ── */}
            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Tooltip title="Remove all objects">
                    <Button size="small" onClick={handleClear} sx={{ color: 'rgba(255,80,80,0.8)', borderColor: 'rgba(255,80,80,0.3)', fontFamily: 'monospace', fontSize: '0.72rem' }} variant="outlined">
                        Clear
                    </Button>
                </Tooltip>
                <Button size="small" onClick={handleImport} sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', fontSize: '0.72rem' }} variant="outlined">
                    Import JSON
                </Button>
                <Button size="small" onClick={handleExport} sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', fontSize: '0.72rem' }} variant="outlined">
                    Export JSON
                </Button>

                <Box sx={{ ml: 'auto' }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                            Scroll: mouse wheel  ·  Click: place  ·  Drag: pit / platform
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handlePlay}
                            disabled={objects.length === 0}
                            sx={{ bgcolor: '#ffd740', color: '#0a0a19', fontFamily: FONTS.ANTON, letterSpacing: 1, '&:hover': { bgcolor: '#ffe066' }, '&:disabled': { bgcolor: 'rgba(255,215,64,0.2)', color: 'rgba(255,255,255,0.3)' } }}
                        >
                            ▶ Play Level
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* ── Game modal ── */}
            {gameOpen && levelData && (
                <WasmGameContainer
                    open={gameOpen}
                    onClose={() => setGameOpen(false)}
                    gameTitle="Platform Rush"
                    wasmName="platformer"
                    levelData={levelData}
                />
            )}
        </Box>
    );
}
