/**
 * Chat API Service
 * Calls the stateless RAG chatbot endpoint.
 * All types come from src/types/api.generated.ts.
 *
 * The server is fully stateless — the client is responsible for tracking
 * conversation history and sending it with each request.
 */

import type { components } from '../types/api.generated';

type ApiSchemas = components['schemas'];

export type ConversationMessage = ApiSchemas['ConversationMessage'];

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api';

/**
 * POST /api/chat
 * Sends a question along with prior conversation history and returns the AI answer.
 * Returns null if the request fails so callers can show a graceful error.
 */
export async function chatRequest(
    question: string,
    history: ConversationMessage[],
): Promise<string | null> {
    try {
        const body: ApiSchemas['ChatRequest'] = { question, history };
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as ApiSchemas['ChatResponse'];
        return data.answer ?? null;
    } catch {
        return null;
    }
}
