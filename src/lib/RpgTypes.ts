/**
 * Hand-written types for the RPG SignalR contract (GameHub in jeemzu.api).
 * These are NOT part of api.generated.ts because SignalR hub messages aren't
 * described by the OpenAPI/Swagger spec — only REST controllers are.
 *
 * Casing note: top-level event payload keys are camelCase (SignalR's default
 * JSON hub protocol applies a camelCase naming policy to C# PascalCase names).
 * Nested `uiState`/`visualCommands` content is passed through verbatim from the
 * Python RPG service, which uses snake_case — so those nested keys stay snake_case.
 */

export type CharacterClass = 'warrior' | 'mage' | 'rogue';

export interface PartyMemberInfo {
    username: string;
    characterName: string;
    characterClass: CharacterClass;
    isHost: boolean;
    isConnected: boolean;
    controlledBy: string | null;
}

export interface PartyInfo {
    partyId: string;
    code: string;
    status: 'Lobby' | 'InGame' | 'Paused' | 'Completed';
    campaignId: string | null;
    members: PartyMemberInfo[];
}

/** A single instruction for the Phaser layer, e.g. { type: "transition_map", data: {...} }. */
export interface VisualCommand {
    type: string;
    data: Record<string, unknown>;
}

export interface PlayerUiState {
    name: string;
    class: CharacterClass;
    level: number;
    hp: number;
    max_hp: number;
    mp: number;
    max_mp: number;
    xp: number;
}

export interface GameUiState {
    current_location: string;
    game_phase: 'exploration' | 'dialogue' | 'combat';
    players: Record<string, PlayerUiState>;
    mutations: Record<string, unknown>[];
    combat?: { current_turn?: string | null } & Record<string, unknown>;
}

/** Common shape of the GameStarted and GameUpdate SignalR events. */
export interface GameUpdatePayload {
    narrative: string;
    visualCommands: VisualCommand[];
    uiState: GameUiState;
    actionType?: string;
}

export interface RpgErrorPayload {
    message: string;
}

export interface NarrativeLogEntry {
    id: string;
    text: string;
    kind: 'narrative' | 'system';
}

// ── Campaign (save/load) ────────────────────────────────────────────────────

export interface CampaignSummary {
    id: string;
    name: string;
    currentLocation: string;
    characterSummaryJson: string;
    status: string;
    lastPlayedAt: string;
    createdAt: string;
}

export interface SaveCampaignResponse {
    campaignId: string;
    name: string;
    savedAt: string;
}

export interface CharacterTakenOverPayload {
    targetUsername: string;
    controlledBy: string;
    sessionResumed: boolean;
}

export interface PlayerDisconnectedPayload {
    username: string;
    isHost: boolean;
    partyPaused: boolean;
}

export interface CampaignSavedPayload {
    campaignId: string;
    name: string;
    savedAt: string;
}
