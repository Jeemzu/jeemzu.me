import { useRef, useState, useCallback, useEffect, useId } from 'react';
import {
    Box, Button, Typography, TextField, Tooltip,
    ToggleButton, ToggleButtonGroup, Stack, Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import WasmGameContainer from '../../components/WasmGameContainer';
import { type LevelFile, type LevelCell, type CellType } from '../../lib/LevelSchema';
import { FONTS } from '../../lib/globals';
import { saveCustomLevel } from '../../utils/customLevels';
import { RoleGuard } from '../../components/shared/RoleGuard';

// --- Grid constants (must match cpp/platformer/main.cpp)

const TILE = 32;
const GROUND_Y = 640;
const SW = 960;
const SH = 720;

const ROWS = Math.ceil(SH / TILE);   // 30  (rows 0-29)
const GROUND_ROW = GROUND_Y / TILE;       // 20

const MIN_COLS = Math.ceil(SW / TILE);   // 40
const MAX_COLS = 400;

// --- Tool colours

const TOOL_COLORS: Record<CellType, string> = {
    platform: '#3a6ea0',
    spike: '#d73737',
    pit: '#0a0a14',
    finish: '#ffd740',
};

const TOOL_HOVER: Record<CellType, string> = {
    platform: 'rgba(58,110,160,0.55)',
    spike: 'rgba(215,55,55,0.55)',
    pit: 'rgba(10,10,20,0.8)',
    finish: 'rgba(255,215,64,0.45)',
};

type Tool = CellType | 'eraser';

// --- Cell map helpers

type CellKey = `${number},${number}`;
function key(row: number, col: number): CellKey { return `${row},${col}`; }

// --- Canvas draw

interface DrawParams {
    cells: Map<CellKey, CellType>;
    scrollCol: number;
    totalCols: number;
    tool: Tool;
    hoverRow: number | null;
    hoverCol: number | null;
}

function isValidPlacement(tool: Tool, row: number): boolean {
    if (tool === 'eraser') return true;
    if (tool === 'platform') return row >= 1 && row < GROUND_ROW;
    if (tool === 'spike') return row >= 1 && row <= GROUND_ROW;
    return row === GROUND_ROW;
}

function drawEditor(canvas: HTMLCanvasElement, p: DrawParams) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const visibleCols = Math.ceil(SW / TILE) + 1;
    const startCol = p.scrollCol;

    ctx.fillStyle = '#0a0a19';
    ctx.fillRect(0, 0, SW, SH);

    // Underground fill
    ctx.fillStyle = '#1e1e38';
    ctx.fillRect(0, (GROUND_ROW + 1) * TILE, SW, SH - (GROUND_ROW + 1) * TILE);

    // Ground row
    ctx.fillStyle = '#2a2a44';
    ctx.fillRect(0, GROUND_ROW * TILE, SW, TILE);

    // Existing cells
    for (let c = startCol; c < startCol + visibleCols; c++) {
        const sx = (c - startCol) * TILE;

        if (p.cells.get(key(GROUND_ROW, c)) === 'pit') {
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(sx, GROUND_ROW * TILE, TILE, TILE);
            ctx.fillStyle = '#080810';
            ctx.fillRect(sx, (GROUND_ROW + 1) * TILE, TILE, SH - (GROUND_ROW + 1) * TILE);
        }

        for (let r = 1; r < GROUND_ROW; r++) {
            if (p.cells.get(key(r, c)) === 'platform') {
                ctx.fillStyle = TOOL_COLORS.platform;
                ctx.fillRect(sx, r * TILE, TILE, TILE);
                ctx.fillStyle = 'rgba(120,180,255,0.6)';
                ctx.fillRect(sx, r * TILE, TILE, 2);
            }
            if (p.cells.get(key(r, c)) === 'spike') {
                const tipX = sx + TILE / 2;
                const baseY = (r + 1) * TILE;
                ctx.fillStyle = TOOL_COLORS.spike;
                ctx.beginPath();
                ctx.moveTo(sx + 2, baseY);
                ctx.lineTo(tipX, r * TILE + 8);
                ctx.lineTo(sx + TILE - 2, baseY);
                ctx.closePath();
                ctx.fill();
            }
        }

        if (p.cells.get(key(GROUND_ROW, c)) === 'spike') {
            const tipX = sx + TILE / 2;
            const baseY = (GROUND_ROW + 1) * TILE;
            ctx.fillStyle = TOOL_COLORS.spike;
            ctx.beginPath();
            ctx.moveTo(sx + 2, baseY);
            ctx.lineTo(tipX, GROUND_ROW * TILE + 8);
            ctx.lineTo(sx + TILE - 2, baseY);
            ctx.closePath();
            ctx.fill();
        }

        if (p.cells.get(key(GROUND_ROW, c)) === 'finish') {
            ctx.fillStyle = 'rgba(255,215,64,0.25)';
            ctx.fillRect(sx, 0, TILE, GROUND_ROW * TILE);
            ctx.fillStyle = TOOL_COLORS.finish;
            ctx.fillRect(sx, 0, 3, GROUND_ROW * TILE);
            const flagX = sx + 6;
            const flagY = 20;
            for (let fx = 0; fx < 3; fx++) {
                for (let fy = 0; fy < 3; fy++) {
                    ctx.fillStyle = (fx + fy) % 2 === 0 ? '#fff' : '#000';
                    ctx.fillRect(flagX + fx * 4, flagY + fy * 4, 4, 4);
                }
            }
        }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= visibleCols; c++) {
        const sx = c * TILE;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, SH); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(SW, r * TILE); ctx.stroke();
    }

    // Ground surface line
    ctx.strokeStyle = 'rgba(150,150,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND_ROW * TILE); ctx.lineTo(SW, GROUND_ROW * TILE); ctx.stroke();

    // Column ruler
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, SW, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '8px monospace';
    for (let c = startCol; c < startCol + visibleCols; c++) {
        if (c % 5 === 0) {
            const sx = (c - startCol) * TILE;
            ctx.fillText(String(c), sx + 2, 11);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, 12); ctx.lineTo(sx, 16); ctx.stroke();
        }
    }

    // Player spawn indicator
    const spawnCol = 3;
    if (spawnCol >= startCol && spawnCol < startCol + visibleCols) {
        const sx = (spawnCol - startCol) * TILE;
        ctx.fillStyle = 'rgba(255,195,0,0.35)';
        ctx.fillRect(sx, GROUND_ROW * TILE - TILE, TILE, TILE);
        ctx.fillStyle = 'rgba(255,195,0,0.6)';
        ctx.font = '8px monospace';
        ctx.fillText('P', sx + 5, GROUND_ROW * TILE - 10);
    }

    // Hover preview
    if (p.hoverRow !== null && p.hoverCol !== null) {
        const hr = p.hoverRow;
        const hc = p.hoverCol;
        const sx = (hc - startCol) * TILE;
        const sy = hr * TILE;
        const valid = isValidPlacement(p.tool, hr);
        if (valid && p.tool !== 'eraser') {
            ctx.fillStyle = TOOL_HOVER[p.tool as CellType];
            ctx.fillRect(sx, sy, TILE, TILE);
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
        }
    }

    // Level end marker
    const endCol = p.totalCols - 1;
    if (endCol >= startCol && endCol < startCol + visibleCols) {
        const sx = (endCol - startCol) * TILE;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(sx + TILE, 0); ctx.lineTo(sx + TILE, SH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '8px monospace';
        ctx.fillText('END', sx + TILE - 22, 26);
    }
}

