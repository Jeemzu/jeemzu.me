import { Box, Typography, Button, Tooltip } from '@mui/material';
import { FaLock, FaMapMarkerAlt, FaShieldAlt, FaSkull } from 'react-icons/fa';
import { FONTS } from '../../../lib/globals';
import { LOCATIONS } from '../data/locations';
import type { LocationId, RPGGameState } from '../types';

const LOCATION_ICONS: Record<LocationId, React.ReactNode> = {
    ascent_of_thrae: <FaShieldAlt />,
    the_undercroft: <FaMapMarkerAlt />,
    the_fracture: <FaSkull />,
};

const LOCATION_ORDER: LocationId[] = ['ascent_of_thrae', 'the_undercroft', 'the_fracture'];

interface OverworldMapProps {
    progress: RPGGameState['progress'];
    onSelectLocation: (id: LocationId) => void;
}

export default function OverworldMap({ progress, onSelectLocation }: OverworldMapProps) {
    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            py: 5,
            background: 'linear-gradient(180deg, #0a0a1a 0%, #16213e 50%, #1a0d0d 100%)',
        }}>
            <Typography
                fontFamily={FONTS.PALACE}
                sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, color: '#a8d67e', mb: 0.5, textAlign: 'center' }}
            >
                The Progenitors
            </Typography>
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                sx={{ fontSize: '0.75rem', color: '#6a8fa0', mb: 6, letterSpacing: 2 }}
            >
                OVERWORLD MAP — THRAE, 6999
            </Typography>

            {/* Location nodes */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', maxWidth: 480 }}>
                {LOCATION_ORDER.map((locationId, idx) => {
                    const loc = LOCATIONS[locationId];
                    const isUnlocked = progress.unlockedLocations.includes(locationId);
                    const depth = progress.dungeonDepths[locationId] ?? 0;
                    const maxDepth = loc.maxDepth ?? 0;
                    const isCleared = !loc.isSafe && depth >= maxDepth;

                    return (
                        <Box key={locationId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {/* Connector line */}
                            {idx > 0 && (
                                <Box sx={{
                                    position: 'absolute',
                                    width: 2,
                                    height: 40,
                                    backgroundColor: '#2a3a4a',
                                    transform: 'translateX(22px) translateY(-52px)',
                                }} />
                            )}
                            <Tooltip
                                title={isUnlocked ? '' : `Complete ${LOCATIONS[loc.unlocksAfter!]?.name ?? ''} to unlock`}
                                placement="right"
                            >
                                <Box sx={{ width: '100%' }}>
                                    <Button
                                        fullWidth
                                        disabled={!isUnlocked}
                                        onClick={() => onSelectLocation(locationId)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-start',
                                            gap: 2,
                                            p: 2.5,
                                            textAlign: 'left',
                                            background: isUnlocked
                                                ? (loc.isSafe ? 'rgba(168,214,126,0.07)' : 'rgba(255,80,50,0.06)')
                                                : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isUnlocked ? (loc.isSafe ? '#a8d67e44' : '#e05c2a44') : '#2a3a2a'}`,
                                            borderRadius: 2,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                background: isUnlocked
                                                    ? (loc.isSafe ? 'rgba(168,214,126,0.15)' : 'rgba(255,80,50,0.12)')
                                                    : undefined,
                                                borderColor: isUnlocked ? (loc.isSafe ? '#a8d67e88' : '#e05c2a88') : undefined,
                                            },
                                            '&.Mui-disabled': { opacity: 0.5 },
                                        }}
                                    >
                                        {/* Icon */}
                                        <Box sx={{ color: isUnlocked ? (loc.isSafe ? '#a8d67e' : '#e05c2a') : '#4a5a6a', fontSize: '1.2rem', mt: 0.2, minWidth: 20 }}>
                                            {isUnlocked ? LOCATION_ICONS[locationId] : <FaLock />}
                                        </Box>

                                        {/* Text */}
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                <Typography
                                                    fontFamily={FONTS.NECTO_MONO}
                                                    sx={{ color: isUnlocked ? '#ffffff' : '#4a5a6a', fontSize: '0.9rem' }}
                                                >
                                                    {loc.name}
                                                </Typography>
                                                {loc.isSafe && (
                                                    <Typography sx={{ color: '#a8d67e', fontSize: '0.6rem', fontFamily: FONTS.NECTO_MONO, opacity: 0.8 }}>
                                                        SAFE ZONE
                                                    </Typography>
                                                )}
                                                {isCleared && !loc.isSafe && (
                                                    <Typography sx={{ color: '#4ab5e8', fontSize: '0.6rem', fontFamily: FONTS.NECTO_MONO }}>
                                                        CLEARED
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography sx={{ color: '#6a7a8a', fontSize: '0.72rem', lineHeight: 1.4 }}>
                                                {loc.description}
                                            </Typography>
                                            {!loc.isSafe && isUnlocked && (
                                                <Typography sx={{ color: '#4a6a7a', fontSize: '0.65rem', mt: 0.5, fontFamily: FONTS.NECTO_MONO }}>
                                                    Depth: {depth}/{maxDepth}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Button>
                                </Box>
                            </Tooltip>
                        </Box>
                    );
                })}
            </Box>

            <Typography sx={{ mt: 6, color: '#2a3a4a', fontSize: '0.7rem', fontStyle: 'italic', textAlign: 'center' }}>
                Preacher's Peak, Year 6999 — the millennium celebration has begun.
            </Typography>
        </Box>
    );
}
