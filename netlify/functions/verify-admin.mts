/// <reference types="node" />
import type { Config, Context } from '@netlify/functions';

export default async (req: Request, _context: Context): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
        // Env var not configured — deny all access
        return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let body: { password?: string };
    try {
        body = await req.json() as { password?: string };
    } catch {
        return new Response(JSON.stringify({ ok: false }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const ok = typeof body.password === 'string' && body.password === secret;

    return new Response(JSON.stringify({ ok }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

export const config: Config = {
    path: '/api/verify-admin',
};
