import { timingSafeEqual } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import type { TelegramClient } from '../client/telegram-client.js';
import { telegramUpdateSchema } from '../model/telegram.js';
import type { LinkHandler } from '../service/link-service.js';
import type { MessageHandler } from '../service/message-service.js';

type AppParts = {
    webhookSecret: string;
    links: LinkHandler;
    telegram: TelegramClient;
    messages: MessageHandler;
};

const sameSecret = (left: string, right: string): boolean => {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export const createApp = ({ webhookSecret, links, telegram, messages }: AppParts): FastifyInstance => {
    const app = Fastify({ logger: false });

    app.get('/health/live', () => ({ status: 'UP' }));
    app.get('/health/ready', () => ({ status: 'UP' }));

    app.post('/webhooks/telegram', async (request, reply) => {
        const secret = request.headers['x-telegram-bot-api-secret-token'];
        if (typeof secret !== 'string' || !sameSecret(secret, webhookSecret)) {
            return reply.code(401).send({ code: 'UNAUTHORIZED' });
        }
        const parsed = telegramUpdateSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ code: 'INVALID_UPDATE' });
        }
        const message = parsed.data.message;
        if (!message) {
            return reply.code(200).send({ ok: true });
        }
        if (message.text.trim() !== '/link') {
            const result = await messages.create(String(message.from.id), String(parsed.data.update_id), message.text);
            await telegram.sendText(String(message.chat.id), result.text);
            return reply.code(200).send({ ok: true });
        }
        const result = await links.start(String(message.from.id), String(message.chat.id));
        await telegram.sendText(String(message.chat.id), result.text);
        return reply.code(200).send({ ok: true });
    });

    return app;
};
