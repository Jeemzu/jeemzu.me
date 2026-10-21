import { describe, expect, it } from 'vitest';
import { LevelDocument } from './LevelDocument';

describe('revisioned level commands', () => {
    it('applies batches atomically and reports changed bounds', () => {
        const document = new LevelDocument();
        const result = document.edit([
            { op: 'fill_region', fromRow: 19, toRow: 19, fromCol: 10, toCol: 15, type: 'platform' },
            { op: 'set_finish', col: 90 },
        ], 0);
        expect(result).toMatchObject({
            revision: 1, changedCells: 7, bounds: { fromRow: 19, toRow: 20, fromCol: 10, toCol: 90 },
        });
        const before = document.getSnapshot();
        expect(() => document.edit([
            { op: 'set_metadata', name: 'Should not commit' },
            { op: 'set_cells', cells: [{ row: 20, col: 1, type: 'platform' }] },
        ], 1)).toThrow();
        expect(document.getSnapshot()).toBe(before);
    });

    it('rejects stale revisions and unchanged operations do not increment revisions', () => {
        const document = new LevelDocument();
        document.edit([{ op: 'set_finish', col: 90 }], 0);
        expect(() => document.edit([{ op: 'clear_cells' }], 0)).toThrow(/Revision conflict/);
        expect(document.edit([{ op: 'set_finish', col: 90 }], 1).revision).toBe(1);
        document.edit([{ op: 'set_cells', cells: [{ row: 19, col: 1, type: 'platform' }] }], 1);
        expect(document.edit([{ op: 'set_finish', col: 90 }], 2).revision).toBe(2);
    });

    it('replaces cells and moves the unique finish', () => {
        const document = new LevelDocument();
        document.edit([{ op: 'set_cells', cells: [{ row: 20, col: 3, type: 'pit' }] }]);
        document.edit([{ op: 'set_finish', col: 3 }, { op: 'set_finish', col: 9 }]);
        expect(document.getSnapshot().level.cells).toEqual([{ row: 20, col: 9, type: 'finish' }]);
    });

    it('requires explicit cropping and restores excluded cells with undo', () => {
        const document = new LevelDocument();
        document.edit([{ op: 'set_finish', col: 90 }]);
        expect(() => document.edit([{ op: 'resize', cols: 30 }])).toThrow(/cropping/);
        document.edit([{ op: 'resize', cols: 30, crop: true }]);
        expect(document.getSnapshot().level).toMatchObject({ cols: 30, cells: [] });
        document.undo();
        expect(document.getSnapshot().level).toMatchObject({ cols: 100, cells: [{ col: 90 }] });
        document.redo();
        expect(document.getSnapshot().level.cols).toBe(30);
    });

    it('groups a paint stroke into one undo and invalidates redo on a new edit', () => {
        const document = new LevelDocument();
        document.beginStroke();
        document.edit([{ op: 'set_cells', cells: [{ row: 19, col: 1, type: 'platform' }] }]);
        document.edit([{ op: 'set_cells', cells: [{ row: 19, col: 2, type: 'platform' }] }]);
        document.endStroke();
        document.undo();
        expect(document.getSnapshot().level.cells).toEqual([]);
        document.redo();
        expect(document.getSnapshot().level.cells).toHaveLength(2);
        document.undo();
        document.edit([{ op: 'set_metadata', name: 'New draft' }]);
        expect(document.getSnapshot().canRedo).toBe(false);
    });

    it('does not erase implicit ground or reset metadata when clearing', () => {
        const document = new LevelDocument();
        document.edit([{ op: 'set_metadata', name: 'Keep me' }, { op: 'set_finish', col: 90 }]);
        document.edit([{ op: 'erase_cells', cells: [{ row: 20, col: 1 }] }, { op: 'clear_cells' }]);
        expect(document.getSnapshot().level).toMatchObject({ name: 'Keep me', cols: 100, cells: [] });
    });

    it('rejects reversed regions, invalid fills, and out-of-range erasure', () => {
        const document = new LevelDocument();
        expect(() => document.edit([{ op: 'erase_region', fromRow: 1, toRow: 1, fromCol: 9, toCol: 2 }])).toThrow();
        expect(() => document.edit([{ op: 'fill_region', fromRow: 19, toRow: 20, fromCol: 0, toCol: 1, type: 'platform' }])).toThrow();
        expect(() => document.edit([{ op: 'erase_cells', cells: [{ row: 20, col: 100 }] }])).toThrow();
        expect(document.getSnapshot().revision).toBe(0);
    });

    it('validates replacement and keeps history bounded', () => {
        const document = new LevelDocument();
        const initial = document.getSnapshot();
        expect(() => document.replace({ version: 2 })).toThrow();
        expect(document.getSnapshot()).toBe(initial);
        for (let i = 0; i < 105; i++) document.edit([{ op: 'set_metadata', name: String(i) }]);
        for (let i = 0; i < 100; i++) document.undo();
        expect(document.getSnapshot().canUndo).toBe(false);
        expect(() => document.undo()).toThrow(/Nothing/);
    });
});
