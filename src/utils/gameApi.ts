/**
 * Game API Service
 * Handles communication with the backend for game data persistence
 */

import { type GameHighScore, type UserGameData } from "../lib/GameTypes";

// TODO: Replace with your actual API endpoint
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Save a high score to the database
 */
export async function saveHighScore(
    gameId: string,
    username: string,
    score: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameId,
                username,
                score,
                timestamp: Date.now(),
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save score');
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving high score:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get high scores for a specific game
 */
export async function getHighScores(
    gameId: string,
    limit: number = 10
): Promise<GameHighScore[]> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/scores/${gameId}?limit=${limit}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch scores');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching high scores:', error);
        return [];
    }
}

/**
 * Get user's game data
 */
export async function getUserData(username: string): Promise<UserGameData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${username}`);

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error('Failed to fetch user data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Create or update user preferences
 */
export async function updateUserPreferences(
    username: string,
    optedIn: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                optedIn,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update preferences');
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Local storage helpers for user preferences
 */
export const LocalStorage = {
    getUserPreference(): UserGameData | null {
        const stored = localStorage.getItem('gameUserData');
        return stored ? JSON.parse(stored) : null;
    },

    saveUserPreference(data: UserGameData): void {
        localStorage.setItem('gameUserData', JSON.stringify(data));
    },

    clearUserPreference(): void {
        localStorage.removeItem('gameUserData');
    },

    hasOptedIn(): boolean {
        const data = this.getUserPreference();
        return data?.optedIn ?? false;
    },

    getUsername(): string | null {
        const data = this.getUserPreference();
        return data?.username ?? null;
    },
};
