import { TILE, SW, SH, ROWS, GROUND_ROW, isValidPlacement, type CellType, type EditorTool } from '../../lib/LevelSchema';

/** Starfield-noir palette shared with the in-game renderer (cpp/platformer/main.cpp). */
export const EDITOR_COLORS: Record<CellType, string> = {
    platform: '#28366e',
    spike: '#c42a40',
    pit: '#020308',
    finish: '#ffcc50',
};

const HOVER: Record<CellType, string> = {
    platform: 'rgba(40,54,110,0.65)',
    spike: 'rgba(196,42,64,0.55)',
    pit: 'rgba(2,3,8,0.85)',
    finish: 'rgba(255,204,80,0.45)',
};

const GOLD = '#ffcc50';

export type CellKey = `${number},${number}`;
export const cellKey = (row: number, col: number): CellKey => `${row},${col}`;

export interface DrawParams {
    cells: Map<CellKey, CellType>;
    scrollCol: number;
    totalCols: number;
    tool: EditorTool;
    hoverRow: number | null;
    hoverCol: number | null;
}

function spike(ctx: CanvasRenderingContext2D, sx: number, row: number) {
    const tipX = sx + TILE / 2;
    const baseY = (row + 1) * TILE;
    const tipY = row * TILE + 8;
    ctx.fillStyle = EDITOR_COLORS.spike;
    ctx.beginPath();
    ctx.moveTo(sx + 2, baseY); ctx.lineTo(tipX, tipY); ctx.lineTo(sx + TILE - 2, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,104,104,0.55)';
    ctx.beginPath();
    ctx.moveTo(sx + 2, baseY); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX, baseY);
    ctx.closePath(); ctx.fill();
}

/** Draws one SW×SH view of the level. The canvas may be any multiple of SW×SH (device-pixel backing store). */
export function drawEditor(canvas: HTMLCanvasElement, p: DrawParams) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const k = canvas.width / SW;
    ctx.setTransform(k, 0, 0, k, 0, 0);

    const visibleCols = Math.ceil(SW / TILE) + 1;
    const startCol = p.scrollCol;
    const groundY = GROUND_ROW * TILE;

    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#04060f');
    sky.addColorStop(1, '#161c42');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SW, SH);

    ctx.fillStyle = '#070916';
    ctx.fillRect(0, groundY + TILE, SW, SH - groundY - TILE);
    ctx.fillStyle = '#141a3a';
    ctx.fillRect(0, groundY, SW, TILE);

    for (let c = startCol; c < startCol + visibleCols; c++) {
        const sx = (c - startCol) * TILE;
        const ground = p.cells.get(cellKey(GROUND_ROW, c));

        if (ground === 'pit') {
            ctx.fillStyle = EDITOR_COLORS.pit;
            ctx.fillRect(sx, groundY, TILE, SH - groundY);
        }

        for (let r = 1; r < GROUND_ROW; r++) {
            const cell = p.cells.get(cellKey(r, c));
            if (cell === 'platform') {
                ctx.fillStyle = EDITOR_COLORS.platform;
                ctx.fillRect(sx, r * TILE, TILE, TILE);
                ctx.fillStyle = GOLD;
                ctx.fillRect(sx, r * TILE, TILE, 2);
            }
            if (cell === 'spike') spike(ctx, sx, r);
        }

        if (ground === 'spike') spike(ctx, sx, GROUND_ROW);

        if (ground === 'finish') {
            ctx.fillStyle = 'rgba(255,204,80,0.22)';
            ctx.fillRect(sx, 0, TILE, groundY);
            ctx.fillStyle = GOLD;
            ctx.fillRect(sx, 0, 3, groundY);
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

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= visibleCols; c++) {
        const sx = c * TILE;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, SH); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(SW, r * TILE); ctx.stroke();
    }

    // Ground rim, broken by pits like the in-game surface.
    ctx.fillStyle = GOLD;
    for (let c = startCol; c < startCol + visibleCols; c++) {
        if (p.cells.get(cellKey(GROUND_ROW, c)) !== 'pit') ctx.fillRect((c - startCol) * TILE, groundY - 1, TILE, 2);
    }

    // Column ruler
    ctx.fillStyle = 'rgba(4,6,15,0.9)';
    ctx.fillRect(0, 0, SW, 16);
    ctx.font = '9px monospace';
    for (let c = startCol; c < startCol + visibleCols; c++) {
        if (c % 5 === 0) {
            const sx = (c - startCol) * TILE;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(String(c), sx + 2, 11);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.moveTo(sx, 12); ctx.lineTo(sx, 16); ctx.stroke();
        }
    }

    // Player spawn indicator
    const spawnCol = 3;
    if (spawnCol >= startCol && spawnCol < startCol + visibleCols) {
        const sx = (spawnCol - startCol) * TILE;
        ctx.fillStyle = 'rgba(255,204,80,0.35)';
        ctx.fillRect(sx, groundY - TILE, TILE, TILE);
        ctx.fillStyle = 'rgba(255,204,80,0.8)';
        ctx.font = '9px monospace';
        ctx.fillText('P', sx + 12, groundY - 12);
    }

    if (p.hoverRow !== null && p.hoverCol !== null) {
        const sx = (p.hoverCol - startCol) * TILE;
        const sy = p.hoverRow * TILE;
        if (isValidPlacement(p.tool, p.hoverRow) && p.tool !== 'eraser') {
            ctx.fillStyle = HOVER[p.tool];
            ctx.fillRect(sx, sy, TILE, TILE);
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
        }
    }

    const endCol = p.totalCols - 1;
    if (endCol >= startCol && endCol < startCol + visibleCols) {
        const sx = (endCol - startCol) * TILE;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(sx + TILE, 0); ctx.lineTo(sx + TILE, SH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px monospace';
        ctx.fillText('END', sx + TILE - 24, 28);
    }
}
