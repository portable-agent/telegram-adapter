export interface TelegramClient {
    sendText(chatId: string, text: string): Promise<void>;
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
}
