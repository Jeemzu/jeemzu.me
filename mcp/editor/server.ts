import { z } from 'zod';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
    editorActionSchema, editorRules, requestIdSchema, sessionIdSchema, type EditorAction,
} from '../../src/lib/EditorAgentProtocol';
import { levelFileSchema } from '../../src/lib/LevelSchema';
import { createEditorBridge } from './bridge';
import { createShippedLevelPublisher, createShippedLevelStore } from './shippedLevels';

const bridge = await createEditorBridge({
    port: process.env.EDITOR_BRIDGE_PORT === undefined ? undefined : Number(process.env.EDITOR_BRIDGE_PORT),
    origin: process.env.EDITOR_ORIGIN,
});
const server = new McpServer({ name: 'impossible-level-editor', version: '0.1.0' }, { maxToolInputElements: 50000 });
const rules = { ...editorRules, levelFileSchema: z.toJSONSchema(levelFileSchema) };
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

function result(data: Record<string, unknown>): CallToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data };
}

server.registerTool('editor_connection_info', {
    description: 'Get the local bridge port and pairing code. The user enters these in the local editor Agent dialog. Never pair without user permission.',
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({ port: z.number(), pairingCode: z.string(), allowedOrigins: z.array(z.string()) }),
    annotations: readOnly,
}, () => result(bridge.connectionInfo()));

server.registerTool('editor_list_sessions', {
    description: 'List explicitly paired browser editor sessions. Inspect a session before changing it.',
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({ sessions: z.array(z.object({ sessionId: sessionIdSchema, pairedAt: z.string() })) }),
    annotations: readOnly,
}, () => result({ sessions: bridge.listSessions() }));

server.registerTool('editor_get_rules', {
    description: 'Read level coordinates, constraints, runtime semantics, and the version 1 JSON schema. Validation does not prove playability.',
    inputSchema: z.object({}).strict(),
    annotations: readOnly,
}, () => result(rules));

server.registerTool('editor_command', {
    description: 'Read or edit a paired editor. First get_level, then use its revision for mutations. edit batches are atomic; import/clear/crop/delete require browser approval. Save appends a local copy. Number changes/export require Admin. check_production_admin asks the user to sign in to production and reports whether they are an Admin. Use a fresh UUID requestId for each new request; retry an unconfirmed request only with the identical ID, session, and command. render returns a 30-column image. No automated playtesting.',
    inputSchema: z.object({ sessionId: sessionIdSchema, requestId: requestIdSchema, command: editorActionSchema }).strict(),
    outputSchema: z.object({ sessionId: sessionIdSchema, data: z.record(z.string(), z.unknown()) }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
}, async ({ sessionId, requestId, command }) => {
    try {
        const data = await bridge.call(sessionId, command, requestId);
        const imageSchema = z.object({ mimeType: z.literal('image/png'), data: z.string() });
        if (command.action === 'render') {
            const image = imageSchema.parse(data.image);
            const output = result({ sessionId, data: { revision: data.revision } });
            output.content.push({ type: 'image', mimeType: image.mimeType, data: image.data });
            return output;
        }
        return result({ sessionId, data });
    } catch (err) {
        return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
    }
});

function jsonResource(uri: string, data: unknown) {
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
}

const shippedLevels = createShippedLevelStore();
const publishShipped = createShippedLevelPublisher((sessionId, action, requestId) => bridge.call(sessionId, action, requestId), shippedLevels);

server.registerTool('editor_publish_shipped_level', {
    description: 'Add the current editor level to the game\'s shipped levels as the next level number. Call only after the user confirms the level is finished and saved, and check_production_admin returned isAdmin true in this session. The editor asks the user to approve. Writes public/levels/<n>.json and manifest.json in the local repo; it ships on the next deploy and is not committed. Use a fresh UUID requestId; retry an unconfirmed publish only with the identical ID.',
    inputSchema: z.object({ sessionId: sessionIdSchema, requestId: requestIdSchema, expectedRevision: z.number().int().nonnegative() }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
}, async ({ sessionId, requestId, expectedRevision }) => {
    try {
        return result({ sessionId, data: await publishShipped(sessionId, requestId, expectedRevision) });
    } catch (err) {
        return { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] };
    }
});

server.registerResource('shipped-levels', 'impossible://shipped-levels', {
    mimeType: 'application/json', description: 'Manifest of levels shipped with the game in this repo.',
}, async uri => jsonResource(uri.href, await shippedLevels.readManifest()));

server.registerResource('rules', 'impossible://rules', {
    mimeType: 'application/json', description: 'Level rules and JSON schema.',
}, uri => jsonResource(uri.href, rules));
server.registerResource('sessions', 'impossible://sessions', {
    mimeType: 'application/json', description: 'Explicitly paired editor sessions.',
}, uri => jsonResource(uri.href, { sessions: bridge.listSessions() }));

const resourceActions: Record<string, EditorAction> = {
    level: { action: 'get_level' }, 'saved-levels': { action: 'get_saved_levels' }, validation: { action: 'validate' },
};
for (const [name, action] of Object.entries(resourceActions)) {
    server.registerResource(name, new ResourceTemplate(`impossible://sessions/{sessionId}/${name}`, {
        list: async () => ({
            resources: bridge.listSessions().map(session => ({
                uri: `impossible://sessions/${session.sessionId}/${name}`, name: `${name}: ${session.sessionId}`, mimeType: 'application/json',
            })),
        }),
    }), { mimeType: 'application/json' }, async (uri, variables) =>
        jsonResource(uri.href, await bridge.call(sessionIdSchema.parse(variables.sessionId), action)));
}

let closing = false;
async function close() {
    if (closing) return;
    closing = true;
    await bridge.close();
    await server.close();
}
server.server.onclose = () => { void close().catch(error => { console.error(error); process.exitCode = 1; }); };
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void close().catch(error => { console.error(error); process.exitCode = 1; }); });
}
await server.connect(new StdioServerTransport());
console.error(`Level editor MCP ready; bridge on 127.0.0.1:${bridge.connectionInfo().port}.`);
