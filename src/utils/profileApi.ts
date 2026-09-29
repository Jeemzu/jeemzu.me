/**
 * Profile API Service
 * Authenticated calls for the signed-in user's own account settings.
 *
 * Kept separate from authApi.ts so the auth store can import that module
 * without creating an import cycle through the access token read here.
 */

import type { components } from '../types/api.generated';
import { useAuthStore } from '../stores/authStore';

type ApiSchemas = components['schemas'];

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5050/api';

function authHeader(): Record<string, string> {
    const token = useAuthStore.getState().accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/** GET /api/users/me — the signed-in user's own account settings. */
export async function getProfileRequest(): Promise<ApiSchemas['ProfileResponse']> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { ...authHeader() },
    });
    if (!response.ok) throw new Error(`Could not load profile (${response.status})`);
    return (await response.json()) as ApiSchemas['ProfileResponse'];
}

/** POST /api/users/me/preferences — leaderboard opt-in and mailing list. Omitted fields are unchanged. */
export async function updateProfilePreferencesRequest(
    body: ApiSchemas['UpdateUserRequest'],
): Promise<ApiSchemas['ProfileResponse']> {
    const response = await fetch(`${API_BASE_URL}/users/me/preferences`, {
        method: 'POST',
        headers: { ...jsonHeaders, ...authHeader() },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Could not save preferences (${response.status})`);
    return (await response.json()) as ApiSchemas['ProfileResponse'];
}

/**
 * POST /api/users/me/username
 * Renaming signs out other sessions, so the API returns a fresh token pair.
 * Returns `{ conflict: true }` when the name is already taken (409).
 */
export async function changeUsernameRequest(
    body: ApiSchemas['ChangeUsernameRequest'],
): Promise<{ token: ApiSchemas['TokenResponse'] } | { conflict: true }> {
    const response = await fetch(`${API_BASE_URL}/users/me/username`, {
        method: 'POST',
        headers: { ...jsonHeaders, ...authHeader() },
        credentials: 'include',
        body: JSON.stringify(body),
    });
    if (response.status === 409) return { conflict: true };
    if (!response.ok) throw new Error(`Username change failed (${response.status})`);
    return { token: (await response.json()) as ApiSchemas['TokenResponse'] };
}

/**
 * POST /api/users/me/password
 * Returns null when the current password is wrong (401).
 */
export async function changePasswordRequest(
    body: ApiSchemas['ChangePasswordRequest'],
): Promise<ApiSchemas['TokenResponse'] | null> {
    const response = await fetch(`${API_BASE_URL}/users/me/password`, {
        method: 'POST',
        headers: { ...jsonHeaders, ...authHeader() },
        credentials: 'include',
        body: JSON.stringify(body),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Password change failed (${response.status})`);
    return (await response.json()) as ApiSchemas['TokenResponse'];
}

/** POST /api/users/me/resend-verification — re-sends the verification link. */
export async function resendVerificationRequest(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/me/resend-verification`, {
        method: 'POST',
        headers: { ...authHeader() },
    });
    if (!response.ok) throw new Error(`Could not resend verification (${response.status})`);
}
