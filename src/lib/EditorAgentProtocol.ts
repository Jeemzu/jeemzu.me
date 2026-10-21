import { z } from 'zod';
import { editBatchSchema } from './LevelDocument';
import { DEFAULT_COLS, GROUND_ROW, levelFileSchema, MAX_COLS, MIN_COLS, SH, SW, TILE } from './LevelSchema';

export const EDITOR_BRIDGE_VERSION = 1;
export const EDITOR_BRIDGE_PORT = 43187;
export const MAX_BRIDGE_BYTES = 2 * 1024 * 1024;
export const MAX_SESSION_REQUESTS = 1000;
export const sessionIdSchema = z.string().uuid();
export const requestIdSchema = z.string().uuid();
export const revisionSchema = z.number().int().nonnegative();

const mutation = { expectedRevision: revisionSchema };
export const editorActionSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('get_level') }).strict(),
    z.object({ action: z.literal('get_saved_levels') }).strict(),
    z.object({ action: z.literal('validate') }).strict(),
    z.object({ action: z.literal('get_view') }).strict(),
    z.object({ action: z.literal('set_view'), scrollCol: z.number().int().min(0).max(MAX_COLS - 1) }).strict(),
    z.object({ action: z.literal('render'), scrollCol: z.number().int().min(0).max(MAX_COLS - 1).optional() }).strict(),
    z.object({ action: z.literal('edit'), ...mutation, operations: editBatchSchema }).strict(),
    z.object({ action: z.literal('import'), ...mutation, level: levelFileSchema }).strict(),
    z.object({ action: z.literal('undo'), ...mutation }).strict(),
    z.object({ action: z.literal('redo'), ...mutation }).strict(),
    z.object({ action: z.literal('save'), ...mutation }).strict(),
    z.object({ action: z.literal('export'), ...mutation }).strict(),
    z.object({ action: z.literal('delete_saved'), id: z.string().min(1).max(200) }).strict(),
    z.object({ action: z.literal('check_production_admin') }).strict(),
]);
export type EditorAction = z.infer<typeof editorActionSchema>;

// Sent only by editor_publish_shipped_level, which writes the files after the browser approves.
export const publishShippedActionSchema = z.object({
    action: z.literal('publish_shipped'), ...mutation, number: z.number().int().min(1),
}).strict();
export const bridgeActionSchema = z.union([editorActionSchema, publishShippedActionSchema]);
export type BridgeAction = z.infer<typeof bridgeActionSchema>;

export interface ProductionIdentity {
    username: string;
    role: string;
    expiresAt: number;
}

export const INTERACTIVE_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_TIMEOUT_MS = 30 * 1000;
const interactiveActions = new Set(['import', 'edit', 'delete_saved', 'check_production_admin', 'publish_shipped']);
export function bridgeTimeoutMs(action: BridgeAction): number {
    return interactiveActions.has(action.action) ? INTERACTIVE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

export const bridgeRequestSchema = z.object({
    type: z.literal('request'),
    requestId: requestIdSchema,
    expiresAt: z.number().int().positive(),
    action: bridgeActionSchema,
}).strict();
export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;

export const bridgeResponseSchema = z.discriminatedUnion('ok', [
    z.object({
        type: z.literal('response'), requestId: requestIdSchema, ok: z.literal(true),
        data: z.record(z.string(), z.unknown()),
    }).strict(),
    z.object({
        type: z.literal('response'), requestId: requestIdSchema, ok: z.literal(false), error: z.string(),
    }).strict(),
]);
export type BridgeResponse = z.infer<typeof bridgeResponseSchema>;

export const pairingMessageSchema = z.object({
    type: z.literal('pair'), version: z.literal(EDITOR_BRIDGE_VERSION),
    token: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const pairedMessageSchema = z.object({
    type: z.literal('paired'), sessionId: sessionIdSchema,
}).strict();

export const editorRules = {
    version: 1, tilePixels: TILE, screen: { width: SW, height: SH },
    coordinates: 'Zero-based rows top-to-bottom, columns left-to-right.',
    columns: { min: MIN_COLS, max: MAX_COLS, default: DEFAULT_COLS },
    rows: { platform: [1, GROUND_ROW - 1], spike: [1, GROUND_ROW], pit: [GROUND_ROW, GROUND_ROW], finish: [GROUND_ROW, GROUND_ROW] },
    occupancy: 'One type per cell. Setting a finish removes the previous finish.',
    ground: 'Implicit ground; erase removes explicit cells, not ground.',
    runtime: 'Columns are spawn-scroll thresholds. Width is not a runtime boundary. Missing finish uses the game fallback.',
    save: 'Save appends a new browser-local copy. Shipping uses check_production_admin, then editor_publish_shipped_level after the user confirms the level is finished.',
    validation: 'Structural validation is not a proof of playability.',
};
