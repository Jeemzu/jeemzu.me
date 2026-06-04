import { useState } from 'react';
import { Box, Typography, Button, IconButton, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FONTS } from '../../../lib/globals';
import { hasSave, deleteSave } from '../hooks/useSaveLoad';
import RPGGame from './RPGGame';

interface RPGContainerProps {
    open: boolean;
    onClose: () => void;
}

type RPGContainerScreen = 'mainMenu' | 'playing';

export default function RPGContainer({ open, onClose }: RPGContainerProps) {
    const [screen, setScreen] = useState<RPGContainerScreen>('mainMenu');
    const [saveExists, setSaveExists] = useState(() => hasSave());

    function handleNewGame() {
        if (saveExists) {
            // Delete existing save and start fresh
            deleteSave();
            setSaveExists(false);
        }
        setScreen('playing');
    }

    function handleContinue() {
        if (!saveExists) return;
        setScreen('playing');
    }

    function handleClose() {
        setScreen('mainMenu');
        setSaveExists(hasSave());
        onClose();
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullScreen
            PaperProps={{
                sx: {
                    background: '#0a0a0a',
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Close button */}
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 100,
                        color: '#4a6a5a',
                        '&:hover': { color: '#a8d67e', background: 'rgba(168,214,126,0.08)' },
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Main Menu */}
                {screen === 'mainMenu' && (
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'radial-gradient(ellipse at 50% 40%, #0e1a0e 0%, #050505 70%)',
                        px: 3,
                        textAlign: 'center',
                    }}>
                        {/* Subtle grid bg */}
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'linear-gradient(rgba(168,214,126,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,214,126,0.03) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                            pointerEvents: 'none',
                        }} />

                        {/* Logo / title */}
                        <Box sx={{ position: 'relative', mb: 2 }}>
                            <Typography fontFamily={FONTS.POIRET_ONE} sx={{
                                fontSize: { xs: '2.5rem', md: '4rem' },
                                color: '#a8d67e',
                                textShadow: '0 0 40px #a8d67e33, 0 0 80px #a8d67e11',
                                letterSpacing: 3,
                                lineHeight: 1.1,
                            }}>
                                The Progenitors
                            </Typography>
                        </Box>

                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{
                            color: '#3a5a4a',
                            fontSize: '0.65rem',
                            letterSpacing: 4,
                            mb: 1,
                            textTransform: 'uppercase',
                        }}>
                            A turn-based RPG
                        </Typography>

                        <Typography sx={{
                            color: '#2a3a2a',
                            fontSize: '0.78rem',
                            maxWidth: 420,
                            lineHeight: 1.8,
                            mb: 5,
                        }}>
                            You are a Progenitor — one of the ancient warriors who shape reality through Spirit Aura.
                            Descend into the Undercroft. Face the Hollow Colossus. Carve your name into the Ascent of Thrae.
                        </Typography>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 300 }}>
                            <Button
                                onClick={handleNewGame}
                                sx={{
                                    py: 1.8,
                                    background: 'rgba(168,214,126,0.1)',
                                    border: '1px solid #a8d67e55',
                                    borderRadius: 2,
                                    color: '#a8d67e',
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.85rem',
                                    letterSpacing: 2,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { background: 'rgba(168,214,126,0.2)', borderColor: '#a8d67e99' },
                                }}
                            >
                                {saveExists ? 'New Game' : 'Begin'}
                            </Button>

                            <Button
                                onClick={handleContinue}
                                disabled={!saveExists}
                                sx={{
                                    py: 1.8,
                                    background: saveExists ? 'rgba(74,181,232,0.08)' : 'transparent',
                                    border: `1px solid ${saveExists ? '#4ab5e855' : '#1a2a2a'}`,
                                    borderRadius: 2,
                                    color: saveExists ? '#4ab5e8' : '#2a3a3a',
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '0.85rem',
                                    letterSpacing: 2,
                                    '&:hover:not(.Mui-disabled)': { background: 'rgba(74,181,232,0.16)' },
                                    '&.Mui-disabled': { color: '#1a2a2a', border: '1px solid #1a1a1a' },
                                }}
                            >
                                Continue
                            </Button>
                        </Box>

                        {saveExists && (
                            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ mt: 3, color: '#2a4a2a', fontSize: '0.58rem', letterSpacing: 1 }}>
                                New Game will erase your existing save.
                            </Typography>
                        )}

                        {/* Lore bar at bottom */}
                        <Box sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
                            <Typography sx={{ color: '#1a2a1a', fontSize: '0.6rem', fontFamily: FONTS.NECTO_MONO, letterSpacing: 2 }}>
                                SPIRIT AURA · FLAME · PHOTON · MINERAL
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Game */}
                {screen === 'playing' && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                        <RPGGame onExit={handleClose} />
                    </Box>
                )}
            </Box>
        </Dialog>
    );
}
