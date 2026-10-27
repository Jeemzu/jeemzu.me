import { useRef, useState, useCallback, useEffect, useId, useMemo, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import {
    Box, Button, Typography, TextField, Tooltip,
    ToggleButton, ToggleButtonGroup, Stack, Divider,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import {
    TILE, SW, SH, GROUND_ROW, MIN_COLS, MAX_COLS,
    isValidPlacement, parseLevelFile, type LevelFile, type CellType, type EditorTool,
} from '../../lib/LevelSchema';
import { GamePlayer } from '../../game-player/GamePlayerPage';
import { currentDpr, fitStage } from '../../game-player/fit';
import { getGameEntry } from '../../game-player/registry';
import type { ImpossibleOptions } from '../../games/impossible/levels';
import { drawEditor, cellKey as key, EDITOR_COLORS, type CellKey } from './drawEditor';
import { LevelDocument } from '../../lib/LevelDocument';
import { FONTS } from '../../lib/globals';
import { saveCustomLevel } from '../../utils/customLevels';
import { RoleGuard } from '../../components/shared/RoleGuard';
import { useAuthStore } from '../../stores/authStore';
import EditorAgentConnection from './EditorAgentConnection';

type Tool = EditorTool;
const playEntry = getGameEntry('impossible');

const LevelEditorPage = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [stage, setStage] = useState({ width: 0, height: 0, dpr: 1 });
    const editorRef = useRef<HTMLDivElement>(null);
    const mouseInsideRef = useRef(false);
    const [levelDocument] = useState(() => new LevelDocument());
    const snapshot = useSyncExternalStore(levelDocument.subscribe, levelDocument.getSnapshot);
    const { level, canUndo, canRedo } = snapshot;
    const { cols: totalCols, number: levelNumber, name: levelName } = level;
    const cells = useMemo(() => new Map<CellKey, CellType>(
        level.cells.map(cell => [key(cell.row, cell.col), cell.type]),
    ), [level.cells]);
    const [tool, setTool] = useState<Tool>('platform');
    const [scrollCol, setScrollCol] = useState(0);
    const [playLevelFile, setPlayLevelFile] = useState<LevelFile | null>(null);
    const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null);
    const [savedMsg, setSavedMsg] = useState(false);
    const importId = useId();

    const paintingRef = useRef(false);
    const scrollColRef = useRef(scrollCol);
    useEffect(() => { scrollColRef.current = scrollCol; }, [scrollCol]);
    const runAction = useCallback((action: () => void) => {
        try { action(); }
        catch (err) { toast.error(err instanceof Error ? err.message : String(err)); }
    }, []);

    useEffect(() => {
        setScrollCol(previous => Math.max(0, Math.min(totalCols - MIN_COLS, previous)));
    }, [totalCols]);

    // Fit the SW×SH stage into the available area; the backing store tracks CSS size × DPR.
    useEffect(() => {
        const area = stageRef.current;
        if (!area) return;
        const update = () => {
            const { width, height } = fitStage(area.clientWidth, area.clientHeight, { width: SW, height: SH });
            const dpr = currentDpr();
            setStage(prev => (prev.width === width && prev.height === height && prev.dpr === dpr ? prev : { width, height, dpr }));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(area);
        const mq = window.matchMedia(`(resolution: ${currentDpr()}dppx)`);
        mq.addEventListener('change', update);
        return () => { ro.disconnect(); mq.removeEventListener('change', update); };
    }, [stage.dpr]);

    // Redraw whenever state changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !stage.width) return;
        canvas.width = Math.round(stage.width * stage.dpr);
        canvas.height = Math.round(canvas.width * SH / SW);
        drawEditor(canvas, {
            cells,
            scrollCol,
            totalCols,
            tool,
            hoverRow: hoverPos?.row ?? null,
            hoverCol: hoverPos?.col ?? null,
        });
    }, [cells, scrollCol, totalCols, tool, hoverPos, stage]);

    // Mouse helpers
    const canvasRowCol = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scale = rect.width > 0 ? SW / rect.width : 1;
        const col = Math.floor(((e.clientX - rect.left) * scale) / TILE) + scrollCol;
        const row = Math.floor(((e.clientY - rect.top) * scale) / TILE);
        return { row, col };
    }, [scrollCol]);

    const applyTool = useCallback((row: number, col: number) => {
        if (col < 0 || col >= totalCols) return;
        if (!isValidPlacement(tool, row)) return;
        runAction(() => levelDocument.edit([tool === 'eraser'
            ? { op: 'erase_cells', cells: [{ row, col }] }
            : { op: 'set_cells', cells: [{ row, col, type: tool }] },
        ]));
    }, [tool, totalCols, levelDocument, runAction]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        paintingRef.current = true;
        levelDocument.beginStroke();
        const { row, col } = canvasRowCol(e);
        applyTool(row, col);
    }, [canvasRowCol, applyTool, levelDocument]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const { row, col } = canvasRowCol(e);
        setHoverPos(prev => (prev?.row === row && prev?.col === col ? prev : { row, col }));
        if (paintingRef.current) applyTool(row, col);
    }, [canvasRowCol, applyTool]);

    const handleMouseUp = useCallback(() => { paintingRef.current = false; levelDocument.endStroke(); }, [levelDocument]);
    const handleMouseLeave = useCallback(() => {
        handleMouseUp(); setHoverPos(null); mouseInsideRef.current = false;
    }, [handleMouseUp]);

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
    const handleSave = () => runAction(() => {
        const name = levelName.trim() || `My Level ${Date.now()}`;
        saveCustomLevel(name, totalCols, level.cells);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2500);
    });

    // Export
    const handleExport = () => {
        const file = { ...level, name: levelName || `Level ${levelNumber}` };
        const json = JSON.stringify(file, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `level-${String(levelNumber).padStart(3, '0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Level exported.');
    };

    // Import
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                if (typeof ev.target?.result !== 'string') throw new Error('Could not read level JSON.');
                const imported = parseLevelFile(JSON.parse(ev.target.result));
                const current = levelDocument.getSnapshot().level;
                if ((current.cells.length || current.name) && !confirm('Replace the current level?')) return;
                levelDocument.replace(imported);
                setScrollCol(0);
            } catch (err) { toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`); }
        };
        reader.onerror = () => toast.error('Could not read level file.');
        reader.readAsText(file);
        e.target.value = '';
    };

    // Play
    const handlePlay = () => {
        setPlayLevelFile({ ...level, name: levelName || `Level ${levelNumber}` });
    };
    const playOptions = useMemo<ImpossibleOptions | null>(
        () => (playLevelFile ? { level: { kind: 'draft', file: playLevelFile } } : null),
        [playLevelFile],
    );

    // Clear
    const handleClear = () => {
        if (confirm('Clear all tiles?')) runAction(() => levelDocument.edit([{ op: 'clear_cells' }]));
    };

    const inputSx = {
        '& .MuiInputBase-root': { fontFamily: FONTS.NECTO_MONO, fontSize: '1rem', color: '#fff' },
        '& .MuiInputLabel-root': { color: '#ffd740', fontSize: '0.95rem' },
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
        <>
        <Box
            ref={editorRef}
            sx={{ display: playOptions ? 'none' : 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--jz-nav-h, 64px))', overflow: 'hidden', bgcolor: '#080a0f', color: '#fff' }}>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, md: 3 }, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', flexShrink: 0 }}>
                <Typography component="h1" sx={{ display: { xs: 'none', lg: 'block' }, fontFamily: FONTS.NECTO_MONO, color: '#ffd740', fontSize: '1.1rem', letterSpacing: 2, whiteSpace: 'nowrap' }}>
                    Level Editor
                </Typography>

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' }, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <RoleGuard roles="Admin">
                        <TextField
                            size="small"
                            label="Level #"
                            type="number"
                            value={levelNumberInput}
                            onChange={e => setLevelNumberInput(e.target.value)}
                            onBlur={() => {
                                const clamped = Math.max(1, parseInt(levelNumberInput) || 1);
                                runAction(() => levelDocument.edit([{ op: 'set_metadata', number: clamped }]));
                                setLevelNumberInput(String(levelDocument.getSnapshot().level.number));
                            }}
                            sx={{ width: 110, ...inputSx }}
                            inputProps={{ min: 1 }}
                        />
                    </RoleGuard>
                    <TextField size="small" label="Name" value={levelName}
                        onChange={e => runAction(() => levelDocument.edit([{ op: 'set_metadata', name: e.target.value }]))}
                        placeholder={`Level ${levelNumber}`}
                        sx={{ width: { xs: 180, md: 260 }, ...inputSx }} />
                    <TextField
                        size="small"
                        label="Cols"
                        type="number"
                        value={colsInput}
                        onChange={e => setColsInput(e.target.value)}
                        onBlur={() => {
                            const clamped = Math.max(MIN_COLS, Math.min(MAX_COLS, parseInt(colsInput) || MIN_COLS));
                            runAction(() => {
                                const outside = level.cells.filter(cell => cell.col >= clamped).length;
                                if (outside && !confirm(`Crop ${outside} tiles outside the new width?`)) return;
                                levelDocument.edit([{ op: 'resize', cols: clamped, crop: outside > 0 }]);
                            });
                            setColsInput(String(levelDocument.getSnapshot().level.cols));
                        }}
                        sx={{ width: 110, ...inputSx }}
                        inputProps={{ min: MIN_COLS, max: MAX_COLS }}
                    />
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <ToggleButtonGroup
                    value={tool} exclusive
                    onChange={(_, v) => { if (v) setTool(v as Tool); }}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', px: 1.5, py: 0.5, fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' } }}
                >
                    <Tooltip title="Platform — any row above ground" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="platform" sx={{ '&.Mui-selected': { bgcolor: 'rgba(40,54,110,0.45) !important', color: '#a9b8ff !important', borderColor: '#5263b0 !important' } }}>
                            <Box sx={{ width: 12, height: 5, bgcolor: EDITOR_COLORS.platform, borderTop: `2px solid ${EDITOR_COLORS.finish}`, mr: 0.75 }} />Platform
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Spike — ground or any platform row" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="spike" sx={{ '&.Mui-selected': { bgcolor: 'rgba(196,42,64,0.25) !important', color: '#ff6878 !important', borderColor: `${EDITOR_COLORS.spike} !important` } }}>
                            <Box component="span" sx={{ mr: 0.5 }}>▲</Box>Spike
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Pit / void — ground row only" placement="bottom" {...tooltipSx}>
                        <ToggleButton value="pit" sx={{ '&.Mui-selected': { bgcolor: 'rgba(10,10,20,0.7) !important', color: 'rgba(255,255,255,0.7) !important', borderColor: 'rgba(100,100,150,0.5) !important' } }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: EDITOR_COLORS.pit, border: '1px solid rgba(100,100,150,0.4)', mr: 0.75 }} />Pit
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

                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <EditorAgentConnection context={{
                        document: levelDocument,
                        isAdmin: () => useAuthStore.getState().role === 'Admin',
                        isPainting: () => paintingRef.current,
                        getScrollCol: () => scrollColRef.current,
                        setScrollCol: col => {
                            const next = Math.max(0, Math.min(levelDocument.getSnapshot().level.cols - MIN_COLS, col));
                            scrollColRef.current = next;
                            setScrollCol(next);
                        },
                        render: col => {
                            const current = levelDocument.getSnapshot().level;
                            const canvas = document.createElement('canvas');
                            canvas.width = SW;
                            canvas.height = SH;
                            drawEditor(canvas, {
                                cells: new Map(current.cells.map(cell => [key(cell.row, cell.col), cell.type])),
                                totalCols: current.cols,
                                scrollCol: Math.max(0, Math.min(current.cols - MIN_COLS, col)),
                                tool: 'platform', hoverRow: null, hoverCol: null,
                            });
                            return canvas.toDataURL('image/png').split(',')[1];
                        },
                        confirm: message => window.confirm(message),
                    }} />
                    <Button disabled={!canUndo} onClick={() => runAction(() => { levelDocument.undo(); })}>Undo</Button>
                    <Button disabled={!canRedo} onClick={() => runAction(() => { levelDocument.redo(); })}>Redo</Button>
                    <Tooltip title="Clear all tiles" {...tooltipSx}>
                        <Button size="small" startIcon={<DeleteOutlineIcon />} onClick={handleClear}
                            variant="outlined" sx={{ color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,100,100,0.2)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                            Clear
                        </Button>
                    </Tooltip>
                    <Tooltip title="Load a previously exported level JSON file into the editor" {...tooltipSx}>
                        <Button size="small" component="label" htmlFor={importId} startIcon={<UploadIcon />}
                            variant="outlined" sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                            Import
                            <input id={importId} type="file" accept=".json" hidden onChange={handleImport} />
                        </Button>
                    </Tooltip>
                    <Tooltip title="Save to your browser's local storage — playable from the Level Select" {...tooltipSx}>
                        <Button size="small" startIcon={<SaveIcon />} onClick={handleSave}
                            variant="outlined" sx={{ color: savedMsg ? '#4caf50' : '#ffd740', borderColor: savedMsg ? 'rgba(76,175,80,0.5)' : 'rgba(255,215,64,0.4)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', transition: 'color 0.2s, border-color 0.2s' }}>
                            {savedMsg ? 'Saved!' : 'Save'}
                        </Button>
                    </Tooltip>
                    <RoleGuard roles="Admin">
                        <Tooltip title="Download the level as a JSON file — add it to public/levels/ and manifest.json to include it as an official level" {...tooltipSx}>
                            <Button size="small" startIcon={<DownloadIcon />} onClick={handleExport}
                                variant="outlined" sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem' }}>
                                Export
                            </Button>
                        </Tooltip>
                    </RoleGuard>
                    <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={handlePlay}
                        sx={{ bgcolor: '#ffd740', color: '#0a0a19', fontFamily: FONTS.NECTO_MONO, fontSize: '0.85rem', letterSpacing: 1, '&:hover': { bgcolor: '#e6c235' } }}>
                        Play
                    </Button>
                </Stack>
            </Box>

            {/* Canvas area */}
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, px: { xs: 2, md: 3 }, py: 2, bgcolor: '#060610' }}>
                <Box ref={stageRef} sx={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <canvas
                        ref={canvasRef}
                        style={{ display: 'block', width: stage.width, height: stage.height, cursor: tool === 'eraser' ? 'crosshair' : 'cell', boxShadow: '0 0 0 1px rgba(255,204,80,0.18)' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={() => { mouseInsideRef.current = true; }}
                    />
                </Box>

                {/* Scroll bar */}
                <Box sx={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    <input type="range" aria-label="Scroll level" min={0} max={Math.max(0, totalCols - MIN_COLS)} value={scrollCol}
                        onChange={e => setScrollCol(Number(e.target.value))}
                        style={{ width: stage.width || '100%', display: 'block', accentColor: '#ffcc50', cursor: 'pointer', margin: 0 }} />
                </Box>
            </Box>

            {/* Status bar */}
            <Box sx={{ px: { xs: 2, md: 3 }, py: 0.75, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
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
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                    scroll: mouse wheel or slider · paint: click / drag
                </Typography>
            </Box>
        </Box>
        {playOptions && playEntry && (
            <GamePlayer
                entry={playEntry}
                initialOptions={playOptions}
                autoStart
                onExit={() => setPlayLevelFile(null)}
                exitLabel="Back to Editor"
            />
        )}
        </>
    );
};

export default LevelEditorPage;
