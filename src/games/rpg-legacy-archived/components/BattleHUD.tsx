import { useState } from 'react';
import { Box, Typography, Button, LinearProgress, List, ListItem } from '@mui/material';
import { FONTS } from '../../../lib/globals';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/items';
import { PLAYER_CLASSES } from '../data/classes';
import type { RPGGameState, BattleActionType, ItemId } from '../types';

const AURA_TYPE_COLORS: Record<string, string> = {
    Flame: '#e05c2a',
    Photon: '#4ab5e8',
    Mineral: '#8a7a5a',
    Gravity: '#9b59b6',
    Liquid: '#2ecc71',
    Static: '#f1c40f',
};

const LOG_COLORS: Record<string, string> = {
    damage: '#ff8060',
    heal: '#a8d67e',
    miss: '#8a9aaa',
    crit: '#ff4040',
    system: '#4ab5e8',
    weakness: '#ffa040',
    resist: '#6090c0',
};

interface BattleHUDProps {
    state: RPGGameState;
    onAction: (type: BattleActionType, abilityId?: string, itemId?: ItemId) => void;
    disabled: boolean;
}

export default function BattleHUD({ state, onAction, disabled }: BattleHUDProps) {
    const { character, battle } = state;
    const enemy = battle.enemy;
    const enemyState = battle.enemyState;
    const [showItems, setShowItems] = useState(false);

    if (!enemy || !enemyState) return null;

    const cls = character.classId;
    const abilityIds = PLAYER_CLASSES[cls]?.abilities ?? [];

    const maxHP = character.stats.vit * 10 + 50;
    const maxAura = character.stats.foc * 5 + 20;
    const hpPct = Math.max(0, (character.currentHP / maxHP) * 100);
    const auraPct = Math.max(0, (character.currentAura / maxAura) * 100);
    const enemyHPPct = Math.max(0, (enemyState.currentHP / enemyState.maxHP) * 100);

    const consumables = state.inventory.filter(i => {
        const item = ITEMS[i.itemId];
        return item?.category === 'consumable' && i.quantity > 0;
    });

    const isPlayerTurn = battle.phase === 'playerTurn' && !disabled;

    return (
        <Box sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none',
        }}>
            {/* Top: Enemy HP */}
            <Box sx={{
                px: 2,
                pt: 1.5,
                pointerEvents: 'none',
            }}>
                <Box sx={{ maxWidth: 300, ml: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#e05c2a', fontSize: '0.7rem' }}>
                            {enemy.name}{enemyState.isPhase2 ? ' [PHASE 2]' : ''}
                        </Typography>
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#8a5a4a', fontSize: '0.65rem' }}>
                            {enemyState.currentHP} / {enemyState.maxHP}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={enemyHPPct}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#2a1a1a',
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: enemyHPPct < 25 ? '#ff4040' : '#e05c2a',
                                borderRadius: 4,
                            },
                        }}
                    />
                    {enemy.isBoss && (
                        <Typography sx={{ color: '#e05c2a', fontSize: '0.55rem', fontFamily: FONTS.NECTO_MONO, mt: 0.3, textAlign: 'right', opacity: 0.6 }}>
                            BOSS — Weakness: {enemyState.isPhase2 ? (enemy.phase2Weakness ?? enemy.weakness) : enemy.weakness} · Resist: {enemy.resistance}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Bottom: Player HP/Aura + Actions + Log */}
            <Box sx={{ pointerEvents: 'all' }}>
                {/* Battle Log */}
                <Box sx={{
                    mx: 1,
                    mb: 1,
                    maxHeight: 80,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 1,
                    px: 1.5,
                    py: 0.5,
                }}>
                    {battle.log.slice(-5).map((entry, i) => (
                        <Typography key={i} sx={{ color: LOG_COLORS[entry.type] ?? '#c0d0c0', fontSize: '0.68rem', lineHeight: 1.6 }}>
                            {entry.text}
                        </Typography>
                    ))}
                </Box>

                {/* Player HP/Aura bars */}
                <Box sx={{ mx: 1, mb: 1, background: 'rgba(0,0,0,0.7)', borderRadius: 1, px: 1.5, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#a8d67e', fontSize: '0.65rem', minWidth: 40 }}>
                            {character.name}
                        </Typography>
                        <Typography sx={{ color: '#4a6a5a', fontSize: '0.6rem' }}>LV {character.level}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c05050', fontSize: '0.6rem', minWidth: 22 }}>HP</Typography>
                        <LinearProgress variant="determinate" value={hpPct} sx={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: '#2a1a1a', '& .MuiLinearProgress-bar': { backgroundColor: hpPct < 25 ? '#ff3030' : '#c05050', borderRadius: 4 } }} />
                        <Typography sx={{ color: '#8a5a5a', fontSize: '0.58rem', fontFamily: FONTS.NECTO_MONO, minWidth: 60, textAlign: 'right' }}>
                            {character.currentHP}/{maxHP}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#4a8ab5', fontSize: '0.6rem', minWidth: 22 }}>SA</Typography>
                        <LinearProgress variant="determinate" value={auraPct} sx={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: '#1a2a3a', '& .MuiLinearProgress-bar': { backgroundColor: '#4a8ab5', borderRadius: 4 } }} />
                        <Typography sx={{ color: '#4a6a8a', fontSize: '0.58rem', fontFamily: FONTS.NECTO_MONO, minWidth: 60, textAlign: 'right' }}>
                            {character.currentAura}/{maxAura}
                        </Typography>
                    </Box>
                </Box>

                {/* Item sub-menu */}
                {showItems && (
                    <Box sx={{ mx: 1, mb: 1, background: 'rgba(0,0,0,0.85)', borderRadius: 1, p: 1, border: '1px solid #2a3a2a' }}>
                        {consumables.length === 0 ? (
                            <Typography sx={{ color: '#4a6a5a', fontSize: '0.7rem', p: 0.5 }}>No items.</Typography>
                        ) : (
                            <List disablePadding dense>
                                {consumables.map(({ itemId, quantity }) => {
                                    const item = ITEMS[itemId];
                                    if (!item) return null;
                                    return (
                                        <ListItem key={itemId} disablePadding>
                                            <Button
                                                fullWidth
                                                size="small"
                                                disabled={!isPlayerTurn}
                                                onClick={() => { onAction('item', undefined, itemId); setShowItems(false); }}
                                                sx={{ justifyContent: 'flex-start', color: '#c0d0c0', fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', py: 0.3 }}
                                            >
                                                {item.name} ×{quantity}
                                                <Typography component="span" sx={{ ml: 1, color: '#4a6a5a', fontSize: '0.6rem' }}>
                                                    {item.description}
                                                </Typography>
                                            </Button>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}
                        <Button size="small" onClick={() => setShowItems(false)} sx={{ color: '#4a6a5a', fontFamily: FONTS.NECTO_MONO, fontSize: '0.6rem' }}>
                            Cancel
                        </Button>
                    </Box>
                )}

                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 0.8, px: 1, pb: 1.5, flexWrap: 'wrap' }}>
                    {/* Basic Attack */}
                    <ActionButton
                        label="Attack"
                        disabled={!isPlayerTurn}
                        color="#c0c0c0"
                        onClick={() => onAction('attack')}
                    />

                    {/* Abilities 1-3 */}
                    {abilityIds.slice(0, 3).map((abilityId: string) => {
                        const ability = ABILITIES[abilityId];
                        if (!ability) return null;
                        const cooldownLeft = battle.abilityCooldowns[abilityId] ?? 0;
                        const canAfford = character.currentAura >= ability.auraCost;
                        const auraColor = AURA_TYPE_COLORS[ability.auraType] ?? '#a8d67e';

                        return (
                            <ActionButton
                                key={abilityId}
                                label={ability.name}
                                subLabel={`${ability.auraCost} SA${cooldownLeft > 0 ? ` · ${cooldownLeft}t` : ''}`}
                                disabled={!isPlayerTurn || cooldownLeft > 0 || !canAfford}
                                color={auraColor}
                                onClick={() => onAction('ability', abilityId)}
                            />
                        );
                    })}

                    {/* Ultimate */}
                    {abilityIds[3] && (() => {
                        const ult = ABILITIES[abilityIds[3]];
                        if (!ult) return null;
                        const cooldownLeft = battle.abilityCooldowns[abilityIds[3]] ?? 0;
                        const canAfford = character.currentAura >= ult.auraCost;
                        const auraColor = AURA_TYPE_COLORS[ult.auraType] ?? '#a8d67e';
                        return (
                            <ActionButton
                                key={abilityIds[3]}
                                label={`★ ${ult.name}`}
                                subLabel={`${ult.auraCost} SA${cooldownLeft > 0 ? ` · ${cooldownLeft}t` : ''}`}
                                disabled={!isPlayerTurn || cooldownLeft > 0 || !canAfford}
                                color={auraColor}
                                onClick={() => onAction('ability', abilityIds[3])}
                            />
                        );
                    })()}

                    {/* Item */}
                    <ActionButton
                        label="Item"
                        disabled={!isPlayerTurn}
                        color="#c0a040"
                        onClick={() => setShowItems(prev => !prev)}
                    />

                    {/* Flee */}
                    {!enemy.isBoss && (
                        <ActionButton
                            label="Flee"
                            disabled={!isPlayerTurn}
                            color="#6a7a8a"
                            onClick={() => onAction('flee')}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
}

function ActionButton({ label, subLabel, disabled, color, onClick }: {
    label: string;
    subLabel?: string;
    disabled: boolean;
    color: string;
    onClick: () => void;
}) {
    return (
        <Button
            size="small"
            disabled={disabled}
            onClick={onClick}
            sx={{
                flex: '1 1 100px',
                flexDirection: 'column',
                p: 0.8,
                background: `${color}18`,
                border: `1px solid ${color}44`,
                borderRadius: 1.5,
                color: disabled ? '#3a4a5a' : color,
                fontFamily: FONTS.NECTO_MONO,
                fontSize: '0.65rem',
                lineHeight: 1.2,
                minWidth: 0,
                transition: 'all 0.15s ease',
                '&:hover:not(.Mui-disabled)': {
                    background: `${color}30`,
                    borderColor: `${color}88`,
                },
                '&.Mui-disabled': {
                    color: '#2a3a4a',
                    borderColor: '#1a2a1a',
                    background: 'transparent',
                },
            }}
        >
            {label}
            {subLabel && (
                <Typography component="span" sx={{ display: 'block', fontSize: '0.55rem', color: 'inherit', opacity: 0.7 }}>
                    {subLabel}
                </Typography>
            )}
        </Button>
    );
}
