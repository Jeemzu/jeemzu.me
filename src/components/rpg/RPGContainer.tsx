import { useCallback, useEffect, useRef } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import Phaser from 'phaser';
import { FONTS } from '../../lib/globals';
import { useRpgStore } from '../../stores/rpgStore';
import { useAuthStore } from '../../stores/authStore';
import { createRpgGameConfig } from '../../games/rpg/RPGGame';
import type { ExplorationScene } from '../../games/rpg/scenes/ExplorationScene';
import PartyLobby from './PartyLobby';
import NarrativePanel from './NarrativePanel';
import ActionInput from './ActionInput';
import DialogueBox from './DialogueBox';
import PartyPanel from './PartyPanel';

const RPGContainer = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const connectionStatus = useRpgStore((s) => s.connectionStatus);
    const party = useRpgStore((s) => s.party);
    const sessionStarted = useRpgStore((s) => s.sessionStarted);
    const isPaused = useRpgStore((s) => s.isPaused);
    const visualCommandBatchId = useRpgStore((s) => s.visualCommandBatchId);
    const connect = useRpgStore((s) => s.connect);
    const disconnect = useRpgStore((s) => s.disconnect);

    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<ExplorationScene | null>(null);
    const lastAppliedBatchRef = useRef(0);

    // Only attempt the hub connection once the user is signed in — the hub requires
    // a JWT, so connecting while logged out just produces repeated 401s.
    useEffect(() => {
        if (!isAuthenticated) return;
        void connect();
        return () => disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const applyPendingCommands = useCallback(() => {
        const state = useRpgStore.getState();
        if (!sceneRef.current) return;
        if (state.visualCommandBatchId === lastAppliedBatchRef.current) return;
        lastAppliedBatchRef.current = state.visualCommandBatchId;
        void sceneRef.current.runVisualCommands(state.visualCommands);
    }, []);

    // Mount the Phaser canvas once the session starts; tear it down on unmount.
    useEffect(() => {
        if (!sessionStarted || !containerRef.current || gameRef.current) return;

        const game = new Phaser.Game({ ...createRpgGameConfig(), parent: containerRef.current });
        gameRef.current = game;

        // Scene construction/creation isn't synchronous with `new Phaser.Game(...)` —
        // wait for the game to finish booting, then handle both possible orderings:
        // create() may have already run (check isReady) or may still be pending
        // (in which case the scene's own 'scene-ready' event will fire once it has).
        game.events.once(Phaser.Core.Events.READY, () => {
            const scene = game.scene.getScene('Exploration') as ExplorationScene | null;
            if (!scene) return;

            if (scene.isReady) {
                sceneRef.current = scene;
                applyPendingCommands();
            } else {
                scene.events.once('scene-ready', () => {
                    sceneRef.current = scene;
                    applyPendingCommands();
                });
            }
        });

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
            sceneRef.current = null;
        };
    }, [sessionStarted, applyPendingCommands]);


    useEffect(() => {
        applyPendingCommands();
    }, [visualCommandBatchId, applyPendingCommands]);

    if (!isAuthenticated) {
        return (
            <>
                {isInitialized && (
                    <Alert
                        severity="info"
                        sx={{ mb: 2, fontFamily: FONTS.NECTO_MONO, '& .MuiAlert-message': { fontFamily: FONTS.NECTO_MONO } }}
                    >
                        Sign in to save your campaigns to the cloud.
                    </Alert>
                )}
                <PartyLobby />
            </>
        );
    }

    if (connectionStatus !== 'connected') {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#a8d67e', mb: 2 }} />
                <Typography fontFamily={FONTS.NECTO_MONO} color="textSecondary">
                    Connecting to the realm...
                </Typography>
            </Box>
        );
    }

    if (!party || !sessionStarted) {
        return (
            <>
                <Alert
                    severity="success"
                    sx={{ mb: 2, fontFamily: FONTS.NECTO_MONO, '& .MuiAlert-message': { fontFamily: FONTS.NECTO_MONO } }}
                >
                    Cloud saves enabled — your campaigns are saved to Azure.
                </Alert>
                <PartyLobby />
            </>
        );
    }

    return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', py: 3, flexDirection: 'column', alignItems: 'center' }}>
            {isPaused && (
                <Alert
                    severity="warning"
                    sx={{ width: '100%', maxWidth: 980, fontFamily: FONTS.NECTO_MONO, '& .MuiAlert-message': { fontFamily: FONTS.NECTO_MONO } }}
                >
                    Session paused — a player disconnected. The host can take over their character to continue.
                </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Box sx={{ position: 'relative', width: 640, maxWidth: '100%' }}>
                    <div ref={containerRef} />
                    <DialogueBox />
                </Box>
                <Box sx={{ width: 340, display: 'flex', flexDirection: 'column' }}>
                    <PartyPanel />
                    <NarrativePanel />
                    <ActionInput />
                </Box>
            </Box>
        </Box>
    );
};

export default RPGContainer;
