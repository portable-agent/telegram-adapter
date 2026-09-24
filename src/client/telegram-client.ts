import type { LinkReply } from '../model/link.js';

export interface TelegramClient {
    sendText(chatId: string, text: string): Promise<void>;
    sendButtons(chatId: string, reply: LinkReply): Promise<void>;
    answerCallback(callbackId: string, text: string): Promise<void>;
}

type Fetch = typeof fetch;

export class HttpTelegramClient implements TelegramClient {
    public constructor(
        private readonly baseUrl: string,
        private readonly request: Fetch = fetch,
    ) {}

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
                            callback_data: button.id,
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
