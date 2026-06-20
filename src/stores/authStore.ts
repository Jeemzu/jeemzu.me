import { create } from 'zustand';
import { logoutRequest, refreshRequest, registerUserRequest, loginUserRequest } from '../utils/authApi';
import type { components } from '../types/api.generated';

type ApiSchemas = components['schemas'];

/** Role values that match what the backend embeds in the JWT. */
export type AppRole = 'Admin' | 'User';

interface AuthState {
    accessToken: string | null;
    username: string | null;
    role: AppRole | null;
    /** Unix timestamp (ms) when the access token expires — for future proactive refresh. */
    expiresAt: number | null;
    isAuthenticated: boolean;
    /** True once the session-restore attempt on app load has settled. */
    isInitialized: boolean;
}

interface AuthActions {
    register: (username: string, password: string, optedIn?: boolean) => Promise<{ success: boolean; conflict?: boolean; error?: string }>;
    loginUser: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    /**
     * Called once on app load. Silently attempts a token refresh using the
     * httpOnly cookie. If the cookie is absent or expired, resolves without
     * setting any auth state.
     */
    initialize: () => Promise<void>;
}

/**
 * Decode the payload section of a JWT without any external library.
 * Used to extract the username from a refreshed access token where we
 * didn't capture the username at login time.
 */
function extractUsernameFromJwt(token: string): string | null {
    try {
        const payload = JSON.parse(
            atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        ) as Record<string, unknown>;
        // .NET serialises ClaimTypes.Name as one of these — check both
        return (
            payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
            payload['unique_name'] ??
            payload['name'] ??
            null
        ) as string | null;
    } catch {
        return null;
    }
}

function stateFromToken(
    token: ApiSchemas['TokenResponse'],
    username: string | null,
): Partial<AuthState> {
    return {
        accessToken: token.accessToken ?? null,
        username,
        role: (token.role ?? null) as AppRole | null,
        expiresAt: token.expiresIn != null ? Date.now() + token.expiresIn * 1000 : null,
        isAuthenticated: !!token.accessToken,
    };
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
    accessToken: null,
    username: null,
    role: null,
    expiresAt: null,
    isAuthenticated: false,
    isInitialized: false,

    register: async (username, password, optedIn = false) => {
        try {
            const result = await registerUserRequest({ username, password, optedIn });
            if (!result) return { success: false, error: 'Registration failed.' };
            if ('conflict' in result) return { success: false, conflict: true, error: `'${username}' is already taken.` };
            set({ ...stateFromToken(result.token, username), isInitialized: true });
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Registration failed.' };
        }
    },

    loginUser: async (username, password) => {
        try {
            const result = await loginUserRequest({ username, password });
            if (!result) return { success: false, error: 'Invalid username or password.' };
            set({ ...stateFromToken(result, username), isInitialized: true });
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Login failed.' };
        }
    },

    logout: async () => {
        logoutRequest().catch(console.error); // fire-and-forget — clear local state regardless
        set({
            accessToken: null,
            username: null,
            role: null,
            expiresAt: null,
            isAuthenticated: false,
        });
    },

    initialize: async () => {
        try {
            const result = await refreshRequest();
            if (result?.accessToken) {
                const username = extractUsernameFromJwt(result.accessToken);
                set({ ...stateFromToken(result, username), isInitialized: true });
                return;
            }
        } catch {
            // No active session — perfectly normal for first-time visitors
        }
        set({ isInitialized: true });
    },
}));
