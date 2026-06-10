// Level definitions for Brick Break.
//
// Each level is an array of rows (top -> bottom). Each character maps to a
// brick type. Layouts are up to BRICK_COLS (13) characters wide; shorter rows
// (or trailing gaps) are treated as empty.
//
//   '.' / ' '  empty
//   '1'..'6'   colored bricks (1 hit) — higher tiers are worth more points
//   'a'        tough brick   (2 hits)
//   'b'        armored brick (3 hits)
//   '#'        unbreakable obstacle (never destroyed, ignored by win check)

export const BRICK_COLS = 13;

export interface BrickType {
    color: number;
    hits: number;
    points: number;
    breakable: boolean;
}

export const BRICK_TYPES: Record<string, BrickType> = {
    '1': { color: 0x4488ff, hits: 1, points: 10, breakable: true },
    '2': { color: 0x44cc44, hits: 1, points: 20, breakable: true },
    '3': { color: 0xffd23f, hits: 1, points: 30, breakable: true },
    '4': { color: 0xff8c42, hits: 1, points: 40, breakable: true },
    '5': { color: 0xff4d4d, hits: 1, points: 50, breakable: true },
    '6': { color: 0xb84dff, hits: 1, points: 60, breakable: true },
    'a': { color: 0xb0b0b0, hits: 2, points: 70, breakable: true },
    'b': { color: 0x6f6f7a, hits: 3, points: 110, breakable: true },
    '#': { color: 0x3a3a44, hits: Infinity, points: 0, breakable: false },
};

export function getBrickType(char: string): BrickType | null {
    return BRICK_TYPES[char] ?? null;
}

// 20 levels, increasing in density and difficulty.
export const LEVELS: string[][] = [
    // 1 — gentle intro
    [
        '3333333333333',
        '2222222222222',
        '1111111111111',
    ],
    // 2 — one more row
    [
        '4444444444444',
        '3333333333333',
        '2222222222222',
        '1111111111111',
    ],
    // 3 — columns with gaps
    [
        '5.5.5.5.5.5.5',
        '4.4.4.4.4.4.4',
        '3.3.3.3.3.3.3',
        '2.2.2.2.2.2.2',
    ],
    // 4 — checkerboard
    [
        '.5.5.5.5.5.5.',
        '5.5.5.5.5.5.5',
        '.4.4.4.4.4.4.',
        '4.4.4.4.4.4.4',
        '.3.3.3.3.3.3.',
    ],
    // 5 — pyramid
    [
        '......5......',
        '.....555.....',
        '....55555....',
        '...5555555...',
        '..555555555..',
        '.55555555555.',
    ],
    // 6 — first tough bricks
    [
        'a.a.a.a.a.a.a',
        '5555555555555',
        '4444444444444',
        'a.a.a.a.a.a.a',
    ],
    // 7 — diamond
    [
        '......4......',
        '.....4a4.....',
        '....4a5a4....',
        '...4a555a4...',
        '....4a5a4....',
        '.....4a4.....',
        '......4......',
    ],
    // 8 — first unbreakable obstacles
    [
        '#5#5#5#5#5#5#',
        '.4.4.4.4.4.4.',
        '3333333333333',
        '2.2.2.2.2.2.2',
    ],
    // 9 — twin columns
    [
        '55.55.55.55.5',
        '44.44.44.44.4',
        '33.33.33.33.3',
        'aa.aa.aa.aa.a',
    ],
    // 10 — armored top + obstacles
    [
        'bbbbbbbbbbbbb',
        '#...........#',
        '5.5.5.5.5.5.5',
        '4444444444444',
        '#...........#',
    ],
    // 11 — fortress
    [
        '#bbbbbbbbbbb#',
        '#5.........5#',
        '#5.aaaaaaa.5#',
        '#5.a44444a.5#',
        '#5.aaaaaaa.5#',
        '#55555555555#',
    ],
    // 12 — woven tough/normal
    [
        'a5a5a5a5a5a5a',
        '5a5a5a5a5a5a5',
        'a4a4a4a4a4a4a',
        '4a4a4a4a4a4a4',
    ],
    // 13 — armored pillars guarded by obstacles
    [
        'b.#.b.#.b.#.b',
        'b.5.b.5.b.5.b',
        'b.4.b.4.b.4.b',
        'b.3.b.3.b.3.b',
    ],
    // 14 — converging arrows
    [
        'a...........a',
        '.5.........5.',
        '..b.......b..',
        '...5.....5...',
        '....a...a....',
        '.....5.5.....',
        '......b......',
    ],
    // 15 — heavy wall
    [
        'bbbbbbbbbbbbb',
        'aaaaaaaaaaaaa',
        '5555555555555',
        '#...........#',
        '4444444444444',
        'aaaaaaaaaaaaa',
    ],
    // 16 — obstacle lattice
    [
        '#5#5#5#5#5#5#',
        'a.a.a.a.a.a.a',
        '#4#4#4#4#4#4#',
        'b.b.b.b.b.b.b',
        '#3#3#3#3#3#3#',
    ],
    // 17 — rolling waves
    [
        '.bb.bb.bb.bb.',
        '5..5..5..5..5',
        '.aa.aa.aa.aa.',
        '4..4..4..4..4',
        '.55.55.55.55.',
    ],
    // 18 — woven fortress
    [
        '#bbbbbbbbbbb#',
        '#a5a5a5a5a5a#',
        '#5a5a5a5a5a5#',
        '#a4a4a4a4a4a#',
        '#bbbbbbbbbbb#',
    ],
    // 19 — armored diamond core
    [
        '......b......',
        '.....b5b.....',
        '....b5a5b....',
        '...b5a4a5b...',
        '..b5a444a5b..',
        '...b5a4a5b...',
        '....b5a5b....',
        '.....b5b.....',
        '......b......',
    ],
    // 20 — the gauntlet
    [
        'bbbbbbbbbbbbb',
        'b#b#b#b#b#b#b',
        'baaaaaaaaaaab',
        'b5a5a5a5a5a5b',
        'baaaaaaaaaaab',
        'b#b#b#b#b#b#b',
        'bbbbbbbbbbbbb',
    ],
];

export const TOTAL_LEVELS = LEVELS.length;
