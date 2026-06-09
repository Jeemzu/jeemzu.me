import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Grid,
    CircularProgress,
    Button,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useLocation } from 'wouter';
import { FONTS } from '../lib/globals';
import { type LevelFile, type ManifestEntry } from '../lib/LevelSchema';
import { fetchManifest, fetchLevelFile } from '../utils/levelLoader';
import { type CustomLevel, loadCustomLevels, deleteCustomLevel, customLevelToLevelFile } from '../utils/customLevels';

// ─── localStorage unlock helpers

const STORAGE_KEY = 'platformer_highest_completed';

export function getHighestCompleted(): number {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
}

export function markLevelCompleted(levelNumber: number): void {
    const current = getHighestCompleted();
    if (levelNumber > current) {
        localStorage.setItem(STORAGE_KEY, String(levelNumber));
    }
}

function isLevelUnlocked(levelNumber: number, highestCompleted: number): boolean {
    if (levelNumber === 1) return true;
    return highestCompleted >= levelNumber - 1;
}

interface PlatformerLevelSelectProps {
    open: boolean;
    onClose: () => void;
    onSelectLevel: (level: LevelFile) => void;
}

const PlatformerLevelSelect = ({ open, onClose, onSelectLevel }: PlatformerLevelSelectProps) => {
    const [highestCompleted, setHighestCompleted] = useState(0);
    const [entries, setEntries] = useState<ManifestEntry[]>([]);
    const [manifestLoading, setManifestLoading] = useState(false);
    const [manifestError, setManifestError] = useState<string | null>(null);
    const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
    const [customLevels, setCustomLevels] = useState<CustomLevel[]>([]);
    const [, navigate] = useLocation();

    // Refresh unlock state + manifest every time the dialog opens
    useEffect(() => {
        if (!open) return;
        setHighestCompleted(getHighestCompleted());
        setCustomLevels(loadCustomLevels().reverse()); // newest first
        setManifestLoading(true);
        setManifestError(null);

        fetchManifest()
            .then(m => setEntries(m.levels.sort((a, b) => a.number - b.number)))
            .catch(err => setManifestError(String(err)))
            .finally(() => setManifestLoading(false));
    }, [open]);

    const handleDeleteCustom = (id: string) => {
        deleteCustomLevel(id);
        setCustomLevels(prev => prev.filter(l => l.id !== id));
    };

    const handleLevelCreator = () => {
        onClose();
        navigate('/editor');
    };

    const handleSelect = async (entry: ManifestEntry) => {
        if (!isLevelUnlocked(entry.number, highestCompleted)) return;
        setLoadingLevel(entry.number);
        try {
            const levelFile = await fetchLevelFile(entry.file);
            onSelectLevel(levelFile);
        } catch (err) {
            setManifestError(`Failed to load level ${entry.number}: ${err}`);
        } finally {
            setLoadingLevel(null);
        }
    };

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
                            fontFamily: FONTS.NECTO_MONO,
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
                                fontFamily: FONTS.NECTO_MONO,
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
                <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 3, textTransform: 'uppercase', mb: 2.5 }}>
                    Select Level
                </Typography>

                {/* Loading manifest */}
                {manifestLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress size={32} sx={{ color: '#ffd740' }} />
                    </Box>
                )}

                {/* Manifest error */}
                {manifestError && (
                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: '#ff5555', fontSize: '0.8rem', textAlign: 'center', mt: 2 }}>
                        {manifestError}
                    </Typography>
                )}

                {/* No levels yet */}
                {!manifestLoading && !manifestError && entries.length === 0 && (
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', letterSpacing: 1 }}>
                            No levels found
                        </Typography>
                        <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.18)', fontSize: '0.6rem', letterSpacing: 1, mt: 1 }}>
                            Create one in the Level Editor at /editor
                        </Typography>
                    </Box>
                )}

                {/* Level grid */}
                {!manifestLoading && entries.length > 0 && (
                    <Grid container spacing={1.5}>
                        {entries.map((entry) => {
                            const unlocked = isLevelUnlocked(entry.number, highestCompleted);
                            const completed = highestCompleted >= entry.number;
                            const isLoading = loadingLevel === entry.number;

                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry.number}>
                                    <Box
                                        onClick={() => !isLoading && handleSelect(entry)}
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
                                            bgcolor: unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)',
                                            cursor: unlocked ? 'pointer' : 'default',
                                            transition: 'border-color 0.18s, background-color 0.18s, transform 0.12s',
                                            userSelect: 'none',
                                            ...(unlocked && {
                                                '&:hover': { bgcolor: 'rgba(255,215,64,0.07)', borderColor: 'rgba(255,215,64,0.6)', transform: 'translateY(-2px)' },
                                                '&:active': { transform: 'translateY(0)' },
                                            }),
                                        }}
                                    >
                                        {completed && (
                                            <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: 16, color: '#ffd740', opacity: 0.9 }} />
                                        )}
                                        {isLoading && (
                                            <CircularProgress size={24} sx={{ color: '#ffd740' }} />
                                        )}
                                        {!unlocked && !isLoading && (
                                            <LockIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.15)', mb: 0.5 }} />
                                        )}
                                        {unlocked && !isLoading && (
                                            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '2.4rem', lineHeight: 1, color: completed ? '#ffd740' : 'rgba(255,255,255,0.85)', mb: 0.5 }}>
                                                {entry.number}
                                            </Typography>
                                        )}
                                        {!isLoading && (
                                            <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.62rem', letterSpacing: 1.5, textTransform: 'uppercase', color: unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)' }}>
                                                {unlocked ? entry.name : `Level ${entry.number}`}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}

                {/* Hint */}
                {entries.length > 0 && (
                    <Typography sx={{ mt: 3, fontFamily: FONTS.NECTO_MONO, fontSize: '0.6rem', letterSpacing: 1, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                        Complete a level to unlock the next
                    </Typography>
                )}

                {/* My Levels section */}
                <Divider sx={{ mt: 3, mb: 2.5, borderColor: 'rgba(255,255,255,0.07)' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 3, textTransform: 'uppercase' }}>
                        My Levels
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleLevelCreator}
                        variant="outlined"
                        sx={{
                            fontFamily: FONTS.NECTO_MONO,
                            fontSize: '0.65rem',
                            letterSpacing: 1.5,
                            color: '#ffd740',
                            borderColor: 'rgba(255,215,64,0.4)',
                            '&:hover': { bgcolor: 'rgba(255,215,64,0.08)', borderColor: '#ffd740' },
                        }}
                    >
                        Level Creator
                    </Button>
                </Box>

                {customLevels.length === 0 && (
                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', letterSpacing: 1, textAlign: 'center', py: 2 }}>
                        No custom levels yet — click Level Creator to build one
                    </Typography>
                )}

                {customLevels.length > 0 && (
                    <Grid container spacing={1.5}>
                        {customLevels.map(level => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={level.id}>
                                <Box
                                    onClick={() => onSelectLevel(customLevelToLevelFile(level))}
                                    sx={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 100,
                                        borderRadius: 1.5,
                                        border: '1px solid rgba(255,215,64,0.2)',
                                        bgcolor: 'rgba(255,215,64,0.04)',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.18s, background-color 0.18s, transform 0.12s',
                                        userSelect: 'none',
                                        '&:hover': { bgcolor: 'rgba(255,215,64,0.09)', borderColor: 'rgba(255,215,64,0.55)', transform: 'translateY(-2px)' },
                                        '&:active': { transform: 'translateY(0)' },
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={e => { e.stopPropagation(); handleDeleteCustom(level.id); }}
                                        sx={{ position: 'absolute', top: 4, right: 4, color: 'rgba(255,100,100,0.4)', '&:hover': { color: 'rgba(255,100,100,0.9)' } }}
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Typography sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem', letterSpacing: 1.5, color: 'rgba(255,215,64,0.85)', textAlign: 'center', px: 3 }}>
                                        {level.name}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PlatformerLevelSelect;
