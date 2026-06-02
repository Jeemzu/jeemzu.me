import { useState } from 'react';
import { Box, Typography, Button, Avatar } from '@mui/material';
import { FaBed, FaStore, FaChevronRight } from 'react-icons/fa';
import { FONTS } from '../../../lib/globals';
import { NPCS } from '../data/locations';
import type { RPGGameState } from '../types';

interface TownViewProps {
    character: RPGGameState['character'];
    gold: number;
    onRest: () => void;
    onOpenShop: () => void;
    onBack: () => void;
}

export default function TownView({ gold, onRest, onOpenShop, onBack }: TownViewProps) {
    const [activeNpc, setActiveNpc] = useState<string | null>(null);
    const [dialogueIndex, setDialogueIndex] = useState(0);

    const loreKeeper = NPCS['lore_keeper'];
    const merchant = NPCS['merchant'];
    const npcList = [loreKeeper, merchant];

    function selectNpc(id: string) {
        if (activeNpc === id) {
            // Advance dialogue
            const npc = npcList.find(n => n.id === id)!;
            if (dialogueIndex < npc.dialogueLines.length - 1) {
                setDialogueIndex(prev => prev + 1);
            } else {
                setActiveNpc(null);
                setDialogueIndex(0);
            }
        } else {
            setActiveNpc(id);
            setDialogueIndex(0);
        }
    }

    const currentNpc = npcList.find(n => n.id === activeNpc);
    const currentLine = currentNpc?.dialogueLines[dialogueIndex];

    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #2c1810 100%)',
            position: 'relative',
        }}>
            {/* Scene header */}
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                <Button
                    onClick={onBack}
                    sx={{ color: '#6a8fa0', fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', mb: 1, p: 0 }}
                >
                    ← World Map
                </Button>
                <Typography fontFamily={FONTS.PALACE} sx={{ fontSize: '1.6rem', color: '#a8d67e' }}>
                    Ascent of Thrae
                </Typography>
                <Typography sx={{ color: '#5a7a6a', fontSize: '0.72rem', fontFamily: FONTS.NECTO_MONO }}>
                    SAFE ZONE · Gold: {gold}g
                </Typography>
            </Box>

            {/* Town scene visual */}
            <Box sx={{
                mx: 3,
                my: 2,
                height: 120,
                borderRadius: 2,
                background: 'linear-gradient(180deg, #0d1a2e 0%, #1a2a1a 60%, #2a1a0d 100%)',
                border: '1px solid #2a3a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Stars */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <Box key={i} sx={{
                        position: 'absolute',
                        width: i % 3 === 0 ? 3 : 2,
                        height: i % 3 === 0 ? 3 : 2,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        opacity: 0.4 + (i % 5) * 0.1,
                        top: `${10 + (i * 17) % 60}%`,
                        left: `${(i * 23) % 95}%`,
                    }} />
                ))}
                <Typography sx={{ color: '#4a6a5a', fontSize: '0.75rem', fontStyle: 'italic', zIndex: 1 }}>
                    Firelight flickers among the tents of Preacher's Peak.
                </Typography>
            </Box>

            {/* NPCs */}
            <Box sx={{ px: 3, mb: 2 }}>
                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a6a5a', fontSize: '0.65rem', letterSpacing: 1, mb: 1.5 }}>
                    PEOPLE NEARBY
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {npcList.map(npc => (
                        <Button
                            key={npc.id}
                            onClick={() => selectNpc(npc.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.5,
                                background: activeNpc === npc.id ? 'rgba(168,214,126,0.1)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${activeNpc === npc.id ? '#a8d67e' : '#2a3a2a'}`,
                                borderRadius: 2,
                                textAlign: 'left',
                                transition: 'all 0.2s ease',
                                '&:hover': { borderColor: '#a8d67e55', background: 'rgba(168,214,126,0.06)' },
                            }}
                        >
                            <Avatar sx={{ width: 36, height: 36, background: '#2a3a2a', color: '#a8d67e', fontSize: '0.8rem' }}>
                                {npc.name[0]}
                            </Avatar>
                            <Box>
                                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c0d0c0', fontSize: '0.8rem' }}>
                                    {npc.name}
                                </Typography>
                                <Typography sx={{ color: '#4a6a5a', fontSize: '0.65rem' }}>
                                    {npc.role}
                                </Typography>
                            </Box>
                        </Button>
                    ))}
                </Box>
            </Box>

            {/* Dialogue box */}
            {currentLine && (
                <Box sx={{
                    mx: 3,
                    p: 2,
                    mb: 2,
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid #2a4a3a',
                    borderRadius: 2,
                    cursor: 'pointer',
                }}
                    onClick={() => selectNpc(activeNpc!)}
                >
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#a8d67e', fontSize: '0.7rem', mb: 0.5 }}>
                        {currentLine.speaker}
                    </Typography>
                    <Typography sx={{ color: '#c0d0c0', fontSize: '0.82rem', lineHeight: 1.6 }}>
                        "{currentLine.text}"
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <FaChevronRight style={{ color: '#4a6a5a', fontSize: '0.6rem' }} />
                    </Box>
                </Box>
            )}

            {/* Actions */}
            <Box sx={{ px: 3, mt: 'auto', pb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                    onClick={onRest}
                    startIcon={<FaBed />}
                    sx={{
                        flex: 1,
                        p: 1.5,
                        background: 'rgba(168,214,126,0.08)',
                        border: '1px solid #a8d67e44',
                        borderRadius: 2,
                        color: '#a8d67e',
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.8rem',
                        '&:hover': { background: 'rgba(168,214,126,0.15)', borderColor: '#a8d67e88' },
                    }}
                >
                    Rest (Full Heal)
                </Button>
                <Button
                    onClick={onOpenShop}
                    startIcon={<FaStore />}
                    sx={{
                        flex: 1,
                        p: 1.5,
                        background: 'rgba(74,181,232,0.08)',
                        border: '1px solid #4ab5e844',
                        borderRadius: 2,
                        color: '#4ab5e8',
                        fontFamily: FONTS.NECTO_MONO,
                        fontSize: '0.8rem',
                        '&:hover': { background: 'rgba(74,181,232,0.15)', borderColor: '#4ab5e888' },
                    }}
                >
                    Visit Shop
                </Button>
            </Box>
        </Box>
    );
}
