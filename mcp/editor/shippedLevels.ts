import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { levelFileSchema, levelManifestSchema, type LevelFile, type LevelManifest } from '../../src/lib/LevelSchema';
import type { BridgeAction } from '../../src/lib/EditorAgentProtocol';

export function defaultLevelsDir(): string {
    return process.env.EDITOR_LEVELS_DIR
        ?? fileURLToPath(new URL('../../public/levels/', import.meta.url));
}

export function createShippedLevelStore(levelsDir: string = defaultLevelsDir()) {
    const manifestPath = path.join(levelsDir, 'manifest.json');

    async function readManifest(): Promise<LevelManifest> {
        return levelManifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
    }

    async function nextNumber(): Promise<number> {
        const manifest = await readManifest();
        return Math.max(0, ...manifest.levels.map(level => level.number)) + 1;
    }

    /** Appends a level file and manifest entry. Rolls back the level file if the manifest write fails. */
    async function publish(candidate: LevelFile): Promise<{ number: number; file: string; levelPath: string; manifestPath: string }> {
        const level = levelFileSchema.parse(candidate);
        const expected = await nextNumber();
        if (level.number !== expected) {
            throw new Error(`Shipped levels changed; level ${level.number} is no longer next (expected ${expected}). Retry with a new request.`);
        }
        const manifest = await readManifest();
        const file = `${level.number}.json`;
        const levelPath = path.join(levelsDir, file);
        await writeFile(levelPath, `${JSON.stringify(level, null, 2)}\n`, { flag: 'wx' });
        try {
            const next: LevelManifest = { levels: [...manifest.levels, { number: level.number, name: level.name, file }] };
            const tempPath = `${manifestPath}.${randomUUID()}.tmp`;
            await writeFile(tempPath, `${JSON.stringify(next, null, 4)}\n`, { flag: 'wx' });
            try {
                await rename(tempPath, manifestPath);
            } catch (err) {
                await rm(tempPath, { force: true });
                throw err;
            }
        } catch (err) {
            await rm(levelPath, { force: true });
            throw err;
        }
        return { number: level.number, file, levelPath, manifestPath };
    }

    return { readManifest, nextNumber, publish, levelsDir };
}

type BridgeCall = (sessionId: string, action: BridgeAction, requestId: string) => Promise<Record<string, unknown>>;

/** Browser approval first, then the file write. Same-ID retries reuse an in-progress or successful publish. */
export function createShippedLevelPublisher(call: BridgeCall, store: ReturnType<typeof createShippedLevelStore>) {
    const results = new Map<string, { signature: string; promise: Promise<Record<string, unknown>> }>();
    return (sessionId: string, requestId: string, expectedRevision: number) => {
        const signature = JSON.stringify({ sessionId, expectedRevision });
        const prior = results.get(requestId);
        if (prior) {
            if (prior.signature !== signature) return Promise.reject(new Error('Request ID was already used for a different publish.'));
            return prior.promise;
        }
        const promise = (async () => {
            const number = await store.nextNumber();
            const data = await call(sessionId, { action: 'publish_shipped', expectedRevision, number }, requestId);
            const level = levelFileSchema.parse(data.level);
            const written = await store.publish(level);
            return { ...written, name: level.name, revision: data.revision, verifiedAdmin: data.verifiedAdmin };
        })();
        results.set(requestId, { signature, promise });
        promise.catch(() => results.delete(requestId));
        return promise;
    };
}
