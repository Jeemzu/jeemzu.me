import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const RECIPIENT = "jamesfriedenberg@gmail.com";

export const handler: Handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY is not set");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
    }

    let body: { subject?: string; message?: string; senderName?: string; senderEmail?: string };
    try {
        body = JSON.parse(event.body ?? "{}");
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { subject, message, senderName, senderEmail } = body;

    if (!subject?.trim() || !message?.trim()) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Subject and message are required" }),
        };
    }

    const resend = new Resend(apiKey);

    const fromName = senderName?.trim() || "Portfolio Contact Form";
    const replyTo = senderEmail?.trim() || undefined;

    const emailBody = [
        senderName ? `From: ${senderName}` : null,
        senderEmail ? `Email: ${senderEmail}` : null,
        "",
        message.trim(),
    ]
        .filter((line) => line !== null)
        .join("\n");

    const { error } = await resend.emails.send({
        from: "Contact Form <onboarding@resend.dev>",
        to: RECIPIENT,
        replyTo,
        subject: `[jeemzu.me] ${subject.trim()}`,
        text: emailBody,
        headers: {
            "X-From-Name": fromName,
        },
    });

    if (error) {
        console.error("Resend error:", error);
        return {
            statusCode: 502,
            body: JSON.stringify({ error: "Failed to send message. Please try again later." }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
    };
};
