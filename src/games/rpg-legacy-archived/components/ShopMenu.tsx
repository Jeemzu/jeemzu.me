import { useState } from 'react';
import { Box, Typography, Button, List, ListItem, Chip, Divider } from '@mui/material';
import { FaCoins } from 'react-icons/fa';
import { FONTS } from '../../../lib/globals';
import { ITEMS, SHOP_INVENTORY } from '../data/items';
import type { ClassId, ItemInstance } from '../types';

const RARITY_COLORS: Record<string, string> = {
    common: '#8a9aaa',
    uncommon: '#4ab5e8',
    rare: '#c0a040',
};

const CATEGORY_LABEL: Record<string, string> = {
    consumable: 'Consumable',
    weapon: 'Weapon',
    armor: 'Armor',
};

interface ShopMenuProps {
    gold: number;
    inventory: ItemInstance[];
    classId: ClassId;
    equippedWeapon: string | null;
    equippedArmor: string | null;
    onBuy: (itemId: string) => void;
    onSell: (itemId: string) => void;
    onEquip: (itemId: string) => void;
    onClose: () => void;
}

export default function ShopMenu({
    gold,
    inventory,
    classId,
    equippedWeapon,
    equippedArmor,
    onBuy,
    onSell,
    onEquip,
    onClose,
}: ShopMenuProps) {
    const [tab, setTab] = useState<'shop' | 'inventory'>('shop');

    function canEquip(itemId: string): boolean {
        const item = ITEMS[itemId];
        if (!item) return false;
        if (!item.classRestriction) return item.category !== 'consumable';
        return item.classRestriction.includes(classId) && item.category !== 'consumable';
    }

    function isEquipped(itemId: string): boolean {
        return equippedWeapon === itemId || equippedArmor === itemId;
    }

    return (
        <Box sx={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
        }}>
            {/* Header */}
            <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid #2a3a2a' }}>
                <Button onClick={onClose} sx={{ color: '#6a8fa0', fontFamily: FONTS.NECTO_MONO, fontSize: '0.7rem', mb: 0.5, p: 0 }}>
                    ← Back to Town
                </Button>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ fontSize: '1.4rem', color: '#4ab5e8' }}>
                        Brix's Emporium
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FaCoins style={{ color: '#c0a040' }} />
                        <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c0a040', fontSize: '0.9rem' }}>
                            {gold}g
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Tab toggle */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid #2a3a2a' }}>
                {(['shop', 'inventory'] as const).map(t => (
                    <Button
                        key={t}
                        onClick={() => setTab(t)}
                        sx={{
                            flex: 1,
                            py: 1.2,
                            borderRadius: 0,
                            fontFamily: FONTS.NECTO_MONO,
                            fontSize: '0.7rem',
                            letterSpacing: 1,
                            color: tab === t ? '#a8d67e' : '#4a6a5a',
                            borderBottom: tab === t ? '2px solid #a8d67e' : '2px solid transparent',
                        }}
                    >
                        {t === 'shop' ? 'SHOP' : 'INVENTORY'}
                    </Button>
                ))}
            </Box>

            {/* Items list */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                <List disablePadding>
                    {(tab === 'shop' ? SHOP_INVENTORY : inventory.map(i => i.itemId)).map((itemId, idx) => {
                        const item = ITEMS[itemId];
                        if (!item) return null;
                        const invItem = inventory.find(i => i.itemId === itemId);
                        const qty = invItem?.quantity ?? 0;
                        const restricted = item.classRestriction && !item.classRestriction.includes(classId);

                        return (
                            <Box key={`${itemId}-${idx}`}>
                                <ListItem disablePadding sx={{ py: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                    {/* Item header row */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                                <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: restricted ? '#3a4a5a' : '#c0d0c0', fontSize: '0.85rem' }}>
                                                    {item.name}
                                                </Typography>
                                                <Chip
                                                    label={item.rarity}
                                                    size="small"
                                                    sx={{ backgroundColor: 'transparent', color: RARITY_COLORS[item.rarity], border: `1px solid ${RARITY_COLORS[item.rarity]}44`, fontFamily: FONTS.NECTO_MONO, fontSize: '0.55rem', height: 16 }}
                                                />
                                                <Chip
                                                    label={CATEGORY_LABEL[item.category]}
                                                    size="small"
                                                    sx={{ backgroundColor: 'transparent', color: '#4a6a7a', border: '1px solid #2a4a5a44', fontFamily: FONTS.NECTO_MONO, fontSize: '0.55rem', height: 16 }}
                                                />
                                                {isEquipped(itemId) && (
                                                    <Chip label="EQUIPPED" size="small" sx={{ backgroundColor: '#a8d67e22', color: '#a8d67e', fontFamily: FONTS.NECTO_MONO, fontSize: '0.55rem', height: 16 }} />
                                                )}
                                                {tab === 'inventory' && qty > 1 && (
                                                    <Typography sx={{ color: '#4ab5e8', fontSize: '0.65rem', fontFamily: FONTS.NECTO_MONO }}>×{qty}</Typography>
                                                )}
                                            </Box>
                                            <Typography sx={{ color: '#5a7a8a', fontSize: '0.7rem', lineHeight: 1.4 }}>
                                                {item.description}
                                            </Typography>
                                            <Typography sx={{ color: '#3a4a5a', fontSize: '0.65rem', fontStyle: 'italic', mt: 0.3 }}>
                                                {item.flavorText}
                                            </Typography>
                                            {item.weaponBase !== undefined && (
                                                <Typography sx={{ color: '#8a7a5a', fontSize: '0.65rem', mt: 0.3 }}>
                                                    +{item.weaponBase} ATK
                                                </Typography>
                                            )}
                                            {item.armorDef !== undefined && (
                                                <Typography sx={{ color: '#5a8a7a', fontSize: '0.65rem', mt: 0.3 }}>
                                                    +{item.armorDef} DEF
                                                </Typography>
                                            )}
                                            {restricted && (
                                                <Typography sx={{ color: '#5a3a3a', fontSize: '0.65rem', mt: 0.3 }}>
                                                    Not usable by your class
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Action area */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8, ml: 2 }}>
                                            {tab === 'shop' ? (
                                                <>
                                                    <Typography fontFamily={FONTS.NECTO_MONO} sx={{ color: '#c0a040', fontSize: '0.75rem' }}>
                                                        {item.cost}g
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        disabled={gold < item.cost || !!restricted}
                                                        onClick={() => onBuy(itemId)}
                                                        sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.65rem', color: '#a8d67e', border: '1px solid #a8d67e44', px: 1.5, py: 0.3, minWidth: 0 }}
                                                    >
                                                        Buy
                                                    </Button>
                                                </>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {canEquip(itemId) && !isEquipped(itemId) && (
                                                        <Button
                                                            size="small"
                                                            onClick={() => onEquip(itemId)}
                                                            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.6rem', color: '#4ab5e8', border: '1px solid #4ab5e844', px: 1, py: 0.3, minWidth: 0 }}
                                                        >
                                                            Equip
                                                        </Button>
                                                    )}
                                                    {qty > 0 && (
                                                        <Button
                                                            size="small"
                                                            onClick={() => onSell(itemId)}
                                                            sx={{ fontFamily: FONTS.NECTO_MONO, fontSize: '0.6rem', color: '#c0a040', border: '1px solid #c0a04044', px: 1, py: 0.3, minWidth: 0 }}
                                                        >
                                                            Sell ({Math.floor(item.cost / 2)}g)
                                                        </Button>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                                <Divider sx={{ borderColor: '#1a2a1a' }} />
                            </Box>
                        );
                    })}
                </List>
            </Box>
        </Box>
    );
}

