/**
 * Chat API Service
 * Calls the multi-agent orchestrated chatbot via the Python LangGraph service.
 * Falls back to the .NET RAG endpoint if the agent service is unavailable.
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

const AGENT_URL = import.meta.env.VITE_AGENT_URL || '';

interface AgentChatResponse {
    answer: string;
    agents_used: string[];
    used_web_search: boolean;
}

/**
 * POST /chat (agent service)
 * Sends a question to the multi-agent orchestration layer.
 * Falls back to the .NET RAG endpoint if the agent service is unreachable or not configured.
 */
export async function chatRequest(
    question: string,
    history: ConversationMessage[],
): Promise<string | null> {
    // Try the agent service if configured (5s timeout for cold starts)
    if (AGENT_URL) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${AGENT_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, history }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.ok) {
                const data = (await response.json()) as AgentChatResponse;
                return data.answer ?? null;
            }
        } catch {
            // Agent service unavailable or timed out — fall through to .NET fallback
        }
    }

    // Fallback: direct .NET RAG endpoint
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
