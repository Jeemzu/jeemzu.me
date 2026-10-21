import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket, type VerifyClientCallbackAsync } from 'ws';
import {
    EDITOR_BRIDGE_PORT, MAX_BRIDGE_BYTES, bridgeResponseSchema, bridgeTimeoutMs, pairingMessageSchema,
    type BridgeAction, type BridgeResponse,
} from '../../src/lib/EditorAgentProtocol';

interface PendingRequest {
    signature: string;
    resolve: (response: BridgeResponse) => void;
    reject: (error: Error) => void;
    promise: Promise<BridgeResponse>;
    timer: ReturnType<typeof setTimeout>;
}

interface Session {
    sessionId: string;
    pairedAt: string;
    socket: WebSocket;
    pending: Map<string, PendingRequest>;
}

export interface BridgeOptions {
    port?: number;
    origin?: string;
}

export function allowedEditorOrigins(origin?: string): string[] {
    if (!origin) return ['http://localhost:5173', 'http://127.0.0.1:5173'];
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        || url.origin !== origin || url.username || url.password) {
        throw new Error('EDITOR_ORIGIN must be an exact HTTP loopback origin, e.g. http://localhost:5174.');
    }
    return [origin];
}

export async function createEditorBridge(options: BridgeOptions = {}) {
    const port = options.port ?? EDITOR_BRIDGE_PORT;
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('EDITOR_BRIDGE_PORT must be between 1024 and 65535.');
    const origins = allowedEditorOrigins(options.origin);
    const token = randomBytes(32).toString('hex');
    const sessions = new Map<string, Session>();
    const verifyClient: VerifyClientCallbackAsync = (info, done) => {
        if (origins.includes(info.origin) && info.req.headers.host === `127.0.0.1:${port}`) done(true);
        else done(false, 403, 'Forbidden');
    };
    const server = new WebSocketServer({
        host: '127.0.0.1', port, maxPayload: MAX_BRIDGE_BYTES,
        verifyClient,
    });
    server.on('connection', socket => {
        if (server.clients.size > 8) {
            socket.close(1008, 'Too many connections');
            return;
        }
        let session: Session | undefined;
        const timer = setTimeout(() => socket.close(1008, 'Pairing expired'), 5000);
        socket.on('error', error => console.error(`Editor bridge socket: ${error.message}`));
        socket.on('message', (raw, binary) => {
            try {
                if (binary) throw new Error('Text messages required.');
                const message: unknown = JSON.parse(raw.toString());
                if (!session) {
                    const pair = pairingMessageSchema.parse(message);
                    if (!timingSafeEqual(Buffer.from(pair.token, 'hex'), Buffer.from(token, 'hex'))) {
                        throw new Error('Invalid pairing code.');
                    }
                    clearTimeout(timer);
                    session = { sessionId: randomUUID(), pairedAt: new Date().toISOString(), socket, pending: new Map() };
                    sessions.set(session.sessionId, session);
                    socket.send(JSON.stringify({ type: 'paired', sessionId: session.sessionId }));
                    return;
                }
                const response = bridgeResponseSchema.parse(message);
                const request = session.pending.get(response.requestId);
                if (!request) {
                    console.error('Editor bridge received a late or unmatched response.');
                    return;
                }
                clearTimeout(request.timer);
                session.pending.delete(response.requestId);
                request.resolve(response);
            } catch (err) {
                console.error(`Editor bridge rejected a message: ${err instanceof Error ? err.message : String(err)}`);
                socket.close(1008, 'Invalid bridge message');
            }
        });
        socket.on('close', () => {
            clearTimeout(timer);
            if (!session) return;
            sessions.delete(session.sessionId);
            for (const pending of session.pending.values()) {
                clearTimeout(pending.timer);
                pending.reject(new Error('Editor disconnected. Operation outcome is unconfirmed; do not replay it in a new session.'));
            }
            session.pending.clear();
        });
    });
    await new Promise<void>((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    server.on('error', error => console.error(`Editor bridge: ${error.message}`));

    return {
        connectionInfo: () => ({ port, pairingCode: token, allowedOrigins: origins }),
        listSessions: () => [...sessions.values()].map(({ sessionId, pairedAt }) => ({ sessionId, pairedAt })),
        async call(sessionId: string, action: BridgeAction, requestId: string = randomUUID()): Promise<Record<string, unknown>> {
            const session = sessions.get(sessionId);
            if (!session || session.socket.readyState !== WebSocket.OPEN) throw new Error('Editor session not connected.');
            const signature = JSON.stringify(action);
            const existing = session.pending.get(requestId);
            if (existing && existing.signature !== signature) throw new Error('Request ID is already in use for another action.');
            if (!existing && session.pending.size >= 16) throw new Error('Too many pending editor requests.');
            const response = existing ? await existing.promise : await new Promise<BridgeResponse>((resolve, reject) => {
                const timeoutMs = bridgeTimeoutMs(action);
                const expiresAt = Date.now() + timeoutMs;
                const json = JSON.stringify({ type: 'request', requestId, expiresAt, action });
                if (Buffer.byteLength(json) > MAX_BRIDGE_BYTES) {
                    reject(new Error('Request exceeds the bridge limit.'));
                    return;
                }
                let settleResolve!: (response: BridgeResponse) => void;
                let settleReject!: (error: Error) => void;
                const promise = new Promise<BridgeResponse>((res, rej) => { settleResolve = res; settleReject = rej; });
                const timer = setTimeout(() => {
                    session.pending.delete(requestId);
                    settleReject(new Error('Editor timed out. Outcome is unconfirmed. Retry only with the same session, request ID, and action.'));
                }, timeoutMs);
                session.pending.set(requestId, { signature, resolve: settleResolve, reject: settleReject, promise, timer });
                promise.then(resolve, reject);
                session.socket.send(json, error => {
                    if (!error) return;
                    clearTimeout(timer);
                    session.pending.delete(requestId);
                    settleReject(new Error(`Could not deliver editor request: ${error.message}`));
                });
            });
            if (!response.ok) throw new Error(response.error);
            return response.data;
        },
        async close(): Promise<void> {
            for (const socket of server.clients) socket.terminate();
            await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        },
    };
}
