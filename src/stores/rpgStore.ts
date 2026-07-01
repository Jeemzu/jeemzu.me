import { create } from 'zustand';
import {
    connectRpgHub,
    disconnectRpgHub,
    onRpgEvent,
    createParty as apiCreateParty,
    joinParty as apiJoinParty,
    leaveParty as apiLeaveParty,
    startGame as apiStartGame,
    sendAction as apiSendAction,
    saveCampaign as apiSaveCampaign,
    loadCampaign as apiLoadCampaign,
    takeOverCharacter as apiTakeOverCharacter,
} from '../utils/rpgApi';
import type {
    CampaignSavedPayload,
    CharacterClass,
    CharacterTakenOverPayload,
    GameUiState,
    GameUpdatePayload,
    NarrativeLogEntry,
    PartyInfo,
    PlayerDisconnectedPayload,
    RpgErrorPayload,
} from '../lib/RpgTypes';

interface DialogueState {
    npcName: string;
    portrait: string;
}

interface RpgState {
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    party: PartyInfo | null;
    sessionStarted: boolean;
    narrativeLog: NarrativeLogEntry[];
    uiState: GameUiState | null;
    dialogue: DialogueState | null;
    /** Bumped on every GameStarted/GameUpdate so effects can react even if the array is empty. */
    visualCommandBatchId: number;
    visualCommands: GameUpdatePayload['visualCommands'];
    error: string | null;
    busy: boolean;
    /** True when the session is paused due to a player disconnect. */
    isPaused: boolean;

    connect: () => Promise<void>;
    disconnect: () => void;
    createParty: (name: string, characterClass: CharacterClass) => Promise<boolean>;
    joinParty: (code: string, name: string, characterClass: CharacterClass) => Promise<boolean>;
    leaveParty: () => Promise<void>;
    startGame: () => Promise<void>;
    sendAction: (text: string, forCharacter?: string) => Promise<void>;
    saveCampaign: (name?: string) => Promise<boolean>;
    loadCampaign: (campaignId: string) => Promise<boolean>;
    takeOverCharacter: (username: string) => Promise<boolean>;
    clearError: () => void;
}

let handlersRegistered = false;
let logCounter = 0;
const nextLogId = () => `log-${++logCounter}`;

function extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message.replace(/^.*HubException: /, '');
    return 'Something went wrong.';
}

