import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WebSocket } from 'ws';
import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LevelDocument } from '../../src/lib/LevelDocument';
import { bridgeRequestSchema, pairedMessageSchema, type EditorAction } from '../../src/lib/EditorAgentProtocol';
import { createEditorDispatcher } from '../../src/pages/editor/editorAgent';
import { allowedEditorOrigins, createEditorBridge } from './bridge';

async function freePort() {
    const server = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test port assigned.');
    const port = address.port;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    return port;
}

afterEach(() => vi.unstubAllGlobals());

describe('local bridge boundary', () => {
    it('allows only exact loopback origins', () => {
        expect(allowedEditorOrigins()).toContain('http://localhost:5173');
        expect(allowedEditorOrigins('http://localhost:5174')).toEqual(['http://localhost:5174']);
        for (const origin of ['https://example.com', 'http://localhost.evil:5173', 'http://localhost:5173/', 'http://user@localhost:5173']) {
            expect(() => allowedEditorOrigins(origin)).toThrow();
        }
    });

    it('rejects remote origins and invalid pairing codes', async () => {
        const port = await freePort();
        const bridge = await createEditorBridge({ port });
        const rejected = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'https://example.com' });
        const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'http://localhost:5173' });
        const opened = once(socket, 'open');
        try {
            await Promise.all([expect(once(rejected, 'open')).rejects.toThrow(/403/), opened]);
            socket.send(JSON.stringify({ type: 'pair', version: 1, token: '0'.repeat(64) }));
            const [code] = await once(socket, 'close');
            expect(code).toBe(1008);
            expect(bridge.listSessions()).toEqual([]);
        } finally {
            rejected.terminate();
            socket.terminate();
            await bridge.close();
        }
    });
});

describe('stdio MCP authoring integration', () => {
    it('discovers tools, pairs, edits, reads resources, rejects stale edits, deduplicates saves, and publishes', async () => {
        const port = await freePort();
        const levelsDir = await mkdtemp(join(tmpdir(), 'shipped-'));
        await writeFile(join(levelsDir, 'manifest.json'), JSON.stringify({ levels: [{ number: 1, name: 'A', file: '1.json' }] }));
        const transport = new StdioClientTransport({
            command: process.execPath,
            args: [resolve('node_modules', 'tsx', 'dist', 'cli.mjs'), resolve('mcp', 'editor', 'server.ts')],
            env: { ...getDefaultEnvironment(), EDITOR_BRIDGE_PORT: String(port), EDITOR_LEVELS_DIR: levelsDir },
            stderr: 'pipe',
        });
        let stderr = '';
        transport.stderr?.on('data', chunk => { stderr += String(chunk); });
        const client = new Client({ name: 'editor-integration', version: '1.0.0' });
        let socket: WebSocket | undefined;
        const storage = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => { storage.set(key, value); },
        });
        try {
            await client.connect(transport);
            const tools = await client.listTools();
            expect(tools.tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
                'editor_connection_info', 'editor_list_sessions', 'editor_get_rules', 'editor_command', 'editor_publish_shipped_level',
            ]));
            const connection = await client.callTool({ name: 'editor_connection_info', arguments: {} });
            const info = z.object({ pairingCode: z.string() }).parse(connection.structuredContent);
            socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'http://localhost:5173' });
            await once(socket, 'open');
            socket.send(JSON.stringify({ type: 'pair', version: 1, token: info.pairingCode }));
            const [raw] = await once(socket, 'message');
            const { sessionId } = pairedMessageSchema.parse(JSON.parse(raw.toString()));
            const document = new LevelDocument();
            const dispatch = createEditorDispatcher({
                document, isAdmin: () => false, isPainting: () => false, getScrollCol: () => 0,
                setScrollCol: () => {}, render: () => 'png', confirm: () => true,
                signInProduction: async () => ({ username: 'james', role: 'Admin', expiresAt: Date.now() + 60000 }),
            });
            socket.on('message', async data => {
                const response = await dispatch(bridgeRequestSchema.parse(JSON.parse(data.toString())));
                socket?.send(JSON.stringify(response));
            });
            const command = (action: EditorAction, requestId: string = randomUUID()) => client.callTool({
                name: 'editor_command', arguments: { sessionId, requestId, command: action },
            });
            const initial = await command({ action: 'get_level' });
            expect(initial.structuredContent).toMatchObject({ sessionId, data: { revision: 0 } });
            const edit = await command({
                action: 'edit', expectedRevision: 0,
                operations: [
                    { op: 'fill_region', fromRow: 19, toRow: 19, fromCol: 10, toCol: 14, type: 'platform' },
                    { op: 'set_finish', col: 90 },
                ],
            });
            expect(edit.isError).not.toBe(true);
            expect(edit.structuredContent).toMatchObject({ data: { revision: 1, changedCells: 6 } });
            expect((await command({ action: 'undo', expectedRevision: 0 })).isError).toBe(true);
            const resource = await client.readResource({ uri: `impossible://sessions/${sessionId}/level` });
            const content = resource.contents[0];
            expect('text' in content && JSON.parse(content.text)).toMatchObject({ revision: 1, level: { cells: expect.any(Array) } });
            const saveId = randomUUID();
            const save = await command({ action: 'save', expectedRevision: 1 }, saveId);
            const retry = await command({ action: 'save', expectedRevision: 1 }, saveId);
            expect(retry.structuredContent).toEqual(save.structuredContent);
            const saved = JSON.parse(storage.get('platformer_custom_levels') ?? 'null');
            expect(saved).toHaveLength(1);
            expect(saved[0].cells).toHaveLength(6);
            expect((await command({ action: 'export', expectedRevision: 1 })).isError).toBe(true);

            const publish = (requestId: string) => client.callTool({
                name: 'editor_publish_shipped_level', arguments: { sessionId, requestId, expectedRevision: 2 },
            });
            expect((await publish(randomUUID())).isError).toBe(true);
            expect((await command({ action: 'check_production_admin' })).structuredContent)
                .toMatchObject({ data: { isAdmin: true, username: 'james' } });
            document.edit([{ op: 'set_metadata', name: 'Stairs' }]);
            const published = await publish(randomUUID());
            expect(published.structuredContent).toMatchObject({ data: { number: 2, file: '2.json', name: 'Stairs' } });
            const manifest = JSON.parse(await readFile(join(levelsDir, 'manifest.json'), 'utf8'));
            expect(manifest.levels.map((entry: { number: number }) => entry.number)).toEqual([1, 2]);
            expect(JSON.parse(await readFile(join(levelsDir, '2.json'), 'utf8'))).toMatchObject({ number: 2, name: 'Stairs' });
            const shipped = await client.readResource({ uri: 'impossible://shipped-levels' });
            expect('text' in shipped.contents[0] && JSON.parse(shipped.contents[0].text).levels).toHaveLength(2);
        } catch (error) {
            throw new Error(`${error instanceof Error ? error.message : String(error)}\nCompanion stderr: ${stderr}`);
        } finally {
            socket?.terminate();
            await client.close();
            await transport.close();
            await rm(levelsDir, { recursive: true, force: true });
        }
    }, 20000);
});
