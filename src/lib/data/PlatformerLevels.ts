import { type LevelData } from '../LevelTypes';

export interface PlatformerLevel {
    number: number;
    name: string;
    data: LevelData;
}

// ─── Level definitions ────────────────────────────────────────────────────────
//
// worldX = total scroll distance (px) at which an object spawns at the right edge.
// Objects ~400 worldX apart = ~1.9 s gap at BASE_SPEED 3.5 px/frame (60 fps).
// Platform worldY = px above GROUND_Y to the platform's bottom surface.
// Jump height = 8.0² / (2 × 0.4) = 80 px. Player height (PH) = 32 px.
// Rise to land on platform = worldY + h. Max = 80 px, so worldY ≤ 64 with h=16.
// Use worldY ≈ 44 for a comfortable but deliberate jump (rise = 60 px, 75 % of max).
// Max horizontal jump distance at speed 3.5 = 40 frames × 3.5 = 140 px.
// Jump-over pits must be < 140 px wide; platform-required pits must be ≥ 160 px.

export const PLATFORMER_LEVELS: PlatformerLevel[] = [
    {
        number: 1,
        name: 'First Steps',
        data: {
            objects: [
                { type: 'spike', id: 'l1-1', worldX: 500 },
                { type: 'spike', id: 'l1-2', worldX: 1000 },
                { type: 'spike', id: 'l1-3', worldX: 1450 },
                { type: 'spike', id: 'l1-4', worldX: 1950 },
            ],
        },
    },
    {
        number: 2,
        name: 'Double Trouble',
        data: {
            objects: [
                { type: 'spike', id: 'l2-1', worldX: 400 },
                { type: 'spike', id: 'l2-2', worldX: 800 },
                { type: 'spike', id: 'l2-3', worldX: 900 },   // pair (100 px gap)
                { type: 'spike', id: 'l2-4', worldX: 1350 },
                { type: 'spike', id: 'l2-5', worldX: 1750 },
                { type: 'spike', id: 'l2-6', worldX: 1850 },  // pair
                { type: 'spike', id: 'l2-7', worldX: 2250 },
                { type: 'spike', id: 'l2-8', worldX: 2350 },  // pair
                { type: 'spike', id: 'l2-9', worldX: 2750 },
            ],
        },
    },
    {
        number: 3,
        name: 'Mind the Gap',
        data: {
            objects: [
                { type: 'spike', id: 'l3-1', worldX: 450 },
                { type: 'pit',   id: 'l3-2', worldX: 950,  width: 96  },  // 96 px — comfortable
                { type: 'spike', id: 'l3-3', worldX: 1450 },
                { type: 'spike', id: 'l3-4', worldX: 1550 },  // pair
                { type: 'pit',   id: 'l3-5', worldX: 2050, width: 112 },  // 112 px — needs good timing
                { type: 'spike', id: 'l3-6', worldX: 2600 },
                { type: 'pit',   id: 'l3-7', worldX: 3100, width: 128 },  // 128 px — tight timing
                { type: 'spike', id: 'l3-8', worldX: 3550 },
            ],
        },
    },
    {
        number: 4,
        name: 'High Ground',
        data: {
            objects: [
                { type: 'spike',    id: 'l4-1',  worldX: 400 },
                // Platform bridge over first pit — rise needed = 44+16 = 60 px (75 % of max 80)
                { type: 'platform', id: 'l4-2',  worldX: 852,  worldY: 44, width: 272, height: 16 },
                { type: 'pit',      id: 'l4-3',  worldX: 900,  width: 160 },
                { type: 'spike',    id: 'l4-4',  worldX: 1500 },
                { type: 'spike',    id: 'l4-5',  worldX: 1600 },  // pair
                // Platform bridge over second pit
                { type: 'platform', id: 'l4-6',  worldX: 2148, worldY: 44, width: 288, height: 16 },
                { type: 'pit',      id: 'l4-7',  worldX: 2200, width: 192 },
                { type: 'spike',    id: 'l4-8',  worldX: 2850 },
                // Platform bridge over third pit
                { type: 'platform', id: 'l4-9',  worldX: 3348, worldY: 44, width: 256, height: 16 },
                { type: 'pit',      id: 'l4-10', worldX: 3400, width: 160 },
                { type: 'spike',    id: 'l4-11', worldX: 3850 },
                { type: 'spike',    id: 'l4-12', worldX: 3950 },  // pair
            ],
        },
    },
    {
        number: 5,
        name: 'The Final Rush',
        data: {
            objects: [
                { type: 'spike',    id: 'l5-1',  worldX: 300 },
                { type: 'spike',    id: 'l5-2',  worldX: 700 },
                { type: 'spike',    id: 'l5-3',  worldX: 800 },   // pair
                { type: 'pit',      id: 'l5-4',  worldX: 1250, width: 96  },  // 96 px — jump-over
                { type: 'spike',    id: 'l5-5',  worldX: 1700 },
                // Platform bridge over wide pit (224 px > 140 px max jump — platform required)
                { type: 'platform', id: 'l5-6',  worldX: 2068, worldY: 44, width: 288, height: 16 },
                { type: 'pit',      id: 'l5-7',  worldX: 2100, width: 224 },
                { type: 'spike',    id: 'l5-8',  worldX: 2700 },
                { type: 'spike',    id: 'l5-9',  worldX: 2800 },  // pair
                { type: 'pit',      id: 'l5-10', worldX: 3300, width: 112 },  // 112 px — jump-over, tight
                { type: 'spike',    id: 'l5-11', worldX: 3750 },
                { type: 'spike',    id: 'l5-12', worldX: 3850 },  // pair
                // Platform bridge over final pit (256 px > 140 px — platform required)
                { type: 'platform', id: 'l5-13', worldX: 4348, worldY: 44, width: 320, height: 16 },
                { type: 'pit',      id: 'l5-14', worldX: 4400, width: 256 },
                { type: 'spike',    id: 'l5-15', worldX: 4950 },
                { type: 'pit',      id: 'l5-16', worldX: 5450, width: 128 },  // 128 px — tight ending jump
            ],
        },
    },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'platformer_highest_completed';

export function getHighestCompleted(): number {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
}

export function markLevelCompleted(levelNumber: number): void {
    const current = getHighestCompleted();
    if (levelNumber > current) {
        localStorage.setItem(STORAGE_KEY, String(levelNumber));
    }
}

export function isLevelUnlocked(levelNumber: number): boolean {
    if (levelNumber === 1) return true;
    return getHighestCompleted() >= levelNumber - 1;
}
