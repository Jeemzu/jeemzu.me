import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { toast } from 'sonner';
import {
    EDITOR_BRIDGE_PORT, EDITOR_BRIDGE_VERSION, MAX_BRIDGE_BYTES,
    bridgeRequestSchema, pairedMessageSchema,
} from '../../lib/EditorAgentProtocol';
import { createEditorDispatcher, type EditorAgentContext } from './editorAgent';
import ProductionSignInDialog from './ProductionSignInDialog';
import type { ProductionIdentity } from '../../utils/productionAuth';

type PageContext = Omit<EditorAgentContext, 'signInProduction'>;

export default function EditorAgentConnection({ context }: { context: PageContext }) {
    const [open, setOpen] = useState(false);
    const [port, setPort] = useState(String(EDITOR_BRIDGE_PORT));
    const [token, setToken] = useState('');
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [sessionId, setSessionId] = useState('');
    const [signInOpen, setSignInOpen] = useState(false);
    const signInRef = useRef<{ promise: Promise<ProductionIdentity | null>; resolve: (identity: ProductionIdentity | null) => void } | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<number | null>(null);
    const contextRef = useRef(context);
    useEffect(() => { contextRef.current = context; }, [context]);
    useEffect(() => () => {
        signInRef.current?.resolve(null);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        const socket = socketRef.current;
        if (socket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null;
            socket.onclose = null;
            socket.close();
        }
    }, []);

    const resolveSignIn = (identity: ProductionIdentity | null) => {
        signInRef.current?.resolve(identity);
        signInRef.current = null;
        setSignInOpen(false);
    };

    const signInProduction = () => {
        if (!signInRef.current) {
            let resolve!: (identity: ProductionIdentity | null) => void;
            const promise = new Promise<ProductionIdentity | null>(res => { resolve = res; });
            signInRef.current = { promise, resolve };
            setSignInOpen(true);
        }
        return signInRef.current.promise;
    };

    const connect = () => {
        const numericPort = Number(port);
        if (!Number.isInteger(numericPort) || numericPort < 1024 || numericPort > 65535) {
            toast.error('Enter a port between 1024 and 65535.');
            return;
        }
        if (!/^[a-f0-9]{64}$/.test(token)) {
            toast.error('Enter the pairing code from editor_connection_info.');
            return;
        }
        const socket = new WebSocket(`ws://127.0.0.1:${numericPort}`);
        socketRef.current = socket;
        setStatus('connecting');
        let paired = false;
        const dispatch = createEditorDispatcher({
            document: contextRef.current.document,
            isAdmin: () => contextRef.current.isAdmin(),
            isPainting: () => contextRef.current.isPainting(),
            getScrollCol: () => contextRef.current.getScrollCol(),
            setScrollCol: col => contextRef.current.setScrollCol(col),
            render: col => contextRef.current.render(col),
            confirm: message => contextRef.current.confirm(message),
            signInProduction,
        });
        const timer = window.setTimeout(() => {
            if (!paired) {
                toast.error('Agent pairing timed out.');
                socket.close();
            }
        }, 5000);
        timerRef.current = timer;
        socket.onopen = () => socket.send(JSON.stringify({ type: 'pair', version: EDITOR_BRIDGE_VERSION, token }));
        socket.onmessage = async event => {
            try {
                if (typeof event.data !== 'string' || new Blob([event.data]).size > MAX_BRIDGE_BYTES) {
                    throw new Error('Invalid or oversized agent message.');
                }
                const message: unknown = JSON.parse(event.data);
                if (!paired) {
                    const pairedMessage = pairedMessageSchema.parse(message);
                    paired = true;
                    window.clearTimeout(timer);
                    setStatus('connected');
                    setSessionId(pairedMessage.sessionId);
                    setToken('');
                    setOpen(false);
                    return;
                }
                const request = bridgeRequestSchema.parse(message);
                const response = await dispatch(request);
                if (socket.readyState !== WebSocket.OPEN) return;
                const json = JSON.stringify(response);
                if (new Blob([json]).size > MAX_BRIDGE_BYTES) throw new Error('Agent response exceeds the bridge limit.');
                socket.send(json);
                if (!response.ok) toast.error(response.error);
                else if ('expectedRevision' in request.action || request.action.action === 'delete_saved') {
                    toast.success(`Agent: ${request.action.action}`);
                }
            } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
                socket.close(1008, 'Invalid bridge message');
            }
        };
        socket.onerror = () => toast.error('Could not connect to the local agent companion.');
        socket.onclose = event => {
            window.clearTimeout(timer);
            if (socketRef.current === socket) {
                socketRef.current = null;
                setStatus('disconnected');
                setSessionId('');
                resolveSignIn(null);
            }
            if (paired) toast.info('Agent disconnected.');
            else if (event.code === 1008) toast.error('Agent pairing was rejected.');
        };
    };

    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return null;

    return <>
        <Button onClick={() => setOpen(true)}>{status === 'connected' ? 'Agent: connected' : 'Agent'}</Button>
        <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>Local agent</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {sessionId && <TextField label="Session" value={sessionId} slotProps={{ input: { readOnly: true } }} />}
                    <TextField label="Port" value={port} onChange={event => setPort(event.target.value)} disabled={status !== 'disconnected'} />
                    <TextField label="Pairing code" type="password" autoComplete="off" value={token}
                        onChange={event => setToken(event.target.value)} disabled={status !== 'disconnected'} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>Close</Button>
                {status === 'disconnected'
                    ? <Button onClick={connect}>Connect</Button>
                    : <Button onClick={() => socketRef.current?.close()}>Disconnect</Button>}
            </DialogActions>
        </Dialog>
        <ProductionSignInDialog open={signInOpen} onResolve={resolveSignIn} />
    </>;
}
