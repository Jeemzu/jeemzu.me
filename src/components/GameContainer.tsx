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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Phaser from 'phaser';
import { FONTS } from '../lib/globals';

interface GameContainerProps {
    open: boolean;
    onClose: () => void;
    gameTitle: string;
    gameConfig: Omit<Phaser.Types.Core.GameConfig, 'parent'>;
    onScoreUpdate?: (score: number) => void;
}

type MenuState = 'start' | 'options' | 'playing';

const GameContainer = ({
    open,
    onClose,
    gameTitle,
    gameConfig,
    onScoreUpdate,
}: GameContainerProps) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuMusicRef = useRef<HTMLAudioElement | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [containerReady, setContainerReady] = useState(false);
    const [menuState, setMenuState] = useState<MenuState>('start');
    const [volume, setVolume] = useState(0.5);
    const [primaryColor, setPrimaryColor] = useState('#a8d67e');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    // Load high score for this game
    useEffect(() => {
        const storedScore = localStorage.getItem(`highScore_${gameTitle}`);
        if (storedScore) {
            setHighScore(parseInt(storedScore, 10));
        }
    }, [gameTitle]);

    // Handle menu music based on game title
    useEffect(() => {
        if (open && menuState !== 'playing') {
            // Determine which music to play based on game
            let musicSrc = '';
            if (gameTitle === 'Snake') {
                musicSrc = '/src/assets/sounds/snake_music.mp3';
            }
            // Add more game music paths here as needed

            if (musicSrc && !menuMusicRef.current) {
                const audio = new Audio(musicSrc);
                audio.loop = true;
                audio.volume = volume * 0.3;
                audio.play().catch(e => console.log('Audio autoplay prevented:', e));
                menuMusicRef.current = audio;
            } else if (menuMusicRef.current) {
                menuMusicRef.current.volume = volume * 0.3;
            }
        }

        // Stop menu music when game starts playing
        if (menuState === 'playing' && menuMusicRef.current) {
            menuMusicRef.current.pause();
            menuMusicRef.current = null;
        }

        // Cleanup menu music when modal closes
        return () => {
            if (!open && menuMusicRef.current) {
                menuMusicRef.current.pause();
                menuMusicRef.current = null;
            }
        };
    }, [open, menuState, gameTitle, volume]);

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
                        game.events.on('gameOver', (finalScore: number) => {
                            setGameOver(true);
                            // Auto-save high score if it's better
                            const currentHighScore = parseInt(localStorage.getItem(`highScore_${gameTitle}`) || '0', 10);
                            if (finalScore > currentHighScore) {
                                localStorage.setItem(`highScore_${gameTitle}`, finalScore.toString());
                                setHighScore(finalScore);
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
                } else {
                    scene.scene.pause();
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
            }
        }
    };

    const handleBackToMenuFromGame = () => {
        // Destroy the game
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        setMenuState('start');
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
        setVolume(newValue as number);
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
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            TransitionProps={{
                onEntered: () => {
                    setContainerReady(true);
                },
            }}
            PaperProps={{
                sx: {
                    bgcolor: 'darkBackground.main',
                    minHeight: '70vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'darkBackground.dark',
                    color: 'white',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4" sx={{ fontFamily: FONTS.ANTON }}>{gameTitle}</Typography>
                    <Typography variant="h6" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.NECTO_MONO }}>
                        Score: {currentScore}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        onClick={handlePauseResume}
                        disabled={gameOver}
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
                    minHeight: '500px',
                    bgcolor: '#1a1a1a',
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
                        <Typography variant="h2" sx={{ fontFamily: FONTS.ANTON, color: 'primaryGreen.main', mb: 2 }}>
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
                                    fontFamily: FONTS.ANTON,
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
                                        fontFamily: FONTS.ANTON,
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
                                    fontFamily: FONTS.ANTON,
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
                                onClick={handleClose}
                                sx={{
                                    borderColor: 'white',
                                    color: 'white',
                                    fontFamily: FONTS.ANTON,
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
                        <Typography variant="h3" sx={{ fontFamily: FONTS.ANTON, color: 'primaryGreen.main' }}>
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

                        {/* Back Button */}
                        <Button
                            variant="outlined"
                            onClick={handleBackToMenu}
                            sx={{
                                borderColor: 'white',
                                color: 'white',
                                fontFamily: FONTS.ANTON,
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
                            '& canvas': {
                                display: 'block',
                                margin: '0 auto',
                            },
                        }}
                    />
                )}

                {/* Game Over Overlay */}
                {gameOver && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <Typography variant="h2" sx={{ color: 'white', fontFamily: FONTS.ANTON }}>
                            Game Over!
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.NECTO_MONO }}>
                            Score: {currentScore}
                        </Typography>
                        {highScore > 0 && (
                            <Typography variant="h6" sx={{ color: 'white', fontFamily: FONTS.NECTO_MONO }}>
                                High Score: {highScore}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleRestart}
                                sx={{
                                    bgcolor: 'primaryGreen.main',
                                    color: 'darkBackground.main',
                                    fontFamily: FONTS.ANTON,
                                    fontSize: '1.1rem',
                                    px: 4,
                                    py: 1.5,
                                    '&:hover': {
                                        bgcolor: 'primaryGreen.light',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                Retry
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={handleBackToMenuFromGame}
                                sx={{
                                    borderColor: 'white',
                                    color: 'white',
                                    fontFamily: FONTS.ANTON,
                                    fontSize: '1.1rem',
                                    px: 4,
                                    py: 1.5,
                                    '&:hover': {
                                        borderColor: 'rgba(255, 255, 255, 0.8)',
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                Back to Menu
                            </Button>
                        </Stack>
                    </Box>
                )}

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
                        <Typography variant="h3" sx={{ color: 'white', fontFamily: FONTS.ANTON }}>
                            PAUSED
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default GameContainer;
