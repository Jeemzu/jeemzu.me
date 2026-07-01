const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ContactEmailPayload {
    subject: string;
    content: string;
}

export async function sendContactEmail(
    payload: ContactEmailPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) return { success: true };
        return { success: false, error: 'Failed to send message. Please try again.' };
    } catch {
        return { success: false, error: 'Network error. Please try again.' };
    }
}
