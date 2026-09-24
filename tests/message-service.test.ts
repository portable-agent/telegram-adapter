import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from '../src/client/auth-client.js';
import type { GatewayClient } from '../src/client/gateway-client.js';
import type { LinkStore } from '../src/repository/link-store.js';
import { TokenBox } from '../src/security/token-box.js';
import { MessageService } from '../src/service/message-service.js';

describe('MessageService', () => {
    it('create_whenUserIsLinked_shouldRefreshTokenAndCallGateway', async () => {
        const box = new TokenBox(Buffer.alloc(32, 8));
        const find = vi.fn<LinkStore['find']>().mockResolvedValue({
            telegramUserId: '100',
            chatId: '200',
            refreshToken: box.lock('old-refresh'),
            conversationId: null,
        });
        const saveSession = vi.fn<LinkStore['saveSession']>().mockResolvedValue(undefined);
        const store = createStore({ find, saveSession });
        const auth = createAuth({
            refresh: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'new-refresh', expiresIn: 300 }),
        });
        const send = vi.fn<GatewayClient['send']>().mockResolvedValue({
            messageId: '10000000-0000-4000-8000-000000000001',
            conversationId: '10000000-0000-4000-8000-000000000002',
            reply: { type: 'text', text: 'Когда начать?' },
        });
        const service = new MessageService(auth, { send }, store, box, 'ru-RU', 'Europe/Moscow');

        const result = await service.create('100', '42', 'Создай встречу');

        expect(result.text).toBe('Когда начать?');
        expect(send).toHaveBeenCalledWith(
            {
                requestKey: 'telegram:42',
                text: 'Создай встречу',
                context: { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
            },
            'access',
        );
        const savedToken = saveSession.mock.calls[0]?.[1];
        expect(box.unlock(savedToken!)).toBe('new-refresh');
    });

    it('create_whenUserIsNotLinked_shouldAskToLink', async () => {
        const store = createStore({ find: vi.fn().mockResolvedValue(null) });
        const refresh = vi.fn();
        const send = vi.fn();
        const service = new MessageService(
            createAuth({ refresh }),
            { send },
            store,
            new TokenBox(Buffer.alloc(32, 8)),
            'ru-RU',
            'Europe/Moscow',
        );

        await expect(service.create('100', '42', 'Привет')).resolves.toEqual({
            text: 'Сначала подключите аккаунт командой /link.',
        });
        expect(refresh).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
    });

    it('create_whenGatewayReturnsCard_shouldRenderFields', async () => {
        const box = new TokenBox(Buffer.alloc(32, 8));
        const store = createStore({
            find: vi.fn().mockResolvedValue({
                telegramUserId: '100',
                chatId: '200',
                refreshToken: box.lock('refresh'),
                conversationId: '10000000-0000-4000-8000-000000000002',
            }),
        });
        const auth = createAuth({
            refresh: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', expiresIn: 300 }),
        });
        const send = vi.fn<GatewayClient['send']>().mockResolvedValue({
            messageId: '10000000-0000-4000-8000-000000000001',
            conversationId: '10000000-0000-4000-8000-000000000002',
            reply: {
                type: 'confirmation',
                card: { title: 'Подтвердите встречу', fields: [{ label: 'Название', value: 'Demo' }] },
            },
        });
        const gateway: GatewayClient = { send };
        const service = new MessageService(auth, gateway, store, box, 'ru-RU', 'Europe/Moscow');

        const result = await service.create('100', '42', 'Создай встречу');

        expect(result.text).toBe('Подтвердите встречу\nНазвание: Demo');
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({ conversationId: '10000000-0000-4000-8000-000000000002' }),
            'access',
        );
    });
});

const createAuth = (part: Partial<AuthClient>): AuthClient => ({
    start: vi.fn(),
    poll: vi.fn(),
    refresh: vi.fn(),
    ...part,
});

const createStore = (part: Partial<LinkStore>): LinkStore => ({
    savePending: vi.fn(),
    claimReady: vi.fn(),
    complete: vi.fn(),
    reschedule: vi.fn(),
    removePending: vi.fn(),
    find: vi.fn(),
    saveSession: vi.fn(),
    ...part,
});
