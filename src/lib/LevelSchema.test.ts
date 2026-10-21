import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GROUND_ROW, GROUND_Y, SH, SW, TILE, isValidPlacement, parseLevelFile, type LevelCell } from './LevelSchema';
import { buildLevelCommands } from '../utils/levelLoader';

const level = (cells: LevelCell[] = []) => ({ version: 1, number: 1, name: 'Example', cols: 30, cells });

describe('level document validation', () => {
    it('matches the current C++ game dimensions', () => {
        const cpp = readFileSync(new URL('../../cpp/platformer/main.cpp', import.meta.url), 'utf8');
        for (const [name, expected] of Object.entries({ SW, SH, GROUND_Y, PW: TILE })) {
            const match = cpp.match(new RegExp(`static constexpr int ${name} = (\\d+);`));
            expect(Number(match?.[1]), name).toBe(expected);
        }
    });

    it('accepts empty levels and custom level number zero', () => {
        expect(parseLevelFile({ ...level(), number: 0 }).cells).toEqual([]);
    });

    it.each([29, 401, 30.5, NaN])('rejects invalid width %s', cols => {
        expect(() => parseLevelFile({ ...level(), cols })).toThrow();
    });

    it.each([
        { row: 0, col: 1, type: 'platform' },
        { row: 20, col: 1, type: 'platform' },
        { row: 21, col: 1, type: 'spike' },
        { row: 19, col: 1, type: 'pit' },
        { row: 19, col: 1, type: 'finish' },
        { row: 20, col: 30, type: 'spike' },
        { row: 20, col: -1, type: 'spike' },
        { row: 20, col: 1.5, type: 'spike' },
        { row: 20, col: 1, type: 'unknown' },
    ])('rejects invalid cell %j', cell => {
        expect(() => parseLevelFile({ ...level(), cells: [cell] })).toThrow();
    });

    it('rejects duplicate coordinates and multiple finishes', () => {
        const finish: LevelCell = { row: GROUND_ROW, col: 20, type: 'finish' };
        expect(() => parseLevelFile(level([finish, finish]))).toThrow(/Duplicate/);
        expect(() => parseLevelFile(level([finish, { ...finish, col: 21 }]))).toThrow(/one finish/);
    });

    it('rejects incomplete or unsupported documents without coercion', () => {
        expect(() => parseLevelFile({ ...level(), version: 2 })).toThrow();
        expect(() => parseLevelFile({ ...level(), cols: '30' })).toThrow();
        expect(() => parseLevelFile({ cells: [] })).toThrow();
    });

    it('shares brush boundaries, including eraser bounds', () => {
        expect(isValidPlacement('platform', 1)).toBe(true);
        expect(isValidPlacement('platform', 19)).toBe(true);
        expect(isValidPlacement('spike', 20)).toBe(true);
        expect(isValidPlacement('finish', 20)).toBe(true);
        expect(isValidPlacement('eraser', -1)).toBe(false);
        expect(isValidPlacement('eraser', 23)).toBe(false);
    });
});

describe('level loader compatibility', () => {
    it('keeps empty levels in level mode', () => {
        expect(buildLevelCommands(parseLevelFile(level()))).toEqual([{ cmd: 'begin' }, { cmd: 'end' }]);
    });

    it('preserves coordinates, contiguous merging, and finish ordering', () => {
        const commands = buildLevelCommands(parseLevelFile(level([
            { row: 19, col: 4, type: 'platform' },
            { row: 19, col: 5, type: 'platform' },
            { row: 18, col: 5, type: 'spike' },
            { row: 20, col: 8, type: 'pit' },
            { row: 20, col: 9, type: 'pit' },
            { row: 20, col: 28, type: 'finish' },
        ])));
        expect(commands).toEqual([
            { cmd: 'begin' },
            { cmd: 'spike', worldX: 160, worldY: 32 },
            { cmd: 'pit', worldX: 256, width: 64 },
            { cmd: 'platform', worldX: 128, worldY: 32, width: 64, height: 32 },
            { cmd: 'end' },
            { cmd: 'set_finish', worldX: 896 },
        ]);
    });
});
