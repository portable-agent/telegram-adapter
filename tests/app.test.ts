import { describe, expect, it, vi } from 'vitest';
import type { TelegramClient } from '../src/client/telegram-client.js';
import { createApp } from '../src/controller/app.js';
import type { LinkHandler } from '../src/service/link-service.js';

const messages = () => ({ create: vi.fn().mockResolvedValue({ text: 'Reply' }) });
const decisions = () => ({ decide: vi.fn().mockResolvedValue({ text: 'Decision reply' }) });
const telegram = (sendText = vi.fn()): TelegramClient => ({
    sendText,
    sendButtons: vi.fn(),
    answerCallback: vi.fn(),
});

const update = {
    update_id: 1,
    message: {
        message_id: 2,
        from: { id: 100 },
        chat: { id: 200 },
        text: '/link',
    },
};

describe('Telegram webhook', () => {
    it('get_whenHealthIsRequested_shouldReturnUp', async () => {
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: telegram(),
            messages: messages(),
            decisions: decisions(),
        });

        expect((await app.inject({ method: 'GET', url: '/health/live' })).json()).toEqual({ status: 'UP' });
        expect((await app.inject({ method: 'GET', url: '/health/ready' })).json()).toEqual({ status: 'UP' });
        await app.close();
    });

    it('post_whenSecretIsWrong_shouldRejectUpdate', async () => {
        const start = vi.fn();
        const links: LinkHandler = { start };
        const telegramClient = telegram();
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links,
            telegram: telegramClient,
            messages: messages(),
            decisions: decisions(),
        });

        const response = await app.inject({ method: 'POST', url: '/webhooks/telegram', payload: update });

        expect(response.statusCode).toBe(401);
        expect(start).not.toHaveBeenCalled();
        await app.close();
    });

    it('post_whenUpdateIsInvalid_shouldReturnBadRequest', async () => {
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: telegram(),
            messages: messages(),
            decisions: decisions(),
        });

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/telegram',
            headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(32) },
            payload: {},
        });

        expect(response.statusCode).toBe(400);
        await app.close();
    });

    it('post_whenUpdateTypeIsNotSupported_shouldAcknowledgeIt', async () => {
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: telegram(),
            messages: messages(),
            decisions: decisions(),
        });

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/telegram',
            headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(32) },
            payload: { update_id: 1, edited_message: { text: 'ignored' } },
        });

        expect(response.statusCode).toBe(200);
        await app.close();
    });

    it('post_whenCommandIsUnknown_shouldAskUserToLink', async () => {
        const sendText = vi.fn();
        const create = vi.fn().mockResolvedValue({ text: 'Gateway reply' });
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: telegram(sendText),
            messages: { create },
            decisions: decisions(),
        });

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/telegram',
            headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(32) },
            payload: { ...update, message: { ...update.message, text: 'hello' } },
        });

        expect(response.statusCode).toBe(200);
        expect(create).toHaveBeenCalledWith('100', '1', 'hello');
        expect(sendText).toHaveBeenCalledWith('200', 'Gateway reply');
        await app.close();
    });

    it('post_whenLinkCommandIsValid_shouldStartLinkAndReply', async () => {
        const start = vi.fn().mockResolvedValue({ text: 'Open link' });
        const sendText = vi.fn();
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start },
            telegram: telegram(sendText),
            messages: messages(),
            decisions: decisions(),
        });

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/telegram',
            headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(32) },
            payload: update,
        });

        expect(response.statusCode).toBe(200);
        expect(start).toHaveBeenCalledWith('100', '200');
        expect(sendText).toHaveBeenCalledWith('200', 'Open link');
        await app.close();
    });

    it('post_whenCallbackIsValid_shouldForwardDecisionAndAnswerCallback', async () => {
        const decide = vi.fn().mockResolvedValue({ text: 'Решение принято.' });
        const answerCallback = vi.fn();
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: { ...telegram(), answerCallback },
            messages: messages(),
            decisions: { decide },
        });
        const callbackId = '10000000-0000-4000-8000-000000000004';

        const response = await app.inject({
            method: 'POST',
            url: '/webhooks/telegram',
            headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(32) },
            payload: {
                update_id: 2,
                callback_query: { id: 'telegram-callback', from: { id: 100 }, data: callbackId },
            },
        });

        expect(response.statusCode).toBe(200);
        expect(decide).toHaveBeenCalledWith('100', callbackId);
        expect(answerCallback).toHaveBeenCalledWith('telegram-callback', 'Решение принято.');
        await app.close();
    });
});
