/**
 * SignalR connection management for the multiplayer RPG (GameHub in jeemzu.api).
 * Mirrors the fetch-based utils/*Api.ts convention but wraps a persistent
 * HubConnection instead of one-shot requests, since real-time party/gameplay
 * events are pushed from the server rather than polled.
 */
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
import type { CampaignSummary, CharacterClass, PartyInfo, SaveCampaignResponse } from '../lib/RpgTypes';

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api';

// The hub is mapped at the API host root (/hubs/game), not under /api.
const HUB_URL = `${API_BASE_URL.replace(/\/api\/?$/, '')}/hubs/game`;

let connection: signalR.HubConnection | null = null;

/** Lazily creates the singleton HubConnection. Does not start it. */
function getConnection(): signalR.HubConnection {
    if (connection) return connection;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
            accessTokenFactory: () => useAuthStore.getState().accessToken ?? '',
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    return connection;
}

/** Starts the connection if it isn't already connected/connecting. */
export async function connectRpgHub(): Promise<signalR.HubConnection> {
    const conn = getConnection();
    if (conn.state === signalR.HubConnectionState.Disconnected) {
        await conn.start();
    }
    return conn;
}

export async function disconnectRpgHub(): Promise<void> {
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
        await connection.stop();
    }
}

export function onRpgEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
    getConnection().on(event, handler);
}

export function offRpgEvent(event: string): void {
    getConnection().off(event);
}

export async function createParty(characterName: string, characterClass: CharacterClass): Promise<PartyInfo> {
    return getConnection().invoke<PartyInfo>('CreateParty', characterName, characterClass);
}

export async function joinParty(code: string, characterName: string, characterClass: CharacterClass): Promise<PartyInfo> {
    return getConnection().invoke<PartyInfo>('JoinParty', code, characterName, characterClass);
}

export async function leaveParty(): Promise<void> {
    return getConnection().invoke('LeaveParty');
}

export async function startGame(): Promise<void> {
    return getConnection().invoke('StartGame');
}

export async function sendAction(actionText: string, forCharacter?: string): Promise<void> {
    return getConnection().invoke('SendAction', actionText, forCharacter ?? null);
}

// ── Campaign save/load (hub methods) ────────────────────────────────────────

export async function saveCampaign(name?: string): Promise<SaveCampaignResponse> {
    return getConnection().invoke<SaveCampaignResponse>('SaveCampaign', name ?? null);
}

export async function loadCampaign(campaignId: string): Promise<void> {
    return getConnection().invoke('LoadCampaign', campaignId);
}

export async function takeOverCharacter(username: string): Promise<void> {
    return getConnection().invoke('TakeOverCharacter', username);
}

// ── Campaign REST endpoints (for listing before connecting) ─────────────────

export async function listCampaigns(): Promise<CampaignSummary[]> {
    const token = useAuthStore.getState().accessToken;
    if (!token) return [];

    const res = await fetch(`${API_BASE_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
}

export async function deleteCampaign(id: string): Promise<boolean> {
    const token = useAuthStore.getState().accessToken;
    if (!token) return false;

    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
}
