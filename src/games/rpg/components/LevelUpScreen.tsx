import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { FONTS } from '../../../lib/globals';
import type { RPGGameState } from '../types';
import type { RPGStateActions } from '../hooks/useRPGState';

const STAT_LABELS: Record<string, string> = {
    str: 'Strength',
    vit: 'Vitality',
    foc: 'Focus',
    agi: 'Agility',
    dex: 'Dexterity',
    res: 'Resilience',
    per: 'Perception',
};

interface LevelUpScreenProps {
    state: RPGGameState;
    actions: RPGStateActions;
}

export default function LevelUpScreen({ state, actions }: LevelUpScreenProps) {
    const { battle, character } = state;
    const levelUps = battle.pendingLevelUps;

    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 30%, #1a2a1a 0%, #0a0a0a 70%)',
            px: 3,
            textAlign: 'center',
        }}>
            <Typography fontFamily={FONTS.POIRET_ONE} sx={{ fontSize: '2rem', color: '#a8d67e', mb: 1, textShadow: '0 0 20px #a8d67e44' }}>
                Level Up!
            </Typography>
            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a8a5a', fontSize: '0.7rem', mb: 3, letterSpacing: 2 }}>
                {character.name} — Level {character.level}
            </Typography>

            <Box sx={{ width: '100%', maxWidth: 360, mb: 3 }}>
                {levelUps.map((statKey, i) => (
                    <Box key={`${statKey}-${i}`} sx={{
                        mb: 1.5,
                        p: 1.5,
                        background: 'rgba(168,214,126,0.07)',
                        border: '1px solid #a8d67e33',
                        borderRadius: 2,
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#a8d67e', fontSize: '0.75rem' }}>
                                {STAT_LABELS[statKey] ?? statKey.toUpperCase()}
                            </Typography>
                            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c5e8a4', fontSize: '0.75rem' }}>
                                +1 → {character.stats[statKey as keyof typeof character.stats]}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={100}
                            sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#1a2a1a',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#a8d67e',
                                    borderRadius: 2,
                                    transition: 'transform 0.8s ease',
                                },
                            }}
                        />
                    </Box>
                ))}

                {levelUps.length === 0 && (
                    <Typography sx={{ color: '#3a5a3a', fontSize: '0.75rem' }}>
                        Stat experience gained — keep fighting!
                    </Typography>
                )}
            </Box>

            <Button
                onClick={() => actions.dismissLevelUp()}
                sx={{
                    px: 4,
                    py: 1.5,
                    background: 'rgba(168,214,126,0.12)',
                    border: '1px solid #a8d67e66',
                    borderRadius: 2,
                    color: '#a8d67e',
                    fontFamily: FONTS.NECTO_MONO,
                    fontSize: '0.85rem',
                    '&:hover': { background: 'rgba(168,214,126,0.22)' },
                }}
            >
                Continue
            </Button>
        </Box>
    );
}
