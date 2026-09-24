import { timingSafeEqual } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import type { TelegramClient } from '../client/telegram-client.js';
import { telegramUpdateSchema } from '../model/telegram.js';
import type { LinkHandler } from '../service/link-service.js';

type AppParts = {
    webhookSecret: string;
    links: LinkHandler;
    telegram: TelegramClient;
};

const sameSecret = (left: string, right: string): boolean => {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export const createApp = ({ webhookSecret, links, telegram }: AppParts): FastifyInstance => {
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
        if (parsed.data.message.text.trim() !== '/link') {
            await telegram.sendText(String(parsed.data.message.chat.id), 'Сначала используйте команду /link.');
            return reply.code(200).send({ ok: true });
        }
        const result = await links.start(String(parsed.data.message.from.id), String(parsed.data.message.chat.id));
        await telegram.sendText(String(parsed.data.message.chat.id), result.text);
        return reply.code(200).send({ ok: true });
    });

    return app;
};
