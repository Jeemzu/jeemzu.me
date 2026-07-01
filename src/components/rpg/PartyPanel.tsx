import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { FONTS } from '../../lib/globals';
import { useRpgStore } from '../../stores/rpgStore';

/** Small always-visible roster with HP/MP bars, sourced from the latest uiState.players. */
const PartyPanel = () => {
    const party = useRpgStore((s) => s.party);
    const uiState = useRpgStore((s) => s.uiState);

    if (!party) return null;

    return (
        <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {party.members.map((member) => {
                const stats = uiState?.players[member.username];
                return (
                    <Box key={member.username} sx={{ backgroundColor: '#1a1a1a', borderRadius: 1, p: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography fontFamily={FONTS.NECTO_MONO} variant="body2">
                                {member.characterName}
                            </Typography>
                            <Chip size="small" label={`Lv.${stats?.level ?? 1} ${member.characterClass}`} />
                        </Box>
                        {stats && (
                            <>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stats.hp / stats.max_hp) * 100}
                                    sx={{ height: 6, borderRadius: 1, mb: 0.5, backgroundColor: '#333' }}
                                    color="success"
                                />
                                <Typography variant="caption" color="textSecondary">
                                    HP {stats.hp}/{stats.max_hp} · MP {stats.mp}/{stats.max_mp}
                                </Typography>
                            </>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};

export default PartyPanel;
