import { Box, Typography, Button, Stack } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { FONTS } from '../../lib/globals';
import type { GameStat } from '../../lib/GameTypes';

interface GameOverOverlayProps {
    score: number;
    stats?: GameStat[];
    personalBest: number;
    allTimeHigh: { score: number; username: string } | null;
    onRetry: () => void;
    onBackToMenu: () => void;
}

export function GameOverOverlay({ score, stats = [], personalBest, allTimeHigh, onRetry, onBackToMenu }: GameOverOverlayProps) {
    return (
        <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10, bgcolor: 'rgba(8,8,12,0.97)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, overflowY: 'auto', py: 6,
        }}>
            <Typography variant="h2" sx={{ color: 'white', fontFamily: FONTS.NECTO_MONO, textAlign: 'center' }}>
                Game Over!
            </Typography>

            <Typography variant="h4" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.NECTO_MONO, textAlign: 'center' }}>
                Score: {score.toLocaleString()}
            </Typography>

            {stats.length > 0 && (
                <Stack direction="row" spacing={3}>
                    {stats.map(({ label, value }) => (
                        <Box key={label} sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.NECTO_MONO, display: 'block', letterSpacing: 1 }}>
                                {label.toUpperCase()}
                            </Typography>
                            <Typography variant="h6" sx={{ color: 'white', fontFamily: FONTS.NECTO_MONO }}>
                                {typeof value === 'number' ? value.toLocaleString() : value}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            )}

            {(personalBest > 0 || allTimeHigh) && (
                <Stack direction="row" spacing={3}>
                    {personalBest > 0 && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.NECTO_MONO, display: 'block', letterSpacing: 1 }}>
                                YOUR BEST
                            </Typography>
                            <Typography variant="h6" sx={{ color: 'white', fontFamily: FONTS.NECTO_MONO }}>
                                {personalBest.toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                    {allTimeHigh && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <EmojiEventsIcon sx={{ color: '#ffd700', fontSize: '0.9rem' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.NECTO_MONO, letterSpacing: 1 }}>
                                    ALL-TIME HIGH
                                </Typography>
                            </Stack>
                            <Typography variant="h6" sx={{ color: '#ffd700', fontFamily: FONTS.NECTO_MONO }}>
                                {allTimeHigh.score.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO }}>
                                {allTimeHigh.username}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button variant="contained" onClick={onRetry}
                    sx={{ bgcolor: 'primaryGreen.main', color: 'darkBackground.main', fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', px: 4, py: 1.5, '&:hover': { bgcolor: 'primaryGreen.light', transform: 'translateY(-2px)' } }}>
                    Retry
                </Button>
                <Button variant="outlined" onClick={onBackToMenu}
                    sx={{ borderColor: 'white', color: 'white', fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', px: 4, py: 1.5, '&:hover': { borderColor: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.05)', transform: 'translateY(-2px)' } }}>
                    Back to Menu
                </Button>
            </Stack>
        </Box>
    );
}
