import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { FONTS } from '../../lib/globals';
import { useRpgStore } from '../../stores/rpgStore';

const NarrativePanel = () => {
    const narrativeLog = useRpgStore((s) => s.narrativeLog);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [narrativeLog.length]);

    return (
        <Box
            sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                backgroundColor: '#1a1a1a',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            {narrativeLog.length === 0 && (
                <Typography color="textSecondary" fontStyle="italic">
                    Your adventure is about to begin...
                </Typography>
            )}
            {narrativeLog.map((entry) => (
                <Typography
                    key={entry.id}
                    fontFamily={FONTS.NECTO_MONO}
                    sx={{
                        color: entry.kind === 'system' ? '#909090' : '#e0e0e0',
                        fontStyle: entry.kind === 'system' ? 'italic' : 'normal',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                    }}
                >
                    {entry.text}
                </Typography>
            ))}
            <div ref={bottomRef} />
        </Box>
    );
};

export default NarrativePanel;
