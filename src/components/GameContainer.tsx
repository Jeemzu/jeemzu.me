import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Typography,
    Button,
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

const GameContainer = ({
    open,
    onClose,
    gameTitle,
    gameConfig,
    onScoreUpdate,
}: GameContainerProps) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [containerReady, setContainerReady] = useState(false);

    // Load high score for this game
    useEffect(() => {
        const storedScore = localStorage.getItem(`highScore_${gameTitle}`);
        if (storedScore) {
            setHighScore(parseInt(storedScore, 10));
        }
    }, [gameTitle]);

    // Reset containerReady when dialog closes
    useEffect(() => {
        if (!open) {
            setContainerReady(false);
        }
    }, [open]);

    // Create Phaser game once container is ready
    useEffect(() => {
        if (open && containerReady && containerRef.current && !gameRef.current) {

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
    }, [open, containerReady, gameConfig, onScoreUpdate]);

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



    const handleClose = () => {
        if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
        }
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        onClose();
    };

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
                    <Typography variant="h5" sx={{ fontFamily: FONTS.A_ART }}>{gameTitle}</Typography>
                    <Typography variant="h6" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.TRAP_BLACK }}>
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
                        <Typography variant="h3" sx={{ color: 'white', fontFamily: FONTS.A_ART }}>
                            Game Over!
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'primaryGreen.main', fontFamily: FONTS.TRAP_BLACK }}>
                            Score: {currentScore}
                        </Typography>
                        {highScore > 0 && (
                            <Typography variant="h6" sx={{ color: 'white', fontFamily: FONTS.TRAP_BLACK }}>
                                High Score: {highScore}
                            </Typography>
                        )}

                        <Button
                            variant="contained"
                            onClick={handleRestart}
                            sx={{
                                bgcolor: 'primaryGreen.main',
                                color: 'darkBackground.main',
                                fontFamily: FONTS.A_ART,
                                px: 4,
                                py: 1.5,
                                mt: 2,
                                '&:hover': {
                                    bgcolor: 'primaryGreen.light',
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            Retry
                        </Button>
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
                        <Typography variant="h3" sx={{ color: 'white', fontFamily: FONTS.A_ART }}>
                            PAUSED
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default GameContainer;
