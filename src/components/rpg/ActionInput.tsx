import { useState } from 'react';
import { Box, TextField, IconButton, Stack, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useRpgStore } from '../../stores/rpgStore';

const QUICK_ACTIONS = ['Look around', 'Rest'];

const ActionInput = () => {
    const [text, setText] = useState('');
    const busy = useRpgStore((s) => s.busy);
    const sendAction = useRpgStore((s) => s.sendAction);

    const submit = (action: string) => {
        const trimmed = action.trim();
        if (!trimmed || busy) return;
        void sendAction(trimmed);
        setText('');
    };

    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {QUICK_ACTIONS.map((action) => (
                    <Button key={action} size="small" variant="outlined" disabled={busy} onClick={() => submit(action)}>
                        {action}
                    </Button>
                ))}
            </Stack>
            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="What do you do?"
                    value={text}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submit(text);
                        }
                    }}
                />
                <IconButton color="primary" disabled={busy || !text.trim()} onClick={() => submit(text)}>
                    <SendIcon />
                </IconButton>
            </Stack>
        </Box>
    );
};

export default ActionInput;
