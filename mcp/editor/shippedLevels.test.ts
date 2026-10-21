import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShippedLevelPublisher, createShippedLevelStore } from './shippedLevels';

const level = (number: number) => ({
    version: 1 as const, number, name: 'Stairs', cols: 30,
    cells: [{ row: 20, col: 25, type: 'finish' as const }],
});

describe('shipped level store', () => {
    let dir: string;
    beforeEach(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'levels-'));
        await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ levels: [{ number: 1, name: 'A', file: '1.json' }] }));
    });
    afterEach(() => rm(dir, { recursive: true, force: true }));

    it('appends the next level file and manifest entry', async () => {
        const store = createShippedLevelStore(dir);
        expect(await store.nextNumber()).toBe(2);
        await expect(store.publish(level(2))).resolves.toMatchObject({ number: 2, file: '2.json' });
        expect(JSON.parse(await readFile(path.join(dir, '2.json'), 'utf8'))).toEqual(level(2));
        expect((await store.readManifest()).levels).toEqual([
            { number: 1, name: 'A', file: '1.json' }, { number: 2, name: 'Stairs', file: '2.json' },
        ]);
        expect((await readdir(dir)).sort()).toEqual(['2.json', 'manifest.json']);
    });

    it('rejects stale numbers and existing files without changing the manifest', async () => {
        const store = createShippedLevelStore(dir);
        await expect(store.publish(level(3))).rejects.toThrow('expected 2');
        await writeFile(path.join(dir, '2.json'), '{}');
        await expect(store.publish(level(2))).rejects.toThrow();
        expect((await store.readManifest()).levels).toHaveLength(1);
        expect(await readFile(path.join(dir, '2.json'), 'utf8')).toBe('{}');
    });

    it('writes once when a publish request is retried and writes nothing when declined', async () => {
        const store = createShippedLevelStore(dir);
        const call = vi.fn(async () => ({ revision: 4, verifiedAdmin: 'james', level: level(2) }));
        const publish = createShippedLevelPublisher(call, store);
        const sessionId = randomUUID();
        const requestId = randomUUID();
        const [first, second] = await Promise.all([publish(sessionId, requestId, 4), publish(sessionId, requestId, 4)]);
        expect(second).toBe(first);
        expect(first).toMatchObject({ number: 2, name: 'Stairs', revision: 4, verifiedAdmin: 'james' });
        expect(call).toHaveBeenCalledOnce();
        expect(call).toHaveBeenCalledWith(sessionId, { action: 'publish_shipped', expectedRevision: 4, number: 2 }, requestId);
        await expect(publish(sessionId, requestId, 5)).rejects.toThrow('different publish');

        call.mockRejectedValueOnce(new Error('User declined the operation.'));
        const declined = randomUUID();
        await expect(publish(sessionId, declined, 4)).rejects.toThrow('declined');
        expect((await store.readManifest()).levels).toHaveLength(2);
    });
});
