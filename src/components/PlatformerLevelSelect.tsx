import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FONTS } from '../lib/globals';
import {
    PLATFORMER_LEVELS,
    getHighestCompleted,
    isLevelUnlocked,
    type PlatformerLevel,
} from '../lib/data/PlatformerLevels';

interface PlatformerLevelSelectProps {
    open: boolean;
    onClose: () => void;
    onSelectLevel: (level: PlatformerLevel) => void;
}

const PlatformerLevelSelect = ({ open, onClose, onSelectLevel }: PlatformerLevelSelectProps) => {
    const [highestCompleted, setHighestCompleted] = useState(0);

    // Re-read unlock state every time the dialog opens
    useEffect(() => {
        if (open) setHighestCompleted(getHighestCompleted());
    }, [open]);

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
                    width: 640,
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 1.25,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                        sx={{
                            fontFamily: FONTS.ANTON,
                            color: '#ffd740',
                            fontSize: '1.15rem',
                            letterSpacing: 1,
                        }}
                    >
                        Platform Rush
                    </Typography>
                    <Box
                        sx={{
                            px: 0.8,
                            py: 0.15,
                            borderRadius: 0.75,
                            border: '1px solid rgba(100,180,255,0.5)',
                            bgcolor: 'rgba(100,180,255,0.08)',
                        }}
                    >
                        <Typography
                            sx={{
                                color: '#64b4ff',
                                fontSize: '0.65rem',
                                fontFamily: 'monospace',
                                letterSpacing: 1,
                            }}
                        >
                            C++ / WASM
                        </Typography>
                    </Box>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: 3 }}>
                {/* Section label */}
                <Typography
                    sx={{
                        fontFamily: FONTS.NECTO_MONO,
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.65rem',
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                        mb: 2.5,
                    }}
                >
                    Select Level
                </Typography>

                {/* Level grid */}
                <Grid container spacing={1.5}>
                    {PLATFORMER_LEVELS.map((level) => {
                        const unlocked = isLevelUnlocked(level.number);
                        const completed = highestCompleted >= level.number;

                        return (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={level.number}>
                                <Box
                                    onClick={() => unlocked && onSelectLevel(level)}
                                    sx={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 120,
                                        borderRadius: 1.5,
                                        border: completed
                                            ? '1px solid rgba(255,215,64,0.5)'
                                            : unlocked
                                                ? '1px solid rgba(255,255,255,0.15)'
                                                : '1px solid rgba(255,255,255,0.06)',
                                        bgcolor: unlocked
                                            ? 'rgba(255,255,255,0.04)'
                                            : 'rgba(0,0,0,0.2)',
                                        cursor: unlocked ? 'pointer' : 'default',
                                        transition: 'border-color 0.18s, background-color 0.18s, transform 0.12s',
                                        userSelect: 'none',
                                        ...(unlocked && {
                                            '&:hover': {
                                                bgcolor: 'rgba(255,215,64,0.07)',
                                                borderColor: 'rgba(255,215,64,0.6)',
                                                transform: 'translateY(-2px)',
                                            },
                                            '&:active': {
                                                transform: 'translateY(0)',
                                            },
                                        }),
                                    }}
                                >
                                    {/* Completed badge */}
                                    {completed && (
                                        <CheckCircleIcon
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                fontSize: 16,
                                                color: '#ffd740',
                                                opacity: 0.9,
                                            }}
                                        />
                                    )}

                                    {/* Lock icon overlay */}
                                    {!unlocked && (
                                        <LockIcon
                                            sx={{
                                                fontSize: 28,
                                                color: 'rgba(255,255,255,0.15)',
                                                mb: 0.5,
                                            }}
                                        />
                                    )}

                                    {/* Level number */}
                                    {unlocked && (
                                        <Typography
                                            sx={{
                                                fontFamily: FONTS.ANTON,
                                                fontSize: '2.4rem',
                                                lineHeight: 1,
                                                color: completed ? '#ffd740' : 'rgba(255,255,255,0.85)',
                                                mb: 0.5,
                                            }}
                                        >
                                            {level.number}
                                        </Typography>
                                    )}

                                    {/* Level name */}
                                    <Typography
                                        sx={{
                                            fontFamily: FONTS.NECTO_MONO,
                                            fontSize: '0.62rem',
                                            letterSpacing: 1.5,
                                            textTransform: 'uppercase',
                                            color: unlocked
                                                ? 'rgba(255,255,255,0.55)'
                                                : 'rgba(255,255,255,0.18)',
                                        }}
                                    >
                                        {unlocked ? level.name : `Level ${level.number}`}
                                    </Typography>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>

                {/* Hint */}
                <Typography
                    sx={{
                        mt: 3,
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.6rem',
                        letterSpacing: 1,
                        color: 'rgba(255,255,255,0.2)',
                        textAlign: 'center',
                    }}
                >
                    Complete a level to unlock the next
                </Typography>
            </DialogContent>
        </Dialog>
    );
};

export default PlatformerLevelSelect;
