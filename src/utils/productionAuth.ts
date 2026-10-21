import type { components } from '../types/api.generated';
import type { ProductionIdentity } from '../lib/EditorAgentProtocol';

export type { ProductionIdentity };

type TokenResponse = components['schemas']['TokenResponse'];

export const PRODUCTION_API_URL =
    import.meta.env.VITE_PRODUCTION_API_URL || 'https://api.jeemzu.me/api';

/**
 * Verifies credentials against the production API and returns the server-issued role.
 * The access token is discarded; nothing is persisted and no cookie is accepted.
 */
export async function verifyProductionLogin(username: string, password: string): Promise<ProductionIdentity | null> {
    const response = await fetch(`${PRODUCTION_API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ username, password }),
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Production sign-in failed (${response.status})`);
    const token = (await response.json()) as TokenResponse;
    if (!token.accessToken || !token.role) throw new Error('Production sign-in returned no role.');
    return {
        username,
        role: token.role,
        expiresAt: Date.now() + (token.expiresIn ?? 900) * 1000,
    };
}
