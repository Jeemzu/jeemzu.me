import type { Enemy } from '../types';

export const ENEMIES: Record<string, Enemy> = {
    aura_parasite: {
        id: 'aura_parasite',
        name: 'Aura Parasite',
        lore: 'A creature that evolved near unstable Spirit Aura vents. It survives by draining the aura of other beings — including Progenitors.',
        spriteColor: 0x9b59b6, // purple
        stats: { hp: 60, atk: 8, def: 4, aura: 30 },
        weakness: 'Mineral',
        resistance: 'Photon',
        statXPDrops: { foc: 18, per: 10 },
        goldDrop: 12,
        abilities: [
            {
                id: 'parasite_basic',
                name: 'Aura Bite',
                description: 'A basic gnawing attack.',
                damageMult: 1.0,
                priority: 0,
            },
            {
                id: 'parasite_drain',
                name: 'Aura Drain',
                description: 'Siphons Spirit Aura from the target.',
                damageMult: 0.7,
                effect: { type: 'drain_aura', value: 20, duration: 0 },
                priority: 1,
            },
        ],
    },

    iron_sentinel: {
        id: 'iron_sentinel',
        name: 'Iron Sentinel',
        lore: 'A mechanical guardian from an ancient era — its origins unknown. Some believe the Mechanizers built them to patrol the mountain paths. They respond to nothing but force.',
        spriteColor: 0x7f8c8d, // steel grey
        stats: { hp: 120, atk: 12, def: 14, aura: 10 },
        weakness: 'Flame',
        resistance: 'Mineral',
        statXPDrops: { str: 14, vit: 12, res: 8 },
        goldDrop: 20,
        abilities: [
            {
                id: 'sentinel_basic',
                name: 'Iron Fist',
                description: 'A heavy mechanical blow.',
                damageMult: 1.0,
                priority: 0,
            },
            {
                id: 'sentinel_slam',
                name: 'Iron Slam',
                description: 'A crushing ground-shaking strike.',
                damageMult: 1.8,
                priority: 1,
            },
        ],
    },

    void_tendril: {
        id: 'void_tendril',
        name: 'Void Tendril',
        lore: 'A creature from the border regions of Thrae\'s atmosphere — where Spirit Aura begins to behave erratically. It exists in a half-state between presence and absence, healing itself constantly.',
        spriteColor: 0x2c3e50, // deep void blue
        stats: { hp: 80, atk: 10, def: 6, aura: 40 },
        weakness: 'Photon',
        resistance: 'Flame',
        statXPDrops: { per: 16, agi: 12, dex: 8 },
        goldDrop: 16,
        abilities: [
            {
                id: 'tendril_basic',
                name: 'Void Lash',
                description: 'A whip of void energy.',
                damageMult: 1.0,
                priority: 0,
            },
            {
                id: 'tendril_siphon',
                name: 'Void Siphon',
                description: 'Siphons life while healing itself.',
                damageMult: 0.9,
                effect: { type: 'self_heal', value: 0.1, duration: 0 },
                priority: 1,
            },
        ],
    },

    fracture_beast: {
        id: 'fracture_beast',
        name: 'Fracture Beast',
        lore: 'A predator that has adapted to the unstable Spirit Aura of The Fracture zone. It attacks with relentless aggression, overwhelming prey before they can react.',
        spriteColor: 0xc0392b, // aggressive red
        stats: { hp: 90, atk: 16, def: 8, aura: 20 },
        weakness: 'Flame',
        resistance: 'Mineral',
        statXPDrops: { dex: 18, agi: 14, str: 8 },
        goldDrop: 22,
        abilities: [
            {
                id: 'fracture_basic',
                name: 'Savage Strike',
                description: 'A rapid claw swipe.',
                damageMult: 1.0,
                priority: 0,
            },
            {
                id: 'fracture_flurry',
                name: 'Fracture Flurry',
                description: 'A barrage of rapid strikes.',
                damageMult: 2.2,
                priority: 1,
            },
        ],
    },

    hollow_colossus: {
        id: 'hollow_colossus',
        name: 'The Hollow Colossus',
        lore: 'An ancient entity that predates Thrae\'s recorded history. Its Spirit Aura is so corrupted it has become hollow — a shell of immense power fueled by nothing but entropy. Scholars believe it may be one of The First\'s failed experiments.',
        spriteColor: 0x1a1a2e, // near-black deep void
        stats: { hp: 300, atk: 20, def: 18, aura: 80 },
        weakness: 'Photon',
        resistance: 'Gravity',
        statXPDrops: { str: 20, vit: 20, foc: 20, agi: 15, dex: 15, res: 15, per: 15 },
        goldDrop: 80,
        isBoss: true,
        phaseThreshold: 0.5,
        phase2Weakness: 'Mineral',
        abilities: [
            {
                id: 'colossus_basic',
                name: 'Colossus Strike',
                description: 'A towering blow.',
                damageMult: 1.0,
                priority: 0,
            },
            {
                id: 'colossus_shatter',
                name: 'Hollow Shatter',
                description: 'Channels corrupted aura into a devastating burst.',
                damageMult: 2.8,
                effect: { type: 'debuff_def', value: 0.2, duration: 2 },
                priority: 1,
            },
        ],
    },
};