export const useRpgStore = create<RpgState>((set, get) => ({
    connectionStatus: 'disconnected',
    party: null,
    sessionStarted: false,
    narrativeLog: [],
    uiState: null,
    dialogue: null,
    visualCommandBatchId: 0,
    visualCommands: [],
    error: null,
    busy: false,
    isPaused: false,

    connect: async () => {
        if (get().connectionStatus !== 'disconnected') return;
        set({ connectionStatus: 'connecting' });

        if (!handlersRegistered) {
            onRpgEvent<PartyInfo>('PartyUpdated', (party) => set({ party }));

            onRpgEvent('PartyDisbanded', () => set({
                party: null,
                sessionStarted: false,
                narrativeLog: [],
                uiState: null,
                dialogue: null,
            }));

            onRpgEvent<GameUpdatePayload>('GameStarted', (payload) => {
                applyGameUpdate(set, get, payload, true);
            });

            onRpgEvent<GameUpdatePayload>('GameUpdate', (payload) => {
                applyGameUpdate(set, get, payload, false);
            });

            onRpgEvent<RpgErrorPayload>('Error', (payload) => set({ error: payload.message }));

            onRpgEvent<PlayerDisconnectedPayload>('PlayerDisconnected', (payload) => {
                const log = [...get().narrativeLog, {
                    id: nextLogId(),
                    text: `${payload.username} disconnected.${payload.partyPaused ? ' Session paused.' : ''}`,
                    kind: 'system' as const,
                }];
                set({ narrativeLog: log, isPaused: payload.partyPaused });
            });

            onRpgEvent<CharacterTakenOverPayload>('CharacterTakenOver', (payload) => {
                const log = [...get().narrativeLog, {
                    id: nextLogId(),
                    text: `${payload.controlledBy} took control of ${payload.targetUsername}'s character.${payload.sessionResumed ? ' Session resumed.' : ''}`,
                    kind: 'system' as const,
                }];
                set({ narrativeLog: log, isPaused: !payload.sessionResumed });
            });

            onRpgEvent<CampaignSavedPayload>('CampaignSaved', (payload) => {
                const log = [...get().narrativeLog, {
                    id: nextLogId(),
                    text: `Campaign "${payload.name}" saved.`,
                    kind: 'system' as const,
                }];
                set({ narrativeLog: log });
            });

            handlersRegistered = true;
        }

        try {
            await connectRpgHub();
            set({ connectionStatus: 'connected' });
        } catch {
            set({ connectionStatus: 'disconnected', error: 'Could not connect to the game server.' });
        }
    },

    disconnect: () => {
        disconnectRpgHub();
        set({ connectionStatus: 'disconnected' });
    },

    createParty: async (name, characterClass) => {
        set({ busy: true, error: null });
        try {
            const party = await apiCreateParty(name, characterClass);
            set({ party, busy: false });
            return true;
        } catch (err) {
            set({ error: extractErrorMessage(err), busy: false });
            return false;
        }
    },

    joinParty: async (code, name, characterClass) => {
        set({ busy: true, error: null });
        try {
            const party = await apiJoinParty(code, name, characterClass);
            set({ party, busy: false });
            return true;
        } catch (err) {
            set({ error: extractErrorMessage(err), busy: false });
            return false;
        }
    },

    leaveParty: async () => {
        try {
            await apiLeaveParty();
        } catch {
            // best-effort — clear local state regardless
        }
        set({
            party: null,
            sessionStarted: false,
            narrativeLog: [],
            uiState: null,
            dialogue: null,
        });
    },

    startGame: async () => {
        set({ busy: true, error: null });
        try {
            await apiStartGame();
        } catch (err) {
            set({ error: extractErrorMessage(err) });
        } finally {
            set({ busy: false });
        }
    },

    sendAction: async (text, forCharacter) => {
        set({ busy: true, error: null });
        try {
            await apiSendAction(text, forCharacter);
        } catch (err) {
            set({ error: extractErrorMessage(err) });
        } finally {
            set({ busy: false });
        }
    },

    saveCampaign: async (name) => {
        set({ busy: true, error: null });
        try {
            await apiSaveCampaign(name);
            return true;
        } catch (err) {
            set({ error: extractErrorMessage(err), busy: false });
            return false;
        } finally {
            set({ busy: false });
        }
    },

    loadCampaign: async (campaignId) => {
        set({ busy: true, error: null });
        try {
            await apiLoadCampaign(campaignId);
            return true;
        } catch (err) {
            set({ error: extractErrorMessage(err), busy: false });
            return false;
        } finally {
            set({ busy: false });
        }
    },

    takeOverCharacter: async (username) => {
        set({ busy: true, error: null });
        try {
            await apiTakeOverCharacter(username);
            return true;
        } catch (err) {
            set({ error: extractErrorMessage(err), busy: false });
            return false;
        } finally {
            set({ busy: false });
        }
    },

    clearError: () => set({ error: null }),
}));

function applyGameUpdate(
    set: (partial: Partial<RpgState>) => void,
    get: () => RpgState,
    payload: GameUpdatePayload,
    isGameStart: boolean,
): void {
    const log = [...get().narrativeLog, { id: nextLogId(), text: payload.narrative, kind: 'narrative' as const }];

    // A show_dialogue/npc_speak visual command means an NPC is actively talking —
    // surface it via the DialogueBox overlay until the phase leaves "dialogue".
    let dialogue = get().dialogue;
    const dialogueCommand = payload.visualCommands.find(
        (c) => c.type === 'show_dialogue' || c.type === 'npc_speak',
    );
    if (dialogueCommand) {
        dialogue = {
            npcName: (dialogueCommand.data.npc_name as string) ?? 'Unknown',
            portrait: (dialogueCommand.data.portrait as string) ?? '',
        };
    }
    if (payload.uiState.game_phase !== 'dialogue') {
        dialogue = null;
    }

    set({
        sessionStarted: isGameStart ? true : get().sessionStarted,
        narrativeLog: log,
        uiState: payload.uiState,
        dialogue,
        visualCommandBatchId: get().visualCommandBatchId + 1,
        visualCommands: payload.visualCommands,
    });
}
