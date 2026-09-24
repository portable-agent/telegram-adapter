import { describe, expect, it, vi } from 'vitest';
import type { TelegramClient } from '../src/client/telegram-client.js';
import { createApp } from '../src/controller/app.js';
import type { LinkHandler } from '../src/service/link-service.js';

const messages = () => ({ create: vi.fn().mockResolvedValue({ text: 'Reply' }) });

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
            telegram: { sendText: vi.fn() },
            messages: messages(),
        });

        expect((await app.inject({ method: 'GET', url: '/health/live' })).json()).toEqual({ status: 'UP' });
        expect((await app.inject({ method: 'GET', url: '/health/ready' })).json()).toEqual({ status: 'UP' });
        await app.close();
    });

    it('post_whenSecretIsWrong_shouldRejectUpdate', async () => {
        const start = vi.fn();
        const links: LinkHandler = { start };
        const telegram: TelegramClient = { sendText: vi.fn() };
        const app = createApp({ webhookSecret: 'a'.repeat(32), links, telegram, messages: messages() });

        const response = await app.inject({ method: 'POST', url: '/webhooks/telegram', payload: update });

        expect(response.statusCode).toBe(401);
        expect(start).not.toHaveBeenCalled();
        await app.close();
    });

    it('post_whenUpdateIsInvalid_shouldReturnBadRequest', async () => {
        const app = createApp({
            webhookSecret: 'a'.repeat(32),
            links: { start: vi.fn() },
            telegram: { sendText: vi.fn() },
            messages: messages(),
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
            telegram: { sendText: vi.fn() },
            messages: messages(),
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
            telegram: { sendText },
            messages: { create },
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
            telegram: { sendText },
            messages: messages(),
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
});
