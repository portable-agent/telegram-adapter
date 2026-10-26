import { describe, expect, it, vi } from 'vitest';
import { HttpTelegramClient } from '../src/client/telegram-client.js';

describe('HttpTelegramClient', () => {
    it('getUpdates_whenPolling_shouldSendOffsetAndAllowedTypes', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(Response.json({ ok: true, result: [{ update_id: 5 }] }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        expect(await client.getUpdates(5)).toEqual([{ update_id: 5 }]);
        expect(request.mock.calls[0]?.[0]).toBe('https://api.telegram.test/bot/getUpdates');
        const body = request.mock.calls[0]?.[1]?.body;
        if (typeof body !== 'string') throw new Error('Expected JSON body.');
        expect(JSON.parse(body)).toEqual({
            offset: 5,
            timeout: 20,
            allowed_updates: ['message', 'callback_query'],
        });
    });

    it('deleteWebhook_whenPollingStarts_shouldKeepPendingUpdates', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, result: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.deleteWebhook();

        expect(request.mock.calls[0]?.[0]).toBe('https://api.telegram.test/bot/deleteWebhook');
        const body = request.mock.calls[0]?.[1]?.body;
        if (typeof body !== 'string') throw new Error('Expected JSON body.');
        expect(JSON.parse(body)).toEqual({ drop_pending_updates: false });
    });

    it('getUpdates_whenTelegramRejectsRequest_shouldFailWithoutReadingUpdates', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, result: [] }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await expect(client.getUpdates()).rejects.toThrow('Telegram getUpdates returned invalid data.');
    });

    it('sendButtons_whenReplyHasButtons_shouldCreateInlineKeyboard', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.sendButtons('200', {
            text: 'Подтвердите',
            buttons: [{ type: 'callback', id: '10000000-0000-4000-8000-000000000004', label: 'Да' }],
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

    it('sendButtons_whenReplyHasUrlButton_shouldUseTelegramUrl', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.sendButtons('200', {
            text: 'Подключите календарь',
            buttons: [{ type: 'url', label: 'Подключить', url: 'https://accounts.google.com/oauth' }],
        });

        const requestBody = request.mock.calls[0]?.[1]?.body;
        if (typeof requestBody !== 'string') {
            throw new Error('Expected a JSON request body.');
        }
        const body = JSON.parse(requestBody) as {
            reply_markup: { inline_keyboard: Array<Array<{ url: string }>> };
        };
        expect(body.reply_markup.inline_keyboard[0]?.[0]?.url).toBe('https://accounts.google.com/oauth');
    });

    it('answerCallback_whenCalled_shouldUseTelegramCallbackMethod', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
        const client = new HttpTelegramClient('https://api.telegram.test/bot', request);

        await client.answerCallback('callback-id', 'Готово');

        expect(request.mock.calls[0]?.[0]).toBe('https://api.telegram.test/bot/answerCallbackQuery');
    });
});
