import { LevelDocument } from '../../lib/LevelDocument';
import {
    MAX_SESSION_REQUESTS, type BridgeAction, type BridgeRequest, type BridgeResponse,
} from '../../lib/EditorAgentProtocol';
import { getLevelWarnings } from '../../lib/LevelSchema';
import { deleteCustomLevel, loadCustomLevels, saveCustomLevel } from '../../utils/customLevels';
import type { ProductionIdentity } from '../../lib/EditorAgentProtocol';

export interface EditorAgentContext {
    document: LevelDocument;
    isAdmin: () => boolean;
    isPainting: () => boolean;
    getScrollCol: () => number;
    setScrollCol: (col: number) => void;
    render: (scrollCol: number) => string;
    confirm: (message: string) => boolean;
    /** Asks the user to sign in to production; resolves null if they cancel. */
    signInProduction: () => Promise<ProductionIdentity | null>;
}

export function createEditorDispatcher(context: EditorAgentContext) {
    const completed = new Map<string, { signature: string; response: BridgeResponse }>();
    const inFlight = new Map<string, { signature: string; response: Promise<BridgeResponse> }>();
    let productionAdmin: ProductionIdentity | null = null;
    const verifiedAdmin = () => productionAdmin && productionAdmin.expiresAt > Date.now() ? productionAdmin : null;

    async function dispatch(action: BridgeAction, expiresAt: number): Promise<Record<string, unknown>> {
        const { document } = context;
        const checkDeadline = () => {
            if (Date.now() > expiresAt) throw new Error('Request expired before execution. No change was applied.');
        };
        const approve = (message: string) => {
            if (!context.confirm(message)) throw new Error('User declined the operation.');
            checkDeadline();
        };
        const requireAdmin = () => {
            if (!context.isAdmin()) throw new Error('This operation requires the Admin role.');
        };
        checkDeadline();
        if ('expectedRevision' in action) document.assertRevision(action.expectedRevision);
        const snapshot = document.getSnapshot();
        switch (action.action) {
            case 'get_level':
                return { ...snapshot, warnings: getLevelWarnings(snapshot.level), capabilities: { numbering: context.isAdmin(), export: context.isAdmin() } };
            case 'get_saved_levels':
                return { levels: loadCustomLevels().map(({ id, name, cols, savedAt }) => ({ id, name, cols, savedAt })) };
            case 'validate':
                return { revision: snapshot.revision, valid: true, warnings: getLevelWarnings(snapshot.level), playability: 'not_checked' };
            case 'get_view':
                return { scrollCol: context.getScrollCol() };
            case 'set_view':
                context.setScrollCol(action.scrollCol);
                return { scrollCol: context.getScrollCol() };
            case 'render':
                return { revision: snapshot.revision, image: { mimeType: 'image/png', data: context.render(action.scrollCol ?? context.getScrollCol()) } };
            case 'edit':
                if (context.isPainting()) throw new Error('User is painting. Retry after the stroke ends.');
                if (action.operations.some(op => op.op === 'set_metadata' && op.number !== undefined)) requireAdmin();
                if (action.operations.some(op => op.op === 'clear_cells' || (op.op === 'resize' && op.crop))) {
                    approve('Allow the agent to clear or crop tiles?');
                }
                document.endStroke();
                return { ...document.edit(action.operations, action.expectedRevision) };
            case 'import':
                if (context.isPainting()) throw new Error('User is painting. Retry after the stroke ends.');
                approve('Allow the agent to replace the current level?');
                return { ...document.replace(action.level, action.expectedRevision) };
            case 'undo':
            case 'redo':
                if (context.isPainting()) throw new Error('User is painting. Retry after the stroke ends.');
                return { ...document[action.action](action.expectedRevision) };
            case 'save': {
                const level = snapshot.level;
                const saved = saveCustomLevel(level.name.trim() || `My Level ${Date.now()}`, level.cols, level.cells);
                return { revision: snapshot.revision, saved: { id: saved.id, name: saved.name, cols: saved.cols, savedAt: saved.savedAt } };
            }
            case 'export':
                requireAdmin();
                return {
                    revision: snapshot.revision,
                    filename: `level-${String(snapshot.level.number).padStart(3, '0')}.json`,
                    level: snapshot.level,
                };
            case 'delete_saved':
                approve('Allow the agent to delete this saved level?');
                deleteCustomLevel(action.id);
                return { deletedId: action.id };
            case 'check_production_admin': {
                let identity = verifiedAdmin();
                if (!identity) {
                    identity = await context.signInProduction();
                    if (!identity) throw new Error('User cancelled production sign-in.');
                    checkDeadline();
                    if (identity.role === 'Admin') productionAdmin = identity;
                }
                return {
                    isAdmin: identity.role === 'Admin',
                    username: identity.username,
                    verifiedUntil: new Date(identity.expiresAt).toISOString(),
                };
            }
            case 'publish_shipped': {
                const admin = verifiedAdmin();
                if (!admin) throw new Error('Production admin not verified. Call check_production_admin first.');
                if (context.isPainting()) throw new Error('User is painting. Retry after the stroke ends.');
                const name = snapshot.level.name.trim();
                if (!name) throw new Error('Name the level before shipping it.');
                if (snapshot.level.cells.length === 0) throw new Error('Cannot ship an empty level.');
                const warnings = getLevelWarnings(snapshot.level);
                approve([`Add "${name}" to the shipped levels as level ${action.number}?`, ...warnings].join('\n\n'));
                return {
                    revision: snapshot.revision,
                    level: { ...snapshot.level, name, number: action.number },
                    verifiedAdmin: admin.username,
                };
            }
        }
    }

    async function respond(request: BridgeRequest, signature: string): Promise<BridgeResponse> {
        let response: BridgeResponse;
        try {
            response = { type: 'response', requestId: request.requestId, ok: true, data: await dispatch(request.action, request.expiresAt) };
        } catch (err) {
            response = { type: 'response', requestId: request.requestId, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
        inFlight.delete(request.requestId);
        completed.set(request.requestId, { signature, response });
        return response;
    }

    return async (request: BridgeRequest): Promise<BridgeResponse> => {
        const signature = JSON.stringify(request.action);
        const previous = completed.get(request.requestId) ?? inFlight.get(request.requestId);
        if (previous) {
            if (previous.signature === signature) return previous.response;
            return { type: 'response', requestId: request.requestId, ok: false, error: 'Request ID was already used for a different action.' };
        }
        if (completed.size + inFlight.size >= MAX_SESSION_REQUESTS) {
            return { type: 'response', requestId: request.requestId, ok: false, error: 'Session request limit reached. Disconnect and pair a new session.' };
        }
        const response = respond(request, signature);
        inFlight.set(request.requestId, { signature, response });
        return response;
    };
}
