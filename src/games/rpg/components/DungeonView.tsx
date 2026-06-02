import { useState } from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { FaSkull, FaRunning } from 'react-icons/fa';
import { FONTS } from '../../../lib/globals';
import { LOCATIONS } from '../data/locations';
import { ENEMIES } from '../data/enemies';
import type { LocationId, RPGGameState } from '../types';

interface DungeonViewProps {
    locationId: LocationId;
    progress: RPGGameState['progress'];
    character: RPGGameState['character'];
    onStartEncounter: (enemyId: string) => void;
    onRetreat: () => void;
}

export default function DungeonView({
    locationId,
    progress,
    character,
    onStartEncounter,
    onRetreat,
}: DungeonViewProps) {
    const [searching, setSearching] = useState(false);
    const location = LOCATIONS[locationId];
    const currentDepth = progress.dungeonDepths[locationId] ?? 0;
    const maxDepth = location.maxDepth ?? 5;
    const isCleared = currentDepth >= maxDepth;

    const isBossDepth = currentDepth === maxDepth - 1 && locationId === 'the_fracture';

    function handleSearch() {
        if (searching || isCleared) return;
        setSearching(true);
        setTimeout(() => {
            setSearching(false);
            // Pick enemy from pool (boss on final depth of the_fracture)
            if (isBossDepth) {
                onStartEncounter('hollow_colossus');
            } else {
                const pool = location.enemyPool;
                const enemyId = pool[Math.floor(Math.random() * pool.length)];
                onStartEncounter(enemyId);
            }
        }, 800);
    }

    const hpPercent = (character.currentHP / (character.stats.vit * 10 + 50)) * 100;
    const auraPercent = (character.currentAura / (character.stats.foc * 5 + 20)) * 100;

    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: location.backgroundGradient,
            position: 'relative',
        }}>
            {/* Header */}
            <Box sx={{ px: 3, pt: 3, pb: 2 }}>
                <Button onClick={onRetreat} sx={{ color: '#6a8fa0', fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', mb: 1, p: 0 }}>
                    ← Retreat to Map
                </Button>
                <Typography fontFamily={FONTS.PALACE} sx={{ fontSize: '1.5rem', color: '#e05c2a' }}>
                    {location.name}
                </Typography>
                <Typography sx={{ color: '#5a4a3a', fontSize: '0.7rem', fontFamily: FONTS.NECTO_MONO }}>
                    {isBossDepth ? '⚠ BOSS ENCOUNTER AHEAD' : 'DANGER ZONE'}
                </Typography>
            </Box>

            {/* Depth tracker */}
            <Box sx={{ px: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a6a7a', fontSize: '0.65rem', letterSpacing: 1 }}>
                        DEPTH
                    </Typography>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#8a9aaa', fontSize: '0.65rem' }}>
                        {currentDepth} / {maxDepth}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={(currentDepth / maxDepth) * 100}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#1a2a1a',
                        '& .MuiLinearProgress-bar': { backgroundColor: '#e05c2a', borderRadius: 3 },
                    }}
                />
            </Box>

            {/* Player status */}
            <Box sx={{ px: 3, mb: 3, background: 'rgba(0,0,0,0.3)', py: 2, mx: 3, borderRadius: 2, border: '1px solid #2a3a2a' }}>
                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a6a5a', fontSize: '0.6rem', letterSpacing: 1, mb: 1 }}>
                    {character.name} — LV {character.level}
                </Typography>
                <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography sx={{ color: '#c05050', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>HP</Typography>
                        <Typography sx={{ color: '#c05050', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>
                            {character.currentHP} / {character.stats.vit * 10 + 50}
                        </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={hpPercent} sx={{ height: 5, borderRadius: 3, backgroundColor: '#2a1a1a', '& .MuiLinearProgress-bar': { backgroundColor: '#c05050' } }} />
                </Box>
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography sx={{ color: '#4a8ab5', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>AURA</Typography>
                        <Typography sx={{ color: '#4a8ab5', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>
                            {character.currentAura} / {character.stats.foc * 5 + 20}
                        </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={auraPercent} sx={{ height: 5, borderRadius: 3, backgroundColor: '#1a2a3a', '& .MuiLinearProgress-bar': { backgroundColor: '#4a8ab5' } }} />
                </Box>
            </Box>

            {/* Scene flavor */}
            <Box sx={{ px: 3, mb: 3 }}>
                <Typography sx={{ color: '#3a4a5a', fontSize: '0.75rem', fontStyle: 'italic', lineHeight: 1.7 }}>
                    {location.lore}
                </Typography>
            </Box>

            {/* Enemy preview for this area */}
            {!isCleared && (
                <Box sx={{ px: 3, mb: 3 }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#3a4a5a', fontSize: '0.6rem', letterSpacing: 1, mb: 1 }}>
                        KNOWN THREATS
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(isBossDepth ? ['hollow_colossus'] : location.enemyPool).map(eid => {
                            const enemy = ENEMIES[eid];
                            return (
                                <Box key={eid} sx={{ px: 1.5, py: 0.5, background: 'rgba(224,92,42,0.1)', border: '1px solid #e05c2a33', borderRadius: 1 }}>
                                    <Typography sx={{ color: '#8a5a4a', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>
                                        {enemy?.name ?? eid}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Cleared message */}
            {isCleared && (
                <Box sx={{ px: 3, mb: 3, p: 2, background: 'rgba(74,181,232,0.08)', border: '1px solid #4ab5e844', borderRadius: 2, mx: 3 }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4ab5e8', fontSize: '0.8rem' }}>
                        Area Cleared
                    </Typography>
                    <Typography sx={{ color: '#4a6a7a', fontSize: '0.72rem', mt: 0.5 }}>
                        You've reached the deepest point. Return to the map to continue.
                    </Typography>
                </Box>
            )}

            {/* Actions */}
            <Box sx={{ px: 3, mt: 'auto', pb: 3, display: 'flex', gap: 2 }}>
                {!isCleared && (
                    <Button
                        onClick={handleSearch}
                        disabled={searching}
                        startIcon={<FaSkull />}
                        sx={{
                            flex: 2,
                            p: 1.8,
                            background: searching ? 'rgba(224,92,42,0.05)' : 'rgba(224,92,42,0.12)',
                            border: '1px solid #e05c2a66',
                            borderRadius: 2,
                            color: '#e05c2a',
                            fontFamily: FONTS.NECTO_MONO,
                            fontSize: '0.85rem',
                            transition: 'all 0.3s ease',
                            '&:hover': { background: 'rgba(224,92,42,0.2)', borderColor: '#e05c2aaa' },
                        }}
                    >
                        {searching ? 'Searching...' : isBossDepth ? 'Face the Boss' : 'Search the Area'}
                    </Button>
                )}
                <Button
                    onClick={onRetreat}
                    startIcon={<FaRunning />}
                    sx={{
                        flex: 1,
                        p: 1.5,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid #2a3a2a',
                        borderRadius: 2,
                        color: '#4a6a7a',
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.75rem',
                        '&:hover': { borderColor: '#4a6a7a55' },
                    }}
                >
                    Retreat
                </Button>
            </Box>
        </Box>
    );
}
