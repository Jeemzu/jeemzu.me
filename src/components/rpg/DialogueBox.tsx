import { Box, Typography, Fade } from '@mui/material';
import { FONTS } from '../../lib/globals';
import { useRpgStore } from '../../stores/rpgStore';

/** Overlaid on the game canvas while the party is in conversation with an NPC. */
const DialogueBox = () => {
    const dialogue = useRpgStore((s) => s.dialogue);

    return (
        <Fade in={!!dialogue}>
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    right: 12,
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    border: '1px solid #a8d67e',
                    borderRadius: 1,
                    p: 1.5,
                }}
            >
                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c5e8a4', fontWeight: 'bold' }}>
                    {dialogue?.npcName ?? ''}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    Say goodbye to end the conversation
                </Typography>
            </Box>
        </Fade>
    );
};

export default DialogueBox;
