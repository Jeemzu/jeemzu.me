import { useState } from 'react';
import { Box, Typography, Button, IconButton, Fade, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuthStore } from '../../stores/authStore';
import { FONTS } from '../../lib/globals';
import UserAuthModal, { type AuthTab } from './UserAuthModal';

const DISMISS_KEY = 'auth_prompt_dismissed';

/**
 * A compact card that appears in the bottom-right corner when the user visits
 * the Games page without being signed in. Shown once per session.
 */
const AuthPromptToast = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem(DISMISS_KEY) === 'true',
    );
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authTab, setAuthTab] = useState<AuthTab>('register');

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, 'true');
        setDismissed(true);
    };

    const openModal = (tab: AuthTab) => {
        setAuthTab(tab);
        setAuthModalOpen(true);
    };

    const visible = !isAuthenticated && !dismissed;

    return (
        <>
            <Fade in={visible} timeout={600}>
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1200,
                        width: 300,
                        bgcolor: 'rgba(15, 20, 30, 0.97)',
                        border: '1px solid rgba(168, 214, 126, 0.25)',
                        borderRadius: 2,
                        p: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(168,214,126,0.06)',
                        backdropFilter: 'blur(12px)',
                        pointerEvents: visible ? 'auto' : 'none',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <EmojiEventsIcon sx={{ color: 'primaryGreen.main', fontSize: '1.2rem' }} />
                            <Typography
                                variant="body2"
                                sx={{ fontFamily: FONTS.NECTO_MONO, color: 'white', fontWeight: 600 }}
                            >
                                Track Your Scores
                            </Typography>
                        </Stack>
                        <IconButton
                            onClick={handleDismiss}
                            size="small"
                            sx={{ color: 'rgba(255,255,255,0.3)', mt: -0.5, mr: -0.5 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.55)',
                            fontFamily: FONTS.NECTO_MONO,
                            mb: 1.5,
                            lineHeight: 1.6,
                        }}
                    >
                        Create a free account to save your personal bests and see where you rank on the global leaderboard.
                    </Typography>

                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => openModal('register')}
                            sx={{
                                flex: 1,
                                bgcolor: 'primaryGreen.main',
                                color: 'darkBackground.main',
                                fontFamily: FONTS.NECTO_MONO,
                                fontSize: '0.75rem',
                                '&:hover': { bgcolor: 'softGreen.main' },
                            }}
                        >
                            Sign Up
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => openModal('login')}
                            sx={{
                                flex: 1,
                                borderColor: 'rgba(168,214,126,0.4)',
                                color: 'primaryGreen.main',
                                fontFamily: FONTS.NECTO_MONO,
                                fontSize: '0.75rem',
                                '&:hover': {
                                    borderColor: 'primaryGreen.main',
                                    bgcolor: 'rgba(168,214,126,0.06)',
                                },
                            }}
                        >
                            Sign In
                        </Button>
                    </Stack>
                </Box>
            </Fade>

            <UserAuthModal
                open={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                defaultTab={authTab}
            />
        </>
    );
};

export default AuthPromptToast;
