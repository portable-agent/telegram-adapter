import type { LinkReply } from '../model/link.js';
import { z } from 'zod';

export type TelegramPollUpdate = { update_id: number; [key: string]: unknown };

export interface TelegramPollClient {
    deleteWebhook(): Promise<void>;
    getUpdates(offset?: number, signal?: AbortSignal): Promise<TelegramPollUpdate[]>;
}

const updatesSchema = z.object({
    ok: z.literal(true),
    result: z.array(z.object({ update_id: z.number().int() }).passthrough()),
});

export interface TelegramClient {
    sendText(chatId: string, text: string): Promise<void>;
    sendButtons(chatId: string, reply: LinkReply): Promise<void>;
    answerCallback(callbackId: string, text: string): Promise<void>;
}

type Fetch = typeof fetch;

export class HttpTelegramClient implements TelegramClient, TelegramPollClient {
    public constructor(
        private readonly baseUrl: string,
        private readonly request: Fetch = fetch,
    ) {}

    public async deleteWebhook(): Promise<void> {
        const response = await this.request(`${this.baseUrl}/deleteWebhook`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ drop_pending_updates: false }),
        });
        if (!response.ok || ((await response.json()) as { ok?: boolean }).ok !== true) {
            throw new Error('Telegram deleteWebhook failed.');
        }
    }

    public async getUpdates(offset?: number, signal?: AbortSignal): Promise<TelegramPollUpdate[]> {
        const response = await this.request(`${this.baseUrl}/getUpdates`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ offset, timeout: 20, allowed_updates: ['message', 'callback_query'] }),
            ...(signal ? { signal } : {}),
        });
        if (!response.ok) {
            throw new Error('Telegram getUpdates failed.');
        }
        const parsed = updatesSchema.safeParse(await response.json());
        if (!parsed.success) {
            throw new Error('Telegram getUpdates returned invalid data.');
        }
        return parsed.data.result;
    }

    public async sendText(chatId: string, text: string): Promise<void> {
        const response = await this.request(`${this.baseUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        if (!response.ok) {
            throw new Error('Telegram sendMessage failed.');
        }
    }

    public async sendButtons(chatId: string, reply: LinkReply): Promise<void> {
        const response = await this.request(`${this.baseUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: reply.text,
                reply_markup: {
                    inline_keyboard: [
                        (reply.buttons ?? []).map((button) => ({
                            text: button.label,
                            ...(button.type === 'url' ? { url: button.url } : { callback_data: button.id }),
                        })),
                    ],
                },
            }),
        });
        if (!response.ok) {
            throw new Error('Telegram sendMessage failed.');
        }
    }

    public async answerCallback(callbackId: string, text: string): Promise<void> {
        const response = await this.request(`${this.baseUrl}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackId, text }),
        });
        if (!response.ok) {
            throw new Error('Telegram answerCallbackQuery failed.');
        }
    }
}
