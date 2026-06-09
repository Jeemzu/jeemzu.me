import type { PlayerClass } from '../types';

export const PLAYER_CLASSES: Record<string, PlayerClass> = {
    berserker: {
        id: 'berserker',
        name: 'Berserker',
        description: 'A ferocious melee combatant who channels Flame aura into devastating physical attacks.',
        lore: 'Born from conflict, Berserkers are warriors whose Spirit Aura ignites with Flame the deeper they push into battle. The hotter the fight, the stronger they become.',
        auraAffinity: 'Flame',
        spriteColor: 0xe05c2a, // burnt orange
        baseStats: {
            str: 14,
            vit: 12,
            foc: 5,
            agi: 7,
            dex: 8,
            res: 8,
            per: 6,
        },
        abilities: ['ember_slash', 'flame_surge', 'searing_roar', 'berserkers_will'],
        traits: ['rage_driven', 'battle_scarred', 'patience_driven'],
        weaponProficiency: ['Crushing', 'Bladed'],
    },

    aura_weaver: {
        id: 'aura_weaver',
        name: 'Aura Weaver',
        description: 'A master of Spirit Aura manipulation who fires Photon beams and destabilizes enemy aura flows.',
        lore: 'Aura Weavers study the patterns of Spirit Aura as The First once did — reading the invisible threads that connect all living things. Their mastery allows them to bend those threads to their will.',
        auraAffinity: 'Photon',
        spriteColor: 0x4ab5e8, // Photon blue
        baseStats: {
            str: 5,
            vit: 7,
            foc: 15,
            agi: 8,
            dex: 9,
            res: 6,
            per: 10,
        },
        abilities: ['photon_bolt', 'aura_shield', 'resonant_wave', 'singularity'],
        traits: ['aura_sensitive', 'photon_infused', 'aura_savant'],
        weaponProficiency: ['Staff', 'Relic'],
    },

    bodyguard: {
        id: 'bodyguard',
        name: 'Bodyguard',
        description: 'An immovable guardian who uses Mineral aura to fortify themselves and punish attackers.',
        lore: 'Bodyguards draw on the deep mineral flows beneath Thrae\'s surface — the same energies the Subterrians mine. Their Spirit Aura hardens like stone under pressure.',
        auraAffinity: 'Mineral',
        spriteColor: 0x8a7a5a, // stone grey-brown
        baseStats: {
            str: 10,
            vit: 15,
            foc: 7,
            agi: 5,
            dex: 6,
            res: 12,
            per: 5,
        },
        abilities: ['stone_ward', 'fracture_strike', 'fortify', 'colossus_form'],
        traits: ['dedicated_defender', 'good_fit', 'stubborn_soul'],
        weaponProficiency: ['Shield', 'Crushing'],
    },
};

export const TRAITS = {
    // Berserker traits
    rage_driven: {
        id: 'rage_driven',
        name: 'Rage Driven',
        description: 'Physical damage increases as HP decreases. At 25% HP, deal +50% melee damage.',
        passiveTag: 'rage_driven' as const,
    },
    battle_scarred: {
        id: 'battle_scarred',
        name: 'Battle-Scarred',
        description: 'Heal for 20% of all melee damage dealt. Cannot use offensive magic abilities.',
        passiveTag: 'battle_scarred' as const,
    },
    patience_driven: {
        id: 'patience_driven',
        name: 'Patience Driven',
        description: 'Gain 50% resistance to all damage-reducing debuffs permanently.',
        passiveTag: 'patience_driven' as const,
    },
    // Aura Weaver traits
    aura_sensitive: {
        id: 'aura_sensitive',
        name: 'Aura Sensitive',
        description: 'Ability damage increased by 15% but Spirit Aura costs are 10% higher.',
        passiveTag: 'aura_sensitive' as const,
    },
    photon_infused: {
        id: 'photon_infused',
        name: 'Photon Infused',
        description: 'Photon abilities apply a stacking +5% damage buff (max 3 stacks) each time they are used.',
        passiveTag: 'photon_infused' as const,
    },
    aura_savant: {
        id: 'aura_savant',
        name: 'Aura Savant',
        description: 'Regenerate 5 Spirit Aura at the start of each turn.',
        passiveTag: 'aura_savant' as const,
    },
    // Bodyguard traits
    dedicated_defender: {
        id: 'dedicated_defender',
        name: 'Dedicated Defender',
        description: 'After taking a hit, gain 15% damage reduction on the next turn.',
        passiveTag: 'dedicated_defender' as const,
    },
    good_fit: {
        id: 'good_fit',
        name: 'Good Fit',
        description: 'Reduce all armor stat requirements by 5. Armor provides +10% bonus defense.',
        passiveTag: 'good_fit' as const,
    },
    stubborn_soul: {
        id: 'stubborn_soul',
        name: 'Stubborn Soul',
        description: 'When HP drops below 20%, gain 75% damage reduction for 2 turns (once per battle).',
        passiveTag: 'stubborn_soul' as const,
    },
};
