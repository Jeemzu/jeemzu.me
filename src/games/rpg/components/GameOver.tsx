import { Box, Typography, Button } from '@mui/material';
import { FONTS } from '../../../lib/globals';
import type { RPGGameState } from '../types';
import type { RPGStateActions } from '../hooks/useRPGState';

interface GameOverProps {
    state: RPGGameState;
    actions: RPGStateActions;
}

export default function GameOver({ state, actions }: GameOverProps) {
    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 50%, #1a0a0a 0%, #050505 80%)',
            px: 3,
            textAlign: 'center',
        }}>
            {/* Ambient decorative lines */}
            <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(5)].map((_, i) => (
                    <Box key={i} sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${15 + i * 17}%`,
                        height: '1px',
                        background: 'rgba(200, 50, 50, 0.04)',
                    }} />
                ))}
            </Box>

            <Typography fontFamily={FONTS.PALACE} sx={{
                fontSize: '2.5rem',
                color: '#8a2020',
                mb: 1,
                textShadow: '0 0 30px #8a202055',
                letterSpacing: 3,
            }}>
                Fallen
            </Typography>

            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#5a2a2a', fontSize: '0.8rem', mb: 1 }}>
                {state.character.name} has been defeated.
            </Typography>

            <Typography sx={{ color: '#3a2020', fontSize: '0.72rem', mb: 4, maxWidth: 300, lineHeight: 1.8 }}>
                The darkness claims another soul. But the Ascent of Thrae remains — and so does your will.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                <Button
                    onClick={() => actions.respawn()}
                    sx={{
                        px: 4,
                        py: 1.5,
                        background: 'rgba(138,32,32,0.15)',
                        border: '1px solid #8a202066',
                        borderRadius: 2,
                        color: '#c05050',
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.85rem',
                        '&:hover': { background: 'rgba(138,32,32,0.28)' },
                    }}
                >
                    Return to Ascent of Thrae
                </Button>

                <Typography sx={{ color: '#2a1a1a', fontSize: '0.6rem', fontFamily: FONTS.NECTO_MONO }}>
                    You will respawn with 30% HP and Aura. Progress is saved.
                </Typography>
            </Box>
        </Box>
    );
}
