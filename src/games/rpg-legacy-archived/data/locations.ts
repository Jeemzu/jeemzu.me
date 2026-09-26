import type { Location, NPC } from '../types';

export const LOCATIONS: Record<string, Location> = {
    ascent_of_thrae: {
        id: 'ascent_of_thrae',
        name: 'Ascent of Thrae',
        description: 'A base camp on the slopes of Preacher\'s Peak — safe ground for the millennium gathering.',
        lore: 'Every thousand years the races converge here to celebrate The First\'s discovery of Spirit Aura. Tents, fires, and merchants line the rocky paths. Tonight the air crackles with anticipation — and something else.',
        isSafe: true,
        enemyPool: [],
        backgroundGradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #2c1810 100%)',
    },

    the_undercroft: {
        id: 'the_undercroft',
        name: 'The Undercroft',
        description: 'Ancient caverns beneath Preacher\'s Peak, carved by centuries of Spirit Aura erosion.',
        lore: 'The Subterrians dug these tunnels long ago searching for Mineral deposits. They found them — along with something else that didn\'t belong. They sealed off the lower levels and never returned.',
        isSafe: false,
        maxDepth: 5,
        enemyPool: ['aura_parasite', 'iron_sentinel'],
        backgroundGradient: 'linear-gradient(180deg, #0d0d0d 0%, #1a0d0d 50%, #0d1a0d 100%)',
    },

    the_fracture: {
        id: 'the_fracture',
        name: 'The Fracture',
        description: 'A rift in the mountainside where Spirit Aura behaves unpredictably.',
        lore: 'Formed during a catastrophic Spirit Aura event decades ago — the same kind of event reported near the galactic border. Creatures here have adapted to the chaos. At its center waits something ancient and hollow.',
        isSafe: false,
        maxDepth: 5,
        enemyPool: ['void_tendril', 'fracture_beast'],
        unlocksAfter: 'the_undercroft',
        backgroundGradient: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 40%, #2e0a1a 100%)',
    },
};

export const NPCS: Record<string, NPC> = {
    lore_keeper: {
        id: 'lore_keeper',
        name: 'Elder Vasra',
        role: 'Lore Keeper',
        dialogueLines: [
            {
                speaker: 'Elder Vasra',
                text: 'Ah, a Progenitor. I\'ve been waiting for one of you. The Undercroft stirs with things that should not be there.',
            },
            {
                speaker: 'Elder Vasra',
                text: 'The Iron Sentinels below are Mechanizer-made — they hate Flame. Your best attacks against them will burn bright.',
            },
            {
                speaker: 'Elder Vasra',
                text: 'The Aura Parasites are weak to Mineral aura. They evolved to resist Photon — so don\'t waste your aura on that.',
            },
            {
                speaker: 'Elder Vasra',
                text: 'Beyond the Undercroft lies The Fracture. I warn you — what waits at its heart is hollow in a way no living thing should be.',
            },
            {
                speaker: 'Elder Vasra',
                text: 'The Hollow Colossus shifts its weaknesses mid-battle. Phase one: Photon tears it apart. Phase two: it adapts — use Mineral instead.',
            },
        ],
    },

    merchant: {
        id: 'merchant',
        name: 'Brix',
        role: 'Equipment Merchant',
        dialogueLines: [
            {
                speaker: 'Brix',
                text: 'Looking to gear up before you head down? Smart. The Undercroft doesn\'t care how brave you are if you\'re not prepared.',
            },
            {
                speaker: 'Brix',
                text: 'Health Serums are your best friend in the deep. Buy more than you think you\'ll need — and then buy more.',
            },
            {
                speaker: 'Brix',
                text: 'Spirit Shards replenish your aura mid-fight. Don\'t let yourself run dry — abilities are what separates a Progenitor from a common brawler.',
            },
            {
                speaker: 'Brix',
                text: 'I\'ve got equipment suited to every type of fighter. Take a look.',
            },
        ],
    },
};
