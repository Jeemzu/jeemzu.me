import theme from '../../themes';
import { MEDIEVAL_EFFECTS } from '../../lib/globals';

const { medievalGold, medievalStone, parchment, glassSapphire, glassEmerald, glassRuby, glassAmethyst } = theme.palette;

export const VIZ_COLORS = {
    gold: medievalGold.light,
    blue: glassSapphire.light,
    green: glassEmerald.light,
    softGreen: '#b4e4cc',
    red: glassRuby.light,
    violet: glassAmethyst.light,
    background: medievalStone.dark,
    surface: medievalStone.main,
    text: parchment.light,
    muted: '#b3b8c6',
} as const;

export const panelSx = {
    border: MEDIEVAL_EFFECTS.FRAME_BORDER,
    borderRadius: '6px',
    bgcolor: VIZ_COLORS.background,
    backgroundImage: `radial-gradient(ellipse at 50% 0%, ${VIZ_COLORS.blue}20, transparent 65%), ${MEDIEVAL_EFFECTS.PANEL_BG}`,
    boxShadow: `${MEDIEVAL_EFFECTS.PANEL_SHADOW}, 0 0 26px ${VIZ_COLORS.blue}10`,
} as const;

export const choiceSx = {
    ...panelSx,
    position: 'relative',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: MEDIEVAL_EFFECTS.TRANSITION,
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: 4,
        border: `1px solid ${VIZ_COLORS.gold}12`,
        borderRadius: '3px',
        pointerEvents: 'none',
        backgroundImage: `linear-gradient(110deg, transparent 20%, ${VIZ_COLORS.blue}0c 40%, ${VIZ_COLORS.gold}14 50%, transparent 70%)`,
        backgroundSize: '260% 100%',
        backgroundPosition: '-70% 0',
    },
    '&:hover': {
        borderColor: VIZ_COLORS.gold,
        backgroundImage: `radial-gradient(ellipse at 50% 0%, ${VIZ_COLORS.blue}38, transparent 80%), ${MEDIEVAL_EFFECTS.PANEL_BG}`,
        boxShadow: `${MEDIEVAL_EFFECTS.PANEL_SHADOW_HOVER}, 0 0 22px ${VIZ_COLORS.blue}30`,
        transform: 'translateY(-2px)',
    },
    '&:hover::before': { animation: 'jz-gleam 7s ease-in-out infinite' },
    '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': { transform: 'none' },
        '&:hover::before': { animation: 'none' },
    },
} as const;

export const ctrlBtn = {
    color: VIZ_COLORS.gold,
    border: `1px solid ${VIZ_COLORS.gold}40`,
    borderRadius: '6px',
    '&:hover': {
        color: VIZ_COLORS.text,
        bgcolor: `${VIZ_COLORS.blue}20`,
        boxShadow: `inset 0 0 12px ${VIZ_COLORS.blue}20, 0 0 12px ${VIZ_COLORS.gold}20`,
    },
    '&.Mui-disabled': { color: '#626a7a', borderColor: '#626a7a40' },
} as const;
