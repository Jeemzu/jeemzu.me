import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import {
    Box, Typography, IconButton, Button, Slider, Stack, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CircularProgress from '@mui/material/CircularProgress';
import Phaser from 'phaser';
import { FONTS } from '../../lib/globals';
import { saveHighScore, getGameSummary, getHighScores } from '../../utils/gameApi';
import type { GameHighScore } from '../../lib/GameTypes';
import type { GameStat } from '../../lib/GameTypes';
import { useAuthStore } from '../../stores/authStore';
import { GameOverOverlay } from '../../components/shared/GameOverOverlay';
import { createZAimGameConfig, type GameMode } from '../../games/ZAimGame';
import { createSnakeGameConfig } from '../../games/SnakeGame';
import { createTetrisGameConfig } from '../../games/TetrisGame';
import { createBrickBreakGameConfig } from '../../games/BrickBreakGame';

// ── Game registry ───────────────────────────────────────────────────
interface GameEntry {
    title: string;
    config: () => Omit<Phaser.Types.Core.GameConfig, 'parent'>;
    showColorOption?: boolean;
}

const GAME_REGISTRY: Record<string, GameEntry> = {
    zaim: { title: 'ZAim', config: createZAimGameConfig, showColorOption: true },
    snake: { title: 'Snake', config: createSnakeGameConfig },
    tetris: { title: 'Tetris', config: createTetrisGameConfig },
    brickbreak: { title: 'Brick Break', config: createBrickBreakGameConfig },
};

// ── Component ─────────────────────────────────────────────────────────────
export default function GamePage() {
    const [, navigate] = useLocation();
    const { id = '' } = useParams<{ id: string }>();
    const gameEntry = GAME_REGISTRY[id];

    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const highScoreRef = useRef(0);
    const currentScoreRef = useRef(0);
    const allTimeHighRef = useRef<{ score: number; username: string } | null>(null);
    const authUsernameRef = useRef<string | null>(null);
    const autoSubmitRef = useRef(false);

    const [menuState, setMenuState] = useState<'start' | 'playing' | 'leaderboard'>('start');
    const [leaderboardScores, setLeaderboardScores] = useState<GameHighScore[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentScore, setCurrentScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [primaryColor, setPrimaryColor] = useState('#a8d67e');
    const [gameMode, setGameMode] = useState<GameMode>('endurance');
    const [allTimeHigh, setAllTimeHigh] = useState<{ score: number; username: string } | null>(null);
    const [isNewAllTimeHigh, setIsNewAllTimeHigh] = useState(false);
    const [gameOverStats, setGameOverStats] = useState<GameStat[]>([]);

    const authUsername = useAuthStore(s => s.username);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);

    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
    useEffect(() => { currentScoreRef.current = currentScore; }, [currentScore]);
    useEffect(() => { allTimeHighRef.current = allTimeHigh; }, [allTimeHigh]);
    useEffect(() => { authUsernameRef.current = authUsername ?? null; }, [authUsername]);

    const isZAim = id === 'zaim';
    const leaderboardId = isZAim ? `${id}_${gameMode}` : id;

    // Fetch personal best + all-time high (re-fetches when mode changes for ZAim)
    useEffect(() => {
        if (!gameEntry) return;
        getGameSummary(leaderboardId)
            .then(summary => {
                setAllTimeHigh(summary.allTimeHigh);
                setHighScore(summary.personalBest);
                highScoreRef.current = summary.personalBest;
            })
            .catch(() => { });
    }, [leaderboardId, isAuthenticated, gameEntry]);

    // Auto-fetch leaderboard for side panel (non-ZAim games)
    useEffect(() => {
        if (isZAim || !gameEntry) return;
        setLeaderboardLoading(true);
        getHighScores(leaderboardId, 10)
            .then(setLeaderboardScores)
            .catch(() => { })
            .finally(() => setLeaderboardLoading(false));
    }, [leaderboardId, isAuthenticated, gameEntry, isZAim]);

    // Auto-submit new personal best
    useEffect(() => {
        if (!gameOver || !isAuthenticated || !autoSubmitRef.current) return;
        autoSubmitRef.current = false;
        void saveHighScore(leaderboardId, currentScoreRef.current);
    }, [gameOver, isAuthenticated, leaderboardId]);

    // Mount / destroy Phaser game
    useEffect(() => {
        if (menuState !== 'playing' || !containerRef.current || gameRef.current || !gameEntry) return;

        const baseConfig = gameEntry.config();

        let config: Phaser.Types.Core.GameConfig;
        if (isZAim) {
            // ZAim adapts to the full viewport
            const { width, height, ...rest } = baseConfig as Phaser.Types.Core.GameConfig;
            config = {
                ...rest,
                parent: containerRef.current,
                scale: { mode: Phaser.Scale.RESIZE },
            };
        } else {
            // Other games use RESIZE + camera zoom for crisp text rendering
            const { width, height, ...rest } = baseConfig as Phaser.Types.Core.GameConfig;
            config = {
                ...rest,
                parent: containerRef.current,
                scale: { mode: Phaser.Scale.RESIZE },
            };
        }
        config = {
            ...config,
            callbacks: {
                postBoot: (game) => {
                    game.events.on('scoreUpdate', (score: number) => setCurrentScore(score));
                    game.events.on('gameOver', (payload: number | { score: number; stats?: GameStat[] }) => {
                        const finalScore = typeof payload === 'number' ? payload : payload.score;
                        const stats = typeof payload === 'number' ? [] : (payload.stats ?? []);
                        setGameOverStats(stats);
                        setGameOver(true);
                        if (finalScore > highScoreRef.current) {
                            setHighScore(finalScore);
                            highScoreRef.current = finalScore;
                            autoSubmitRef.current = true;
                        }
                        if (finalScore > (allTimeHighRef.current?.score ?? 0)) {
                            setIsNewAllTimeHigh(true);
                            setAllTimeHigh({ score: finalScore, username: authUsernameRef.current ?? 'you' });
                        }
                    });

                    // Write settings directly to the game-level registry so
                    // create() always sees them regardless of restart timing.
                    game.registry.set('volume', volume);
                    if (isZAim) {
                        game.registry.set('primaryColor', primaryColor);
                        game.registry.set('gameMode', gameMode);
                    }

                    const scene = game.scene.scenes[0];
                    if (scene?.scene) {
                        scene.scene.restart(isZAim ? { gameMode, primaryColor } : undefined);
                    }
                },
            },
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menuState, gameEntry]);

    const handlePauseResume = () => {
        const scene = gameRef.current?.scene.scenes[0];
        if (!scene) return;
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
        setIsPaused(p => !p);
    };

    const handleRestart = () => {
        const scene = gameRef.current?.scene.scenes[0];
        if (scene?.scene) {
            scene.scene.restart(isZAim ? { gameMode, primaryColor } : undefined);
        }
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        setIsNewAllTimeHigh(false);
        autoSubmitRef.current = false;
    };

    const handleBackToMenu = useCallback(() => {
        gameRef.current?.destroy(true);
        gameRef.current = null;
        setGameOver(false);
        setCurrentScore(0);
        setIsPaused(false);
        setIsNewAllTimeHigh(false);
        autoSubmitRef.current = false;
        setMenuState('start');
    }, []);

    const handleVolumeChange = (_: Event, v: number | number[]) => {
        const newVol = v as number;
        setVolume(newVol);
        gameRef.current?.scene.scenes[0]?.events.emit('volumeChange', newVol);
    };

    const handleShowLeaderboard = async () => {
        setMenuState('leaderboard');
        setLeaderboardLoading(true);
        try {
            setLeaderboardScores(await getHighScores(leaderboardId, 10));
        } catch { /* silently fail */ } finally {
            setLeaderboardLoading(false);
        }
    };

    const handleBack = useCallback(() => {
        gameRef.current?.destroy(true);
        gameRef.current = null;
        navigate('/games');
    }, [navigate]);

    if (!gameEntry) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', gap: 2 }}>
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO }}>Game not found.</Typography>
                <Button onClick={() => navigate('/games')}>← Back to Games</Button>
            </Box>
        );
    }

    const VolumeIcon = volume === 0 ? VolumeMuteIcon : volume < 0.5 ? VolumeDownIcon : VolumeUpIcon;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', position: 'fixed', inset: 0, zIndex: 1300, bgcolor: 'background.default' }}>

            {/* ── Top bar ── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 2, height: 52, flexShrink: 0,
                borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            }}>
                <IconButton size="small" onClick={handleBack}>
                    <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="body1" sx={{ fontFamily: FONTS.NECTO_MONO, flexGrow: 1 }}>
                    {gameEntry.title}
                </Typography>
                {menuState === 'playing' && !gameOver && (
                    <>
                        <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main', minWidth: 60, textAlign: 'right' }}>
                            {currentScore.toLocaleString()}
                        </Typography>
                        <VolumeIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                        <Slider size="small" value={volume} min={0} max={1} step={0.05}
                            onChange={handleVolumeChange} sx={{ width: 72, mx: 1 }} />
                        <IconButton size="small" onClick={handlePauseResume}>
                            {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                        </IconButton>
                    </>
                )}
            </Box>

            {/* ── Canvas area ── */}
            <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', bgcolor: '#1a1a1a', display: 'flex' }}>

                {/* Game canvas container */}
                <Box sx={{
                    position: 'relative',
                    flexGrow: 1,
                    minWidth: 0,
                }}>
                    <Box ref={containerRef} sx={{
                        width: '100%', height: '100%',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        '& canvas': { display: 'block' },
                    }} />

                    {/* ── Start menu ── */}
                    {menuState === 'start' && (
                        <Box sx={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(18,18,18,0.97)', gap: 3,
                        }}>
                            <Typography variant="h3" sx={{ fontFamily: FONTS.NECTO_MONO, letterSpacing: 4 }}>
                                {gameEntry.title}
                            </Typography>
                            {highScore > 0 && (
                                <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary' }}>
                                    {isZAim && gameMode === 'reflex'
                                        ? `Best avg: ${10000 - highScore}ms`
                                        : `Personal Best: ${highScore}`}
                                </Typography>
                            )}

                            {isZAim ? (
                                /* ── ZAim menu ── */
                                <>
                                    {/* Mode selector */}
                                    <Stack direction="row" spacing={1}>
                                        {(['endurance', 'reflex', 'speed'] as const).map(m => (
                                            <Button key={m} size="small"
                                                variant={gameMode === m ? 'contained' : 'outlined'}
                                                onClick={() => setGameMode(m)}
                                                style={{
                                                    backgroundColor: gameMode === m ? primaryColor : 'transparent',
                                                    color: gameMode === m ? '#0a0a0a' : primaryColor,
                                                    borderColor: primaryColor,
                                                }}
                                                sx={{ fontFamily: FONTS.NECTO_MONO, textTransform: 'capitalize', minWidth: 96 }}>
                                                {m}
                                            </Button>
                                        ))}
                                    </Stack>

                                    {/* Mode description */}
                                    <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
                                        {gameMode === 'endurance' && 'Click tiles before time runs out. Hit 40 to earn +10s. Wrong click ends it.'}
                                        {gameMode === 'reflex' && '5 rounds. One tile lights up — click it instantly. Shoot for the lowest reaction times.'}
                                        {gameMode === 'speed' && 'Click every tile as fast as you can in 10 seconds. Grid resets on full clear.'}
                                    </Typography>

                                    {/* Colour picker */}
                                    <Stack direction="row" spacing={1}>
                                        {['#a8d67e', '#7ec8e3', '#f4a261', '#e76f51', '#ffffff'].map(c => (
                                            <Box key={c} onClick={() => setPrimaryColor(c)}
                                                style={{ backgroundColor: c }}
                                                sx={{
                                                    width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                                                    outline: primaryColor === c ? '2px solid white' : '2px solid transparent',
                                                    outlineOffset: 2, transition: 'outline 0.15s',
                                                }} />
                                        ))}
                                    </Stack>

                                    {/* Volume */}
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <VolumeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        <Slider size="small" value={volume} min={0} max={1} step={0.05}
                                            onChange={handleVolumeChange} sx={{ width: 140 }} />
                                    </Stack>

                                    <Button variant="contained" size="large"
                                        onClick={() => setMenuState('playing')}
                                        style={{ backgroundColor: primaryColor, color: '#0a0a0a' }}
                                        sx={{ fontFamily: FONTS.NECTO_MONO, px: 7, mt: 1 }}>
                                        Play
                                    </Button>
                                </>
                            ) : (
                                /* ── Classic menu (Snake, Tetris, BrickBreak) ── */
                                <Stack spacing={2} sx={{ width: '100%', maxWidth: 340, mt: 2 }}>
                                    <Button variant="contained"
                                        onClick={() => setMenuState('playing')}
                                        sx={{
                                            bgcolor: 'primaryGreen.main', color: 'darkBackground.main',
                                            fontFamily: FONTS.NECTO_MONO, fontSize: '1.3rem', py: 1.8,
                                            '&:hover': { bgcolor: 'primaryGreen.light', transform: 'translateY(-2px)' },
                                        }}>
                                        Start
                                    </Button>
                                    <Button variant="outlined" startIcon={<LeaderboardIcon />}
                                        onClick={() => void handleShowLeaderboard()}
                                        sx={{
                                            borderColor: 'rgba(168,214,126,0.4)', color: 'rgba(168,214,126,0.8)',
                                            fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', py: 1.4,
                                            '&:hover': { borderColor: 'primaryGreen.main', bgcolor: 'rgba(168,214,126,0.08)' },
                                        }}>
                                        Leaderboard
                                    </Button>
                                    <Button variant="outlined" onClick={handleBack}
                                        sx={{
                                            borderColor: 'rgba(255,255,255,0.3)', color: 'white',
                                            fontFamily: FONTS.NECTO_MONO, fontSize: '1.1rem', py: 1.4,
                                            '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.05)' },
                                        }}>
                                        Exit
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                    )}

                    {/* ── Leaderboard panel ── */}
                    {menuState === 'leaderboard' && (
                        <Box sx={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(18,18,18,0.97)',
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <LeaderboardIcon sx={{ color: 'primaryGreen.main' }} />
                                <Typography variant="h4" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main' }}>
                                    Leaderboard
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.NECTO_MONO, mb: 2, letterSpacing: 1 }}>
                                {gameEntry.title.toUpperCase()} · TOP 10
                            </Typography>

                            {leaderboardLoading ? (
                                <CircularProgress sx={{ color: 'primaryGreen.main', my: 4 }} />
                            ) : leaderboardScores.length === 0 ? (
                                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, my: 4 }}>
                                    No scores yet — be the first!
                                </Typography>
                            ) : (
                                <Box sx={{ width: '100%', maxWidth: 420, mb: 3 }}>
                                    <Stack direction="row" sx={{ px: 1, pb: 1, borderBottom: '1px solid rgba(168,214,126,0.15)', mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, width: 32 }}>#</Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO, flex: 1 }}>PLAYER</Typography>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONTS.NECTO_MONO }}>SCORE</Typography>
                                    </Stack>
                                    {leaderboardScores.map((entry, i) => (
                                        <Stack key={i} direction="row" alignItems="center"
                                            sx={{
                                                px: 1, py: 0.75, borderRadius: 1,
                                                bgcolor: entry.username === authUsername ? 'rgba(168,214,126,0.08)' : 'transparent',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                                            }}>
                                            <Typography variant="body2" sx={{
                                                fontFamily: FONTS.NECTO_MONO, width: 32, fontWeight: i < 3 ? 700 : 400,
                                                color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)',
                                            }}>
                                                {i + 1}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, flex: 1, color: entry.username === authUsername ? 'primaryGreen.main' : 'white' }}>
                                                {entry.username}{entry.username === authUsername ? ' (you)' : ''}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main', fontWeight: 600 }}>
                                                {entry.score.toLocaleString()}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            )}

                            <Button variant="outlined" onClick={() => setMenuState('start')}
                                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', fontFamily: FONTS.NECTO_MONO, px: 4, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                Back
                            </Button>
                        </Box>
                    )}

                    {/* ── Game over ── */}
                    {gameOver && (
                        <GameOverOverlay
                            score={currentScore}
                            personalBest={highScore}
                            isNewAllTimeHigh={isNewAllTimeHigh}
                            allTimeHigh={allTimeHigh}
                            stats={gameOverStats}
                            onRetry={handleRestart}
                            onBackToMenu={handleBackToMenu}
                        />
                    )}

                    {/* ── Paused indicator ── */}
                    {isPaused && !gameOver && (
                        <Box sx={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.45)', pointerEvents: 'none',
                        }}>
                            <Typography variant="h4" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.5)', letterSpacing: 6 }}>
                                PAUSED
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* ── Side panel (non-ZAim games, during gameplay) ── */}
                {!isZAim && menuState === 'playing' && (
                    <Box sx={{
                        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
                        borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                        p: 2.5, gap: 2, overflowY: 'auto',
                    }}>
                        {/* Score */}
                        <Box>
                            <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', letterSpacing: 1 }}>
                                SCORE
                            </Typography>
                            <Typography variant="h4" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main', mt: 0.5 }}>
                                {currentScore.toLocaleString()}
                            </Typography>
                        </Box>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                        {/* Personal Best */}
                        <Box>
                            <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', letterSpacing: 1 }}>
                                PERSONAL BEST
                            </Typography>
                            <Typography variant="h6" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'white', mt: 0.5 }}>
                                {highScore > 0 ? highScore.toLocaleString() : '—'}
                            </Typography>
                        </Box>

                        {/* All-time Record */}
                        {allTimeHigh && (
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <EmojiEventsIcon sx={{ fontSize: 14, color: '#ffd700' }} />
                                    <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', letterSpacing: 1 }}>
                                        ALL-TIME RECORD
                                    </Typography>
                                </Stack>
                                <Typography variant="h6" sx={{ fontFamily: FONTS.NECTO_MONO, color: '#ffd700', mt: 0.5 }}>
                                    {allTimeHigh.score.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary' }}>
                                    by {allTimeHigh.username}
                                </Typography>
                            </Box>
                        )}

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                        {/* Volume */}
                        <Box>
                            <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', letterSpacing: 1 }}>
                                VOLUME
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                <VolumeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Slider size="small" value={volume} min={0} max={1} step={0.05}
                                    onChange={handleVolumeChange} sx={{ flex: 1 }} />
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                        {/* Leaderboard */}
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
                                <LeaderboardIcon sx={{ fontSize: 14, color: 'primaryGreen.main' }} />
                                <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'text.secondary', letterSpacing: 1 }}>
                                    TOP 10
                                </Typography>
                            </Stack>
                            {leaderboardLoading ? (
                                <CircularProgress size={20} sx={{ color: 'primaryGreen.main', display: 'block', mx: 'auto', my: 2 }} />
                            ) : leaderboardScores.length === 0 ? (
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONTS.NECTO_MONO }}>
                                    No scores yet
                                </Typography>
                            ) : (
                                <Stack spacing={0.25}>
                                    {leaderboardScores.map((entry, i) => (
                                        <Stack key={i} direction="row" alignItems="center" spacing={0.5}
                                            sx={{
                                                py: 0.4, px: 0.5, borderRadius: 0.5,
                                                bgcolor: entry.username === authUsername ? 'rgba(168,214,126,0.06)' : 'transparent',
                                            }}>
                                            <Typography variant="caption" sx={{
                                                fontFamily: FONTS.NECTO_MONO, width: 20, fontWeight: i < 3 ? 700 : 400,
                                                color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.35)',
                                            }}>
                                                {i + 1}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, flex: 1, color: entry.username === authUsername ? 'primaryGreen.main' : 'rgba(255,255,255,0.75)' }}>
                                                {entry.username}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main' }}>
                                                {entry.score.toLocaleString()}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

