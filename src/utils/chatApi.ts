/**
 * Chat API Service
 * Calls the .NET Semantic Kernel RAG chat endpoint.
 *
 * The server is fully stateless — the client is responsible for tracking
 * conversation history and sending it with each request.
 */

import type { components } from '../types/api.generated';

type ApiSchemas = components['schemas'];

export type ConversationMessage = ApiSchemas['ConversationMessage'];

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5050/api';

/**
 * POST /chat
 * Sends a question to the chat pipeline and returns the answer, or null on failure.
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
