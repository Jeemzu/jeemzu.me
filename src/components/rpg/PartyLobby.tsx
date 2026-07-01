import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    MenuItem,
    Stack,
    ToggleButtonGroup,
    ToggleButton,
    Alert,
    Chip,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { FONTS } from '../../lib/globals';
import { useRpgStore } from '../../stores/rpgStore';
import { useAuthStore } from '../../stores/authStore';
import type { CampaignSummary, CharacterClass } from '../../lib/RpgTypes';
import { listCampaigns, deleteCampaign } from '../../utils/rpgApi';
import UserAuthModal from '../shared/UserAuthModal';

const CLASS_OPTIONS: { value: CharacterClass; label: string }[] = [
    { value: 'warrior', label: 'Warrior' },
    { value: 'mage', label: 'Mage' },
    { value: 'rogue', label: 'Rogue' },
];

const PartyLobby = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const username = useAuthStore((s) => s.username);
    const { party, busy, error, createParty, joinParty, leaveParty, startGame, loadCampaign, clearError } = useRpgStore();

    const [mode, setMode] = useState<'create' | 'join' | 'load'>('create');
    const [characterName, setCharacterName] = useState('');
    const [characterClass, setCharacterClass] = useState<CharacterClass>('warrior');
    const [code, setCode] = useState('');
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
    const [campaignsLoaded, setCampaignsLoaded] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !campaignsLoaded) {
            listCampaigns().then((list) => {
                setCampaigns(list);
                setCampaignsLoaded(true);
            });
        }
    }, [isAuthenticated, campaignsLoaded]);

    const handleDeleteCampaign = async (id: string) => {
        const ok = await deleteCampaign(id);
        if (ok) setCampaigns((prev) => prev.filter((c) => c.id !== id));
    };

    const handleLoadCampaign = async (id: string) => {
        await loadCampaign(id);
    };

    if (!isAuthenticated) {
        return (
            <Box sx={{ maxWidth: 420, mx: 'auto', textAlign: 'center', py: 6 }}>
                <Typography variant="h6" fontFamily={FONTS.NECTO_MONO} sx={{ mb: 2 }}>
                    Sign in to join an adventure
                </Typography>
                <Button variant="contained" onClick={() => setAuthModalOpen(true)}>
                    Log In / Register
                </Button>
                <UserAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            </Box>
        );
    }

    // Already in a party (lobby, not yet started) — show the roster + start/leave controls.
    if (party) {
        const me = party.members.find((m) => m.username === username);
        return (
            <Box sx={{ maxWidth: 420, mx: 'auto', py: 4 }}>
                <Typography variant="h6" fontFamily={FONTS.NECTO_MONO} sx={{ mb: 1 }}>
                    Party Lobby
                </Typography>
                <Chip label={`Code: ${party.code}`} sx={{ mb: 2, fontFamily: FONTS.NECTO_MONO }} />
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1} sx={{ mb: 3 }}>
                    {party.members.map((m) => (
                        <Box key={m.username} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography>
                                {m.characterName} <Typography component="span" color="textSecondary">({m.characterClass})</Typography>
                            </Typography>
                            {m.isHost && <Chip size="small" label="Host" color="success" />}
                        </Box>
                    ))}
                </Stack>
                {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>{error}</Alert>}
                <Stack direction="row" spacing={2}>
                    {me?.isHost && (
                        <Button variant="contained" disabled={busy} onClick={() => startGame()}>
                            Start Game
                        </Button>
                    )}
                    <Button variant="outlined" color="error" onClick={() => leaveParty()}>
                        Leave Party
                    </Button>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 420, mx: 'auto', py: 4 }}>
            <Typography variant="h5" fontFamily={FONTS.NECTO_MONO} sx={{ mb: 3, textAlign: 'center' }}>
                The Sunken Crypt
            </Typography>

            <ToggleButtonGroup
                value={mode}
                exclusive
                fullWidth
                onChange={(_, next) => next && setMode(next)}
                sx={{ mb: 3 }}
            >
                <ToggleButton value="create">New Game</ToggleButton>
                <ToggleButton value="load" disabled={campaigns.length === 0}>Load ({campaigns.length})</ToggleButton>
                <ToggleButton value="join">Join Party</ToggleButton>
            </ToggleButtonGroup>

            {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>{error}</Alert>}

            {mode === 'load' ? (
                <List sx={{ mb: 2 }}>
                    {campaigns.map((c) => {
                        let characters = '—';
                        try {
                            const parsed = JSON.parse(c.characterSummaryJson) as { name: string; characterClass: string; level: number }[];
                            characters = parsed.map((p) => `${p.name} (${p.characterClass} Lv.${p.level})`).join(', ');
                        } catch { /* ignore parse errors */ }
                        return (
                            <ListItemButton key={c.id} onClick={() => handleLoadCampaign(c.id)} disabled={busy}>
                                <ListItemText
                                    primary={c.name}
                                    secondary={`${c.currentLocation} · ${characters} · ${new Date(c.lastPlayedAt).toLocaleDateString()}`}
                                    primaryTypographyProps={{ fontFamily: FONTS.NECTO_MONO }}
                                    secondaryTypographyProps={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.75rem' }}
                                />
                                <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c.id); }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemButton>
                        );
                    })}
                </List>
            ) : (
                <Stack spacing={2}>
                    {mode === 'join' && (
                        <TextField
                            label="Party Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            fullWidth
                        />
                    )}
                    <TextField
                        label="Character Name"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        select
                        label="Class"
                        value={characterClass}
                        onChange={(e) => setCharacterClass(e.target.value as CharacterClass)}
                        fullWidth
                    >
                        {CLASS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        variant="contained"
                        disabled={busy || !characterName || (mode === 'join' && !code)}
                        onClick={() =>
                            mode === 'create'
                                ? createParty(characterName, characterClass)
                                : joinParty(code, characterName, characterClass)
                        }
                    >
                        {mode === 'create' ? 'Create Party' : 'Join Party'}
                    </Button>
                </Stack>
            )}
        </Box>
    );
};

export default PartyLobby;
