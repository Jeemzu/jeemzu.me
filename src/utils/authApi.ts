/**
 * Auth API Service
 * Raw HTTP calls for authentication endpoints.
 * All types derive from src/types/api.generated.ts — never defined manually here.
 *
 * Important: every request uses `credentials: 'include'` so the browser automatically
 * sends and receives the httpOnly refresh-token cookie managed by the backend.
 */

import type { components } from '../types/api.generated';

type ApiSchemas = components['schemas'];

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5050/api';

/**
 * POST /api/auth/refresh
 * No request body — the refresh token is read from the httpOnly cookie.
 * Returns a new TokenResponse on success, null if the session has expired.
 */
export async function refreshRequest(): Promise<ApiSchemas['TokenResponse'] | null> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Token refresh failed (${response.status})`);
    return (await response.json()) as ApiSchemas['TokenResponse'];
}

/**
 * POST /api/auth/logout
 * Revokes the refresh token server-side and clears the cookie.
 */
export async function logoutRequest(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
}

/**
 * POST /api/users/register
 * Creates a new user account and returns a TokenResponse (role = "User").
 * Returns `{ conflict: true }` when the username is already taken (409).
 */
export async function registerUserRequest(
    body: ApiSchemas['RegisterRequest'],
): Promise<{ token: ApiSchemas['TokenResponse'] } | { conflict: true } | null> {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
    });
    if (response.status === 409) return { conflict: true };
    if (!response.ok) throw new Error(`Register failed (${response.status})`);
    return { token: (await response.json()) as ApiSchemas['TokenResponse'] };
}

/**
 * POST /api/users/login
 * Authenticates an existing user. Returns null on invalid credentials (401).
 */
export async function loginUserRequest(
    body: ApiSchemas['LoginRequest'],
): Promise<ApiSchemas['TokenResponse'] | null> {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`User login failed (${response.status})`);
    return (await response.json()) as ApiSchemas['TokenResponse'];
}

const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * POST /api/users/forgot-password
 * Always resolves — the API deliberately returns the same response whether or
 * not the address belongs to a verified account, so it can't be used to probe
 * for registered emails.
 */
export async function forgotPasswordRequest(
    body: ApiSchemas['ForgotPasswordRequest'],
): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/forgot-password`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Reset request failed (${response.status})`);
}

/**
 * POST /api/users/reset-password
 * Returns false when the link has expired or was already used.
 */
export async function resetPasswordRequest(
    body: ApiSchemas['ResetPasswordRequest'],
): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
    });
    if (response.status === 400) return false;
    if (!response.ok) throw new Error(`Password reset failed (${response.status})`);
    return true;
}

/**
 * POST /api/users/verify-email
 * `conflict` means the address is already verified on a different account.
 */
export async function verifyEmailRequest(
    body: ApiSchemas['VerifyEmailRequest'],
): Promise<{ ok: true } | { ok: false; conflict: boolean }> {
    const response = await fetch(`${API_BASE_URL}/users/verify-email`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400 || response.status === 409)
        return { ok: false, conflict: response.status === 409 };
    throw new Error(`Email verification failed (${response.status})`);
}
