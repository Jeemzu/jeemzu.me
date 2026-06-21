import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Typography,
    Button,
    Slider,
    Stack,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import Phaser from 'phaser';
import { FONTS } from '../lib/globals';
import { saveHighScore, getHighScores, getGameSummary } from '../utils/gameApi';
import type { GameHighScore, GameStat } from '../lib/GameTypes';
import { useAuthStore } from '../stores/authStore';
import { GameOverOverlay } from './shared/GameOverOverlay';

interface GameContainerProps {
    open: boolean;
    onClose: () => void;
    gameTitle: string;
    gameId?: string;
    gameConfig: Omit<Phaser.Types.Core.GameConfig, 'parent'>;
    onScoreUpdate?: (score: number) => void;
    showColorOption?: boolean;
}

type MenuState = 'start' | 'options' | 'playing' | 'leaderboard';

const GameContainer = ({
    open,
    onClose,
    gameTitle,
    gameId,
    gameConfig,
    onScoreUpdate,
    showColorOption = false,
}: GameContainerProps) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    /** Set to true in the gameOver event handler when the player beats their personal best.
     *  A useEffect watches this flag and fires the score submission automatically. */
    const autoSubmitRef = useRef(false);
    /** Mirror of highScore state, readable inside Phaser callbacks without stale-closure issues. */
    const highScoreRef = useRef(0);
    /** Mirror of currentScore state, readable inside effects without stale-closure issues. */
    const currentScoreRef = useRef(0);
    /** Mirror of allTimeHigh state so the Phaser gameOver callback can compare without stale closures. */
    const allTimeHighRef = useRef<{ score: number; username: string } | null>(null);
    /** Mirror of authUsername so the Phaser gameOver callback can read it without stale closures. */
    const authUsernameRef = useRef<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [containerReady, setContainerReady] = useState(false);
    const [menuState, setMenuState] = useState<MenuState>('start');
    const [volume, setVolume] = useState(0.5);
    const [primaryColor, setPrimaryColor] = useState('#a8d67e');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [leaderboardScores, setLeaderboardScores] = useState<GameHighScore[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [allTimeHigh, setAllTimeHigh] = useState<{ score: number; username: string } | null>(null);
    const [isNewAllTimeHigh, setIsNewAllTimeHigh] = useState(false);
    const [gameOverStats, setGameOverStats] = useState<GameStat[]>([]);
    const [showSubmitFailModal, setShowSubmitFailModal] = useState(false);
    const [failedScore, setFailedScore] = useState(0);
    const authUsername = useAuthStore((s) => s.username);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    // Keep highScoreRef in sync so Phaser event callbacks can compare without stale state
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    // Keep currentScoreRef in sync so effects can read the latest score without stale closures
    useEffect(() => { currentScoreRef.current = currentScore; }, [currentScore]);
    // Keep allTimeHighRef and authUsernameRef in sync for use inside Phaser callbacks
    useEffect(() => { allTimeHighRef.current = allTimeHigh; }, [allTimeHigh]);
    useEffect(() => { authUsernameRef.current = authUsername ?? null; }, [authUsername]);

    // Fetch both all-time high and personal best in a single /summary call when the modal opens.
    // The endpoint returns personalBest only when an auth token is present.
    // On close, reset scores and leaderboard cache so data is always fresh on next open.
    useEffect(() => {
        if (!open) {
            setAllTimeHigh(null);
            setLeaderboardScores([]);
            setHighScore(0);
            highScoreRef.current = 0;
            return;
        }
        const gid = (gameId ?? gameTitle.toLowerCase().replace(/\s+/g, '')).toLowerCase();
        getGameSummary(gid)
            .then(summary => {
                setAllTimeHigh(summary.allTimeHigh);
                setHighScore(summary.personalBest);
                highScoreRef.current = summary.personalBest;
            })
            .catch(() => {
                setAllTimeHigh(null);
                setHighScore(0);
                highScoreRef.current = 0;
            });
    }, [open, isAuthenticated, gameId, gameTitle]);

    // Auto-submit when a new personal best is set and the user is signed in
    useEffect(() => {
        if (!gameOver || !isAuthenticated || !autoSubmitRef.current) return;
        autoSubmitRef.current = false;
        void (async () => {
            const ok = await handleSubmitScore();
            if (ok) {
                // Invalidate leaderboard cache so it re-fetches on next view
                setLeaderboardScores([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameOver, isAuthenticated]);

    // Reset containerReady and menu state when dialog closes
    useEffect(() => {
        if (!open) {
            setContainerReady(false);
            setMenuState('start');
        }
    }, [open]);

    // Create Phaser game once container is ready and game is started
    useEffect(() => {
        if (open && containerReady && containerRef.current && !gameRef.current && menuState === 'playing') {

            const config: Phaser.Types.Core.GameConfig = {
                ...gameConfig,
                parent: containerRef.current,
                callbacks: {
                    postBoot: (game) => {
                        // Set up event listeners for game events
                        game.events.on('scoreUpdate', (score: number) => {
                            setCurrentScore(score);
                            onScoreUpdate?.(score);
                        });
                        game.events.on('gameOver', (payload: number | { score: number; stats?: GameStat[] }) => {
                            const finalScore = typeof payload === 'number' ? payload : payload.score;
                            const stats = typeof payload === 'number' ? [] : (payload.stats ?? []);
                            setGameOverStats(stats);
                            setGameOver(true);
                            // Compare against the DB personal best (via ref to avoid stale closure)
                            if (finalScore > highScoreRef.current) {
                                setHighScore(finalScore); // optimistic display update
                                highScoreRef.current = finalScore;
                                autoSubmitRef.current = true;
                            }
                            // Check for new all-time high and update display immediately (no API delay)
                            const prevAllTimeHigh = allTimeHighRef.current?.score ?? 0;
                            if (finalScore > prevAllTimeHigh) {
                                setIsNewAllTimeHigh(true);
                                setAllTimeHigh({ score: finalScore, username: authUsernameRef.current ?? 'you' });
                            }
                        });

                        // Pass game settings to the scene
                        const scene = game.scene.scenes[0];
                        if (scene && scene.registry) {
                            scene.registry.set('volume', volume);
                            scene.registry.set('primaryColor', primaryColor);
                            scene.registry.set('difficulty', difficulty);
                        }

                        // Initialize scene with difficulty
                        if (scene && scene.scene) {
                            scene.scene.restart({ difficulty });
                        }
                    },
                },
            };

            gameRef.current = new Phaser.Game(config);
        }

        // Cleanup when dialog closes
        return () => {
            if (!open && gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
                setGameOver(false);
                setCurrentScore(0);
                setIsPaused(false);
            }
        };
    }, [open, containerReady, gameConfig, onScoreUpdate, menuState, volume, primaryColor]);

    const handlePauseResume = () => {
        if (gameRef.current) {
            const scene = gameRef.current.scene.scenes[0];
            if (scene) {
                if (isPaused) {
                    scene.scene.resume();
                    scene.tweens.resumeAll();
                    scene.time.paused = false;
                    scene.sound.resumeAll();
                } else {
                    scene.scene.pause();
                    scene.tweens.pauseAll();
                    scene.time.paused = true;
                    scene.sound.pauseAll();
                }
                setIsPaused(!isPaused);
            }
        }
    };

    const handleRestart = () => {
        if (gameRef.current) {
            const scene = gameRef.current.scene.scenes[0];
            if (scene) {
                scene.scene.restart();
                setGameOver(false);
                setCurrentScore(0);
                setIsPaused(false);
                setIsNewAllTimeHigh(false);
                autoSubmitRef.current = false;
            }
        }
    };

    const handleBackToMenuFromGame = () => {
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        setIsNewAllTimeHigh(false);
        autoSubmitRef.current = false;
        setMenuState('start');
    };

    const handleSubmitScore = async (): Promise<boolean> => {
        const resolvedGameId = gameId ?? gameTitle.toLowerCase().replace(/\s+/g, '');
        const scoreToSubmit = currentScoreRef.current;
        const result = await saveHighScore(resolvedGameId, scoreToSubmit);
        if (!result.success) {
            setFailedScore(scoreToSubmit);
            setShowSubmitFailModal(true);
            return false;
        }
        return true;
    };

    const handleShowLeaderboard = async () => {
        setMenuState('leaderboard');
        setLeaderboardLoading(true);
        try {
            const gid = (gameId ?? gameTitle.toLowerCase().replace(/\s+/g, '')).toLowerCase();
            setLeaderboardScores(await getHighScores(gid, 10));
        } catch { /* silently fail */ } finally {
            setLeaderboardLoading(false);
        }
    };



    const handleClose = () => {
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        setMenuState('start');
        onClose();
    };

    const handleStartGame = () => {
        setMenuState('playing');
        setContainerReady(true);
    };

    const handleOpenOptions = () => {
        setMenuState('options');
    };

    const handleBackToMenu = () => {
        setMenuState('start');
    };

    const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
        const newVolume = newValue as number;
        setVolume(newVolume);

        // Update volume in running game immediately
        if (gameRef.current) {
            const scene = gameRef.current.scene.scenes[0];
            if (scene && scene.registry) {
                scene.registry.set('volume', newVolume);
                // Emit a custom event so the scene can react to volume changes
                scene.events.emit('volumeChange', newVolume);
            }
        }
    };

    const handleDifficultyToggle = () => {
        const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
        const currentIndex = difficulties.indexOf(difficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        setDifficulty(difficulties[nextIndex]);
    };

    const colorOptions = [
        { name: 'Green', value: '#a8d67e' },
        { name: 'Blue', value: '#7eb6d6' },
        { name: 'Purple', value: '#b67ed6' },
        { name: 'Orange', value: '#d6a87e' },
        { name: 'Pink', value: '#d67eb6' },
        { name: 'Red', value: '#d67e7e' },
    ];

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="lg"
                fullWidth
                TransitionProps={{
                    onEntered: () => {
                        setContainerReady(true);
                    },
                }}
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(145deg, #0d1117 0%, #111827 100%)',
                        minHeight: '80vh',
                        border: '1px solid rgba(168, 214, 126, 0.2)',
                        boxShadow: '0 0 60px rgba(168, 214, 126, 0.08), 0 24px 80px rgba(0,0,0,0.95)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: 'rgba(0,0,0,0.4)',
                        color: 'white',
                        borderBottom: '1px solid rgba(168, 214, 126, 0.15)',
                        backgroundImage: 'linear-gradient(90deg, rgba(168, 214, 126, 0.06) 0%, transparent 60%)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4" sx={{ fontFamily: FONTS.NECTO_MONO }}>{gameTitle}</Typography>
                        <Typography variant="h6" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.NECTO_MONO }}>
                            Score: {currentScore}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {menuState === 'playing' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                                <IconButton
                                    onClick={() => setVolume(v => {
                                        const newVal = Math.max(0, v === 0 ? 0.5 : 0);
                                        // Trigger volume update in game
                                        if (gameRef.current) {
                                            const scene = gameRef.current.scene.scenes[0];
                                            if (scene && scene.registry) {
                                                scene.registry.set('volume', newVal);
                                                scene.events.emit('volumeChange', newVal);
                                            }
                                        }
                                        return newVal;
                                    })}
                                    sx={{ color: 'white', p: 0.5 }}
                                >
                                    {volume === 0 ? <VolumeMuteIcon fontSize="small" /> :
                                        volume < 0.5 ? <VolumeDownIcon fontSize="small" /> :
                                            <VolumeUpIcon fontSize="small" />}
                                </IconButton>
                                <Slider
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    sx={{
                                        width: { xs: 60, sm: 100 },
                                        color: 'primaryGreen.main',
                                        '& .MuiSlider-thumb': {
                                            width: 14,
                                            height: 14,
                                        },
                                        '& .MuiSlider-rail': {
                                            opacity: 0.3,
                                        },
                                    }}
                                />
                            </Box>
                        )}
                        <IconButton
                            onClick={handlePauseResume}
                            disabled={gameOver || menuState !== 'playing'}
                            sx={{ color: 'white' }}
                        >
                            {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                        </IconButton>
                        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        position: 'relative',
                        minHeight: '600px',
                        bgcolor: 'transparent',
                    }}
                >
                    {/* Start Menu */}
                    {menuState === 'start' && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                width: '100%',
                                maxWidth: '400px',
                            }}
                        >
                            <Typography variant="h2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main', mb: 2 }}>
                                {gameTitle}
                            </Typography>

                            {highScore > 0 && (
                                <Typography variant="h6" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'white' }}>
                                    High Score: {highScore}
                                </Typography>
                            )}

                            <Stack spacing={2} sx={{ width: '100%', mt: 4 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleStartGame}
                                    sx={{
                                        bgcolor: 'primaryGreen.main',
                                        color: 'darkBackground.main',
                                        fontFamily: FONTS.NECTO_MONO,
                                        fontSize: '1.5rem',
                                        py: 2,
                                        '&:hover': {
                                            bgcolor: 'primaryGreen.light',
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                >
                                    Start
                                </Button>

                                {/* Difficulty selector - only for zAim */}
                                {gameTitle === 'zAim' && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleDifficultyToggle}
                                        sx={{
                                            borderColor: 'primaryGreen.main',
                                            color: 'primaryGreen.main',
                                            fontFamily: FONTS.NECTO_MONO,
                                            fontSize: '1.2rem',
                                            py: 1.5,
                                            '&:hover': {
                                                borderColor: 'primaryGreen.light',
                                                bgcolor: 'rgba(168, 214, 126, 0.1)',
                                            },
                                        }}
                                    >
                                        Difficulty: {difficulty.toUpperCase()}
                                    </Button>
                                )}

                                <Button
                                    variant="outlined"
                                    onClick={handleOpenOptions}
                                    sx={{
                                        borderColor: 'primaryGreen.main',
                                        color: 'primaryGreen.main',
                                        fontFamily: FONTS.NECTO_MONO,
                                        fontSize: '1.2rem',
                                        py: 1.5,
                                        '&:hover': {
                                            borderColor: 'primaryGreen.light',
                                            bgcolor: 'rgba(168, 214, 126, 0.1)',
                                        },
                                    }}
                                >
                                    Options
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<LeaderboardIcon />}
                                    onClick={() => void handleShowLeaderboard()}
                                    sx={{
                                        borderColor: 'rgba(168,214,126,0.4)',
                                        color: 'rgba(168,214,126,0.8)',
                                        fontFamily: FONTS.NECTO_MONO,
                                        fontSize: '1.2rem',
                                        py: 1.5,
                                        '&:hover': {
                                            borderColor: 'primaryGreen.main',
                                            bgcolor: 'rgba(168, 214, 126, 0.08)',
                                        },
                                    }}
                                >
                                    Leaderboard
                                </Button>

                                <Button
                                    variant="outlined"
                                    onClick={handleClose}
                                    sx={{
                                        borderColor: 'white',
                                        color: 'white',
                                        fontFamily: FONTS.NECTO_MONO,
                                        fontSize: '1.2rem',
                                        py: 1.5,
                                        '&:hover': {
                                            borderColor: 'rgba(255, 255, 255, 0.8)',
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        },
                                    }}
                                >
                                    Exit
                                </Button>
                            </Stack>
                        </Box>
                    )}

                    {/* Leaderboard Panel */}
                    {menuState === 'leaderboard' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 420 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                                <EmojiEventsIcon sx={{ color: 'primaryGreen.main' }} />
                                <Typography variant="h4" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main' }}>
                                    Leaderboard
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.NECTO_MONO, mb: 2, letterSpacing: 1 }}>
                                {gameTitle.toUpperCase()} · TOP 10
                            </Typography>

                            {leaderboardLoading ? (
                                <CircularProgress sx={{ color: 'primaryGreen.main', my: 4 }} />
                            ) : leaderboardScores.length === 0 ? (
                                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, my: 4 }}>
                                    No scores yet — be the first!
                                </Typography>
                            ) : (
                                <Box sx={{ width: '100%', mb: 3 }}>
                                    {/* Header row */}
                                    <Stack direction="row" sx={{ px: 1, pb: 1, borderBottom: '1px solid rgba(168,214,126,0.15)', mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, width: 32 }}>#</Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, flex: 1 }}>PLAYER</Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO }}>SCORE</Typography>
                                    </Stack>
                                    {leaderboardScores.map((entry, i) => (
                                        <Stack
                                            key={i}
                                            direction="row"
                                            alignItems="center"
                                            sx={{
                                                px: 1,
                                                py: 0.75,
                                                borderRadius: 1,
                                                bgcolor: entry.username === authUsername ? 'rgba(168,214,126,0.08)' : 'transparent',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)', width: 32, fontWeight: i < 3 ? 700 : 400 }}>
                                                {i + 1}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: entry.username === authUsername ? 'primaryGreen.main' : 'white', flex: 1 }}>
                                                {entry.username}{entry.username === authUsername ? ' (you)' : ''}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main', fontWeight: 600 }}>
                                                {entry.score.toLocaleString()}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                onClick={handleBackToMenu}
                                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', fontFamily: FONTS.NECTO_MONO, px: 4, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                            >
                                Back
                            </Button>
                        </Box>
                    )}

                    {/* Options Menu */}
                    {menuState === 'options' && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                                width: '100%',
                                maxWidth: '500px',
                            }}
                        >
                            <Typography variant="h3" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main' }}>
                                Options
                            </Typography>

                            {/* Volume Control */}
                            <Box sx={{ width: '100%' }}>
                                <Typography variant="h6" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'white', mb: 2 }}>
                                    Volume: {Math.round(volume * 100)}%
                                </Typography>
                                <Slider
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    sx={{
                                        color: 'primaryGreen.main',
                                        '& .MuiSlider-thumb': {
                                            width: 20,
                                            height: 20,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Color Selector */}
                            {showColorOption && (
                                <Box sx={{ width: '100%' }}>
                                    <Typography variant="h6" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'white', mb: 2 }}>
                                        Primary Color
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {colorOptions.map((color) => (
                                            <Box
                                                key={color.value}
                                                onClick={() => setPrimaryColor(color.value)}
                                                sx={{
                                                    width: 60,
                                                    height: 60,
                                                    bgcolor: color.value,
                                                    borderRadius: 1,
                                                    cursor: 'pointer',
                                                    border: primaryColor === color.value ? '4px solid white' : '2px solid rgba(255,255,255,0.3)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        transform: 'scale(1.1)',
                                                        border: '3px solid white',
                                                    },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Back Button */}
                            <Button
                                variant="outlined"
                                onClick={handleBackToMenu}
                                sx={{
                                    borderColor: 'white',
                                    color: 'white',
                                    fontFamily: FONTS.NECTO_MONO,
                                    fontSize: '1.2rem',
                                    py: 1.5,
                                    px: 4,
                                    mt: 2,
                                    '&:hover': {
                                        borderColor: 'rgba(255, 255, 255, 0.8)',
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                    },
                                }}
                            >
                                Back
                            </Button>
                        </Box>
                    )}

                    {/* Game Canvas - only visible when playing */}
                    {menuState === 'playing' && (
                        <Box
                            ref={containerRef}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                // When game over, stop the canvas from absorbing pointer events
                                // so the React overlay buttons receive clicks correctly.
                                pointerEvents: gameOver ? 'none' : 'auto',
                                '& canvas': {
                                    display: 'block',
                                    margin: '0 auto',
                                },
                            }}
                        />
                    )}

                    {/* Game Over Overlay — shared component, handles all games uniformly */}
                    {gameOver && (
                        <GameOverOverlay
                            score={currentScore}
                            stats={gameOverStats}
                            personalBest={highScore}
                            allTimeHigh={allTimeHigh}
                            isNewAllTimeHigh={isNewAllTimeHigh}
                            onRetry={handleRestart}
                            onBackToMenu={handleBackToMenuFromGame}
                        />
                    )}

                    {/* UserAuthModal is still available from the nav Login button — not needed here */}

                    {/* Paused Overlay */}
                    {isPaused && !gameOver && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography variant="h3" sx={{ color: 'white', fontFamily: FONTS.NECTO_MONO }}>
                                PAUSED
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Score submission failure modal — shown when the API call fails so the
                user doesn't lose their score. They can screenshot and email it. */}
            <Dialog
                open={showSubmitFailModal}
                onClose={() => setShowSubmitFailModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(145deg, #0d1117 0%, #111827 100%)',
                        border: '1px solid rgba(244,67,54,0.3)',
                        boxShadow: '0 0 40px rgba(244,67,54,0.06), 0 16px 60px rgba(0,0,0,0.9)',
                    },
                }}
            >
                <DialogTitle sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: 'white', fontFamily: FONTS.NECTO_MONO,
                    borderBottom: '1px solid rgba(255,255,255,0.07)', pb: 1.5,
                }}>
                    <span>Score Not Saved</span>
                    <IconButton onClick={() => setShowSubmitFailModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5} alignItems="center">
                        <Typography variant="h3" sx={{ color: '#f44336', fontFamily: FONTS.NECTO_MONO, textAlign: 'center' }}>
                            {failedScore.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', fontFamily: FONTS.NECTO_MONO, textAlign: 'center', lineHeight: 1.8 }}>
                            There was a network error and your score couldn't be saved. Please take a screenshot of this dialog and email it to:
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.NECTO_MONO, textAlign: 'center', wordBreak: 'break-all', fontWeight: 600 }}>
                            jamesfriedenberg@gmail.com
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, textAlign: 'center', lineHeight: 1.7 }}>
                            Include your username and the game you were playing and your score will be updated manually.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => setShowSubmitFailModal(false)}
                            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: FONTS.NECTO_MONO, mt: 1, '&:hover': { borderColor: 'rgba(255,255,255,0.4)' } }}
                        >
                            Close
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GameContainer;
