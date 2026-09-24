import { describe, expect, it, vi } from 'vitest';
import { HttpTelegramClient } from '../src/client/telegram-client.js';

describe('HttpTelegramClient', () => {
    it('sendButtons_whenReplyHasButtons_shouldCreateInlineKeyboard', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.sendButtons('200', {
            text: 'Подтвердите',
            buttons: [{ id: '10000000-0000-4000-8000-000000000004', label: 'Да' }],
        });

        const requestBody = request.mock.calls[0]?.[1]?.body;
        expect(typeof requestBody).toBe('string');
        if (typeof requestBody !== 'string') {
            throw new Error('Expected a JSON request body.');
        }
        const body = JSON.parse(requestBody) as {
            reply_markup: { inline_keyboard: Array<Array<{ callback_data: string }>> };
        };
        expect(body.reply_markup.inline_keyboard[0]?.[0]?.callback_data).toBe('10000000-0000-4000-8000-000000000004');
    });

    it('answerCallback_whenCalled_shouldUseTelegramCallbackMethod', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.answerCallback('callback-id', 'Готово');

        expect(request.mock.calls[0]?.[0]).toBe('https://api.telegram.test/bot/answerCallbackQuery');
    });
});