// --- LevelFile builder

function buildLevelFile(cells: Map<CellKey, CellType>, number: number, name: string, totalCols: number): LevelFile {
    const cellArr: LevelCell[] = [];
    for (const [k, type] of cells) {
        const [r, c] = k.split(',').map(Number);
        cellArr.push({ row: r, col: c, type });
    }
    return { version: 1, number, name, cols: totalCols, cells: cellArr };
}

// --- Component

const LevelEditorPage = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const mouseInsideRef = useRef(false);
    const [cells, setCells] = useState<Map<CellKey, CellType>>(new Map());
    const [tool, setTool] = useState<Tool>('platform');
    const [scrollCol, setScrollCol] = useState(0);
    const [totalCols, setTotalCols] = useState(100);
    const [levelNumber, setLevelNumber] = useState(1);
    const [levelName, setLevelName] = useState('');
    const [playOpen, setPlayOpen] = useState(false);
    const [playLevelFile, setPlayLevelFile] = useState<LevelFile | null>(null);
    const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null);
    const [savedMsg, setSavedMsg] = useState(false);
    const importId = useId();

    const paintingRef = useRef(false);

    // Redraw whenever state changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawEditor(canvas, {
            cells,
            scrollCol,
            totalCols,
            tool,
            hoverRow: hoverPos?.row ?? null,
            hoverCol: hoverPos?.col ?? null,
        });
    }, [cells, scrollCol, totalCols, tool, hoverPos]);

    // Mouse helpers
    const canvasRowCol = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / TILE) + scrollCol;
        const row = Math.floor((e.clientY - rect.top) / TILE);
        return { row, col };
    }, [scrollCol]);

    const applyTool = useCallback((row: number, col: number) => {
        if (col < 0 || col >= totalCols) return;
        if (!isValidPlacement(tool, row)) return;
        setCells(prev => {
            const next = new Map(prev);
            const k = key(row, col);
            if (tool === 'eraser') {
                next.delete(k);
            } else {
                if (tool === 'finish') {
                    for (const [ek, ev] of next) { if (ev === 'finish') { next.delete(ek); break; } }
                }
                next.set(k, tool as CellType);
            }
            return next;
        });
    }, [tool, totalCols]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        paintingRef.current = true;
        const { row, col } = canvasRowCol(e);
        applyTool(row, col);
    }, [canvasRowCol, applyTool]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { row, col } = canvasRowCol(e);
        setHoverPos(prev => (prev?.row === row && prev?.col === col ? prev : { row, col }));
        if (paintingRef.current) applyTool(row, col);
    }, [canvasRowCol, applyTool]);

    const handleMouseUp = useCallback(() => { paintingRef.current = false; }, []);
    const handleMouseLeave = useCallback(() => { paintingRef.current = false; setHoverPos(null); mouseInsideRef.current = false; }, []);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!mouseInsideRef.current) return;
            e.preventDefault();
            setScrollCol(prev => Math.max(0, Math.min(totalCols - MIN_COLS, prev + Math.round(e.deltaY / 32))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [totalCols]);

    // Save to My Levels (localStorage)
    const handleSave = () => {
        const name = levelName.trim() || `My Level ${Date.now()}`;
        const cellArr: LevelCell[] = [];
        for (const [k, type] of cells) {
            const [r, c] = k.split(',').map(Number);
            cellArr.push({ row: r, col: c, type });
        }
        saveCustomLevel(name, totalCols, cellArr);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2500);
    };

    // Export
    const handleExport = () => {
        const file = buildLevelFile(cells, levelNumber, levelName || `Level ${levelNumber}`, totalCols);
        const json = JSON.stringify(file, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `level-${String(levelNumber).padStart(3, '0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => alert('Downloaded! Place the file in public/levels/ and add it to manifest.json'), 50);
    };

    // Import
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const lf = JSON.parse(ev.target!.result as string) as LevelFile;
                const map = new Map<CellKey, CellType>();
                for (const c of lf.cells) map.set(key(c.row, c.col), c.type);
                setCells(map);
                setScrollCol(0);
                setTotalCols(lf.cols ?? 100);
                setLevelNumber(lf.number ?? 1);
                setLevelName(lf.name ?? '');
            } catch { alert('Failed to parse level file.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Play
    const handlePlay = () => {
        const file = buildLevelFile(cells, levelNumber, levelName || `Level ${levelNumber}`, totalCols);
        setPlayLevelFile(file);
        setPlayOpen(true);
    };

    // Clear
    const handleClear = () => { if (confirm('Clear all tiles?')) setCells(new Map()); };

    const inputSx = {
        '& .MuiInputBase-root': { fontFamily: FONTS.NECTO_MONO, fontSize: '1.35rem', color: '#fff' },
        '& .MuiInputLabel-root': { color: '#ffd740', fontSize: '1.275rem' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#ffd740' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
    };

    const tooltipSx = {
        componentsProps: {
            tooltip: {
                sx: {
                    fontFamily: FONTS.NECTO_MONO,
                    fontSize: '0.85rem',
                    color: '#ffd740',
                    bgcolor: '#12121e',
                    border: '1px solid rgba(255,215,64,0.25)',
                    px: 1.5,
                    py: 0.75,
                },
            },
        },
    };

    const [colsInput, setColsInput] = useState(String(totalCols));

    // Keep colsInput in sync if totalCols changes externally (e.g. on import)
    useEffect(() => {
        setColsInput(String(totalCols));
    }, [totalCols]);

    const [levelNumberInput, setLevelNumberInput] = useState(String(levelNumber));

    useEffect(() => {
        setLevelNumberInput(String(levelNumber));
    }, [levelNumber]);

    return (
        <Box
            ref={editorRef}
            sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 272px)', overflowY: 'auto', bgcolor: '#090c0c', color: '#fff' }}>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: '#ffd740', fontSize: '1.1rem', letterSpacing: 2, whiteSpace: 'nowrap' }}>
                    Level Editor
                </Typography>

                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <RoleGuard roles="Admin">
                        <TextField
                            size="medium"
                            label="Level #"
                            type="number"
                            value={levelNumberInput}
                            onChange={e => setLevelNumberInput(e.target.value)}
                            onBlur={() => {
                                const clamped = Math.max(1, parseInt(levelNumberInput) || 1);
                                setLevelNumber(clamped);
                                setLevelNumberInput(String(clamped));
                            }}
                            sx={{ width: 150, ...inputSx }}
                            inputProps={{ min: 1 }}
                        />
                    </RoleGuard>
                    <TextField size="medium" label="Name" value={levelName}
                        onChange={e => setLevelName(e.target.value)}
                        placeholder={`Level ${levelNumber}`}
                        sx={{ width: 300, ...inputSx }} />
                    <TextField
                        size="medium"
                        label="Cols"
                        type="number"
                        value={colsInput}
                        onChange={e => setColsInput(e.target.value)}
                        onBlur={() => {
                            const clamped = Math.max(MIN_COLS, Math.min(MAX_COLS, parseInt(colsInput) || MIN_COLS));
                            setTotalCols(clamped);
                            setColsInput(String(clamped));
                        }}
                        sx={{ width: 150, ...inputSx }}
                        inputProps={{ min: MIN_COLS, max: MAX_COLS }}
                    />
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <ToggleButtonGroup
                    value={tool} exclusive
                    onChange={(_, v) => { if (v) setTool(v as Tool); }}
                    size="medium"
                    sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', px: 2, py: 0.75, fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' } }}
                >
                    <Tooltip title="Platform — any row above ground" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="platform" sx={{ '&.Mui-selected': { bgcolor: 'rgba(58,110,160,0.3) !important', color: '#78b4ff !important', borderColor: '#3a6ea0 !important' } }}>
                            <Box sx={{ width: 12, height: 4, bgcolor: '#3a6ea0', mr: 0.75, borderRadius: 0.25 }} />Platform
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Spike — ground or any platform row" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="spike" sx={{ '&.Mui-selected': { bgcolor: 'rgba(215,55,55,0.25) !important', color: '#ff7777 !important', borderColor: '#d73737 !important' } }}>
                            <Box component="span" sx={{ mr: 0.5 }}>▲</Box>Spike
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Pit / void — ground row only" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="pit" sx={{ '&.Mui-selected': { bgcolor: 'rgba(10,10,20,0.7) !important', color: 'rgba(255,255,255,0.7) !important', borderColor: 'rgba(100,100,150,0.5) !important' } }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: '#080810', border: '1px solid rgba(100,100,150,0.4)', mr: 0.75 }} />Pit
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Finish line — one per level, ground row only" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="finish" sx={{ '&.Mui-selected': { bgcolor: 'rgba(255,215,64,0.2) !important', color: '#ffd740 !important', borderColor: '#ffd740 !important' } }}>
                            <Box component="span" sx={{ mr: 0.5 }}>⚑</Box>Finish
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Eraser" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="eraser" sx={{ '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1) !important', color: '#fff !important', borderColor: 'rgba(255,255,255,0.3) !important' } }}>
                            ✕ Erase
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>

                <Box sx={{ flex: 1 }} />

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Clear all tiles" {...tooltipSx}>
                        <Button size="medium" startIcon={<DeleteOutlineIcon />} onClick={handleClear}
                            variant="outlined" sx={{ color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,100,100,0.2)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                            Clear
                        </Button>
                    </Tooltip>
                    <Tooltip title="Load a previously exported level JSON file into the editor" {...tooltipSx}>
                        <Button size="medium" component="label" htmlFor={importId} startIcon={<UploadIcon />}
                            variant="outlined" sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                            Import
                            <input id={importId} type="file" accept=".json" hidden onChange={handleImport} />
                        </Button>
                    </Tooltip>
                    <Tooltip title="Save to your browser's local storage — playable from the Level Select" {...tooltipSx}>
                        <Button size="medium" startIcon={<SaveIcon />} onClick={handleSave}
                            variant="outlined" sx={{ color: savedMsg ? '#4caf50' : '#ffd740', borderColor: savedMsg ? 'rgba(76,175,80,0.5)' : 'rgba(255,215,64,0.4)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', transition: 'color 0.2s, border-color 0.2s' }}>
                            {savedMsg ? 'Saved!' : 'Save'}
                        </Button>
                    </Tooltip>
                    <RoleGuard roles="Admin">
                        <Tooltip title="Download the level as a JSON file — add it to public/levels/ and manifest.json to include it as an official level" {...tooltipSx}>
                            <Button size="medium" startIcon={<DownloadIcon />} onClick={handleExport}
                                variant="outlined" sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                                Export
                            </Button>
                        </Tooltip>
                    </RoleGuard>
                    <Button size="medium" variant="contained" startIcon={<PlayArrowIcon />} onClick={handlePlay}
                        sx={{ bgcolor: '#ffd740', color: '#0a0a19', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', letterSpacing: 1, '&:hover': { bgcolor: '#e6c235' } }}>
                        Play
                    </Button>
                </Stack>
            </Box>

            {/* Canvas area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#060610' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1, pt: 2 }}>
                    <canvas
                        ref={canvasRef}
                        width={SW}
                        height={SH}
                        style={{ display: 'block', cursor: tool === 'eraser' ? 'crosshair' : 'cell', imageRendering: 'pixelated' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={() => { mouseInsideRef.current = true; }}
                    />
                </Box>

                {/* Scroll bar */}
                <Box sx={{ pb: 6, display: 'flex', justifyContent: 'center' }}>
                    <input type="range" min={0} max={Math.max(0, totalCols - MIN_COLS)} value={scrollCol}
                        onChange={e => setScrollCol(Number(e.target.value))}
                        style={{ width: SW, display: 'block', accentColor: '#ffd740', cursor: 'pointer' }} />
                </Box>
            </Box>

            {/* Status bar */}
            <Box sx={{ px: 2, py: 0.5, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                    {cells.size} tiles
                </Typography>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                    col {scrollCol}–{scrollCol + MIN_COLS - 1} / {totalCols - 1}
                </Typography>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: 'rgba(58,110,160,0.7)' }}>
                    rows 1–{GROUND_ROW - 1}: platforms
                </Typography>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', color: 'rgba(150,150,200,0.5)' }}>
                    row {GROUND_ROW}: ground
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                    scroll: mouse wheel or slider · paint: click / drag
                </Typography>
            </Box>

            {/* Play modal */}
            {playLevelFile && (
                <WasmGameContainer
                    open={playOpen}
                    onClose={() => setPlayOpen(false)}
                    gameTitle="The (Im)Possible Game — Preview"
                    wasmName="platformer"
                    levelFile={playLevelFile}
                    levelLabel={`Level ${levelNumber} — ${levelName || `Level ${levelNumber}`}`}
                />
            )}
        </Box>
    );
};

export default LevelEditorPage;
