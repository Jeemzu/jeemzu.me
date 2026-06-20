/**
 * Game API Service
 * Handles communication with the backend for game data persistence.
 *
 * All request/response shapes are typed against src/types/api.generated.ts,
 * which is regenerated from the live OpenAPI schema at build time.
 * No API types are defined manually in this file.
 */

import type { components } from '../types/api.generated';
import type { GameHighScore, UserGameData } from '../lib/GameTypes';
import { useAuthStore } from '../stores/authStore';

type ApiSchemas = components['schemas'];

/** Returns the Authorization header when the user is logged in, otherwise {}. */
function authHeader(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://jeemzu-dev-chf0dke2c7gmhhgc.canadaeast-01.azurewebsites.net/api';

/**
 * Submit a score. Username comes from the authenticated JWT on the server —
 * it is not accepted from the client body. Requires a valid Bearer token.
 */
export async function saveHighScore(
    gameId: string,
    score: number,
): Promise<{ success: boolean; error?: string }> {
    try {
        const body: ApiSchemas['SubmitScoreRequest'] = {
            gameId,
            score,
            timestamp: Date.now(),
        };
        const response = await fetch(`${API_BASE_URL}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('Failed to save score');
        return { success: true };
    } catch (error) {
        console.error('Error saving high score:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Fetch the top-N scores for a game.
 * The raw response is parsed as ScoreResponse[] (generated type), then explicitly mapped
 * to GameHighScore[]. The `satisfies` call ensures the mapping stays correct if either
 * ScoreResponse or GameHighScore changes after a schema regeneration.
 */
export async function getHighScores(gameId: string, limit = 10): Promise<GameHighScore[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/scores/${gameId}?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch scores');
        const data = (await response.json()) as ApiSchemas['ScoreResponse'][];
        return data.map(item => ({
            gameId: item.gameId!,
            username: item.username!,
            score: item.score!,
            timestamp: item.timestamp!,
        } satisfies GameHighScore));
    } catch (error) {
        console.error('Error fetching high scores:', error);
        return [];
    }
}

/**
 * Fetch a user's profile and per-game high scores.
 * Raw response typed against UserResponse (generated), then mapped to UserGameData
 * — null fields are normalised to their absent-value equivalents.
 */
export async function getUserData(username: string): Promise<UserGameData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${username}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to fetch user data');
        }
        const data = (await response.json()) as ApiSchemas['UserResponse'];
        return {
            userId: data.userId ?? undefined,
            username: data.username!,
            optedIn: data.optedIn ?? false,
            highScores: data.highScores ?? {},
        } satisfies UserGameData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/** Update the authenticated user's leaderboard opt-in preference. Requires auth. */
export async function updateUserPreferences(
    optedIn: boolean,
): Promise<{ success: boolean; error?: string }> {
    try {
        const body: ApiSchemas['UpdateUserRequest'] = { optedIn };
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('Failed to update preferences');
        return { success: true };
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/** localStorage helpers for persisting user preferences across sessions. */
export const LocalStorage = {
    getUserPreference(): UserGameData | null {
        const stored = localStorage.getItem('gameUserData');
        return stored ? (JSON.parse(stored) as UserGameData) : null;
    },
    saveUserPreference(data: UserGameData): void {
        localStorage.setItem('gameUserData', JSON.stringify(data));
    },
    clearUserPreference(): void {
        localStorage.removeItem('gameUserData');
    },
    hasOptedIn(): boolean {
        return this.getUserPreference()?.optedIn ?? false;
    },
    getUsername(): string | null {
        return this.getUserPreference()?.username ?? null;
    },
};
