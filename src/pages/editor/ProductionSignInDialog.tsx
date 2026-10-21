import { useState, type FormEvent } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { verifyProductionLogin, type ProductionIdentity } from '../../utils/productionAuth';

interface Props {
    open: boolean;
    onResolve: (identity: ProductionIdentity | null) => void;
}

export default function ProductionSignInDialog({ open, onResolve }: Props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const finish = (identity: ProductionIdentity | null) => {
        setPassword('');
        setError('');
        onResolve(identity);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const identity = await verifyProductionLogin(username.trim(), password);
            if (identity) finish(identity);
            else setError('Invalid username or password.');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => !busy && finish(null)}>
            <form onSubmit={submit}>
                <DialogTitle>Production sign-in</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1, minWidth: 300 }}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField label="Username" autoComplete="username" autoFocus value={username}
                            onChange={event => setUsername(event.target.value)} disabled={busy} />
                        <TextField label="Password" type="password" autoComplete="current-password" value={password}
                            onChange={event => setPassword(event.target.value)} disabled={busy} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => finish(null)} disabled={busy}>Cancel</Button>
                    <Button type="submit" disabled={busy || !username.trim() || !password}>Sign in</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
