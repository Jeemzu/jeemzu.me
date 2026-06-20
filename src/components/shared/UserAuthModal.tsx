import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    IconButton,
    InputAdornment,
    Tabs,
    Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuthStore } from '../../stores/authStore';
import { FONTS } from '../../lib/globals';

export type AuthTab = 'login' | 'register';

interface UserAuthModalProps {
    open: boolean;
    onClose: () => void;
    defaultTab?: AuthTab;
}

const UserAuthModal = ({ open, onClose, defaultTab = 'register' }: UserAuthModalProps) => {
    const { register, loginUser } = useAuthStore();
    const [tab, setTab] = useState<AuthTab>(defaultTab);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setLoading(false);
        onClose();
    };

    const handleTabChange = (_: React.SyntheticEvent, newTab: AuthTab) => {
        setTab(newTab);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) return;

        if (tab === 'register') {
            if (password !== confirmPassword) {
                setError("Passwords don't match.");
                return;
            }
            if (password.length < 8) {
                setError('Password must be at least 8 characters.');
                return;
            }
        }

        setError('');
        setLoading(true);

        const result =
            tab === 'register'
                ? await register(username.trim(), password)
                : await loginUser(username.trim(), password);

        setLoading(false);

        if (result.success) {
            handleClose();
        } else {
            setError(result.error ?? (tab === 'register' ? 'Registration failed.' : 'Login failed.'));
            setPassword('');
            setConfirmPassword('');
        }
    };

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            color: 'white',
            fontFamily: FONTS.NECTO_MONO,
            fontSize: '0.9rem',
            '& fieldset': { borderColor: 'rgba(168, 214, 126, 0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(168, 214, 126, 0.6)' },
            '&.Mui-focused fieldset': { borderColor: '#a8d67e' },
        },
        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.NECTO_MONO },
        '& .MuiInputLabel-root.Mui-focused': { color: '#a8d67e' },
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'linear-gradient(145deg, #0d1117 0%, #111827 100%)',
                    border: '1px solid rgba(168, 214, 126, 0.2)',
                    boxShadow: '0 0 40px rgba(168, 214, 126, 0.06), 0 16px 60px rgba(0,0,0,0.9)',
                },
            }}
        >
            <DialogContent sx={{ p: 0, pb: 3 }}>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 3,
                        pt: 2.5,
                        pb: 1,
                        borderBottom: '1px solid rgba(168, 214, 126, 0.1)',
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{ fontFamily: FONTS.NECTO_MONO, color: 'primaryGreen.main' }}
                    >
                        Track Your Scores
                    </Typography>
                    <IconButton onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.4)' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={handleTabChange}
                    sx={{
                        px: 2,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        '& .MuiTab-root': {
                            fontFamily: FONTS.NECTO_MONO,
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.4)',
                            minWidth: 0,
                            px: 2,
                        },
                        '& .Mui-selected': { color: 'primaryGreen.main !important' },
                        '& .MuiTabs-indicator': { backgroundColor: 'primaryGreen.main' },
                    }}
                >
                    <Tab label="Register" value="register" />
                    <Tab label="Sign In" value="login" />
                </Tabs>

                {/* Form */}
                <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, pt: 2.5 }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={loading}
                            fullWidth
                            inputProps={{ maxLength: 50 }}
                            sx={fieldSx}
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                            disabled={loading}
                            fullWidth
                            sx={fieldSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword((v) => !v)}
                                            edge="end"
                                            sx={{ color: 'rgba(255,255,255,0.35)' }}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <VisibilityOffIcon fontSize="small" />
                                            ) : (
                                                <VisibilityIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {tab === 'register' && (
                            <TextField
                                label="Confirm Password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                disabled={loading}
                                fullWidth
                                sx={fieldSx}
                            />
                        )}

                        {error && (
                            <Typography
                                variant="caption"
                                sx={{ color: '#f44336', fontFamily: FONTS.NECTO_MONO }}
                            >
                                {error}
                            </Typography>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={
                                loading ||
                                !username.trim() ||
                                !password ||
                                (tab === 'register' && !confirmPassword)
                            }
                            fullWidth
                            sx={{
                                bgcolor: 'primaryGreen.main',
                                color: 'darkBackground.main',
                                fontFamily: FONTS.NECTO_MONO,
                                fontSize: '0.95rem',
                                py: 1.4,
                                mt: 0.5,
                                '&:hover': { bgcolor: 'softGreen.main' },
                                '&.Mui-disabled': { opacity: 0.45 },
                            }}
                        >
                            {loading
                                ? tab === 'register'
                                    ? 'Creating account…'
                                    : 'Signing in…'
                                : tab === 'register'
                                    ? 'Create Account'
                                    : 'Sign In'}
                        </Button>

                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255,255,255,0.3)',
                                fontFamily: FONTS.NECTO_MONO,
                                textAlign: 'center',
                                lineHeight: 1.5,
                            }}
                        >
                            {tab === 'register'
                                ? 'Already have an account? Switch to Sign In above.'
                                : "Don't have an account? Switch to Register above."}
                        </Typography>
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default UserAuthModal;
