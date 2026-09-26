import { useState } from 'react';
import {
    Box, Typography, TextField, Button, Card, CardContent, Chip, Divider,
} from '@mui/material';
import { FONTS } from '../../../lib/globals';
import { PLAYER_CLASSES, TRAITS } from '../data/classes';
import type { ClassId, TraitId, PlayerClass } from '../types';

const STAT_LABELS: Record<string, string> = {
    str: 'Strength',
    vit: 'Vitality',
    foc: 'Focus',
    agi: 'Agility',
    dex: 'Dexterity',
    res: 'Resolve',
    per: 'Perception',
};

const AURA_COLORS: Record<string, string> = {
    Flame: '#e05c2a',
    Photon: '#4ab5e8',
    Mineral: '#8a7a5a',
};

interface CharacterCreationProps {
    onConfirm: (name: string, classId: ClassId, traitId: TraitId) => void;
}

export default function CharacterCreation({ onConfirm }: CharacterCreationProps) {
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState<ClassId | null>(null);
    const [selectedTrait, setSelectedTrait] = useState<TraitId | null>(null);
    const [nameError, setNameError] = useState('');

    const cls = selectedClass ? PLAYER_CLASSES[selectedClass] : null;

    function handleClassSelect(classId: ClassId) {
        setSelectedClass(classId);
        setSelectedTrait(null);
    }

    function handleConfirm() {
        const trimmed = name.trim();
        if (!trimmed) { setNameError('Enter your name, Progenitor.'); return; }
        if (trimmed.length > 20) { setNameError('Name must be 20 characters or fewer.'); return; }
        if (!selectedClass) return;
        if (!selectedTrait) return;
        onConfirm(trimmed, selectedClass, selectedTrait);
    }

    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            px: 3,
            py: 4,
            overflowY: 'auto',
            background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)',
        }}>
            {/* Header */}
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, color: '#a8d67e', mb: 0.5, textAlign: 'center' }}
            >
                The Progenitors
            </Typography>
            <Typography
                fontFamily={FONTS.NECTO_MONO}
                sx={{ fontSize: '0.85rem', color: '#6a8fa0', mb: 4, textAlign: 'center', letterSpacing: 2 }}
            >
                CHARACTER CREATION
            </Typography>

            {/* Name */}
            <Box sx={{ width: '100%', maxWidth: 480, mb: 4 }}>
                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#b0b0b0', mb: 1, fontSize: '0.8rem', letterSpacing: 1 }}>
                    YOUR NAME
                </Typography>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Enter name..."
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(''); }}
                    error={!!nameError}
                    helperText={nameError}
                    inputProps={{ maxLength: 20 }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#ffffff',
                            fontFamily: FONTS.NECTO_MONO,
                            '& fieldset': { borderColor: '#2a3a4a' },
                            '&:hover fieldset': { borderColor: '#4ab5e8' },
                            '&.Mui-focused fieldset': { borderColor: '#a8d67e' },
                        },
                        '& .MuiFormHelperText-root': { color: '#e05c2a', fontFamily: FONTS.NECTO_MONO },
                    }}
                />
            </Box>

            {/* Class Selection */}
            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#b0b0b0', mb: 2, fontSize: '0.8rem', letterSpacing: 1, width: '100%', maxWidth: 900 }}>
                CHOOSE YOUR CLASS
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 4, width: '100%', maxWidth: 900 }}>
                {Object.values(PLAYER_CLASSES).map((playerClass: PlayerClass) => (
                    <ClassCard
                        key={playerClass.id}
                        playerClass={playerClass}
                        selected={selectedClass === playerClass.id}
                        onSelect={() => handleClassSelect(playerClass.id)}
                    />
                ))}
            </Box>

            {/* Trait Selection */}
            {cls && (
                <Box sx={{ width: '100%', maxWidth: 900, mb: 4 }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#b0b0b0', mb: 2, fontSize: '0.8rem', letterSpacing: 1 }}>
                        CHOOSE A TRAIT
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {cls.traits.map((traitId) => {
                            const trait = TRAITS[traitId];
                            const isSelected = selectedTrait === traitId;
                            return (
                                <Card
                                    key={traitId}
                                    onClick={() => setSelectedTrait(traitId)}
                                    sx={{
                                        flex: '1 1 200px',
                                        maxWidth: 280,
                                        cursor: 'pointer',
                                        background: isSelected ? 'rgba(168,214,126,0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isSelected ? '#a8d67e' : '#2a3a2a'}`,
                                        transition: 'all 0.2s ease',
                                        '&:hover': { border: '1px solid #a8d67e55', background: 'rgba(168,214,126,0.05)' },
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: isSelected ? '#a8d67e' : '#ffffff', fontSize: '0.85rem', mb: 1 }}>
                                            {trait.name}
                                        </Typography>
                                        <Typography sx={{ color: '#8a9a8a', fontSize: '0.75rem', lineHeight: 1.5 }}>
                                            {trait.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Confirm */}
            <Button
                variant="contained"
                size="large"
                disabled={!name.trim() || !selectedClass || !selectedTrait}
                onClick={handleConfirm}
                sx={{
                    fontFamily: FONTS.NECTO_MONO,
                    fontSize: '1rem',
                    px: 6,
                    py: 1.5,
                    backgroundColor: '#a8d67e',
                    color: '#1a1a1a',
                    '&:hover': { backgroundColor: '#c5e8a4' },
                    '&.Mui-disabled': { backgroundColor: '#2a3a2a', color: '#4a5a4a' },
                }}
            >
                Begin Journey
            </Button>

            {/* Lore blurb */}
            <Typography
                sx={{ mt: 4, color: '#4a5a6a', fontSize: '0.75rem', fontStyle: 'italic', maxWidth: 480, textAlign: 'center', lineHeight: 1.7 }}
            >
                You are a Progenitor — born of The First's bloodline. Your affinity for Spirit Aura sets you apart from all others.
                The year is 6999. The races gather at Preacher's Peak. Something stirs in the dark below.
            </Typography>
        </Box>
    );
}

// ─── Class Card Sub-component ─────────────────────────────────────────────────

function ClassCard({ playerClass, selected, onSelect }: {
    playerClass: PlayerClass;
    selected: boolean;
    onSelect: () => void;
}) {
    const auraColor = AURA_COLORS[playerClass.auraAffinity] ?? '#a8d67e';

    return (
        <Card
            onClick={onSelect}
            sx={{
                flex: '1 1 240px',
                maxWidth: 280,
                cursor: 'pointer',
                background: selected ? `${auraColor}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected ? auraColor : '#2a2a3a'}`,
                transition: 'all 0.2s ease',
                '&:hover': { border: `1px solid ${auraColor}66`, background: `${auraColor}08` },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                {/* Class name + aura chip */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: selected ? auraColor : '#ffffff', fontSize: '1rem', fontWeight: 600 }}>
                        {playerClass.name}
                    </Typography>
                    <Chip
                        label={playerClass.auraAffinity}
                        size="small"
                        sx={{ backgroundColor: `${auraColor}22`, color: auraColor, fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', height: 20 }}
                    />
                </Box>

                <Typography sx={{ color: '#8a9aaa', fontSize: '0.72rem', lineHeight: 1.5, mb: 2 }}>
                    {playerClass.description}
                </Typography>

                <Divider sx={{ borderColor: '#2a3a2a', mb: 1.5 }} />

                {/* Stats */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Object.entries(playerClass.baseStats).map(([key, val]) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#5a7a8a', fontSize: '0.65rem', letterSpacing: 0.5 }}>
                                {STAT_LABELS[key]}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.3 }}>
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '1px',
                                            backgroundColor: i < val ? auraColor : '#2a3a2a',
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    ))}
                </Box>

                {/* Abilities preview */}
                <Divider sx={{ borderColor: '#2a3a2a', my: 1.5 }} />
                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a6a5a', fontSize: '0.6rem', letterSpacing: 1, mb: 0.5 }}>
                    ABILITIES
                </Typography>
                <Typography sx={{ color: '#6a8a7a', fontSize: '0.68rem' }}>
                    {playerClass.abilities.slice(0, 3).join(' · ')}
                </Typography>
            </CardContent>
        </Card>
    );
}
