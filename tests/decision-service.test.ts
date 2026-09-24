import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from '../src/client/auth-client.js';
import type { GatewayClient } from '../src/client/gateway-client.js';
import type { LinkStore } from '../src/repository/link-store.js';
import { TokenBox } from '../src/security/token-box.js';
import { DecisionService } from '../src/service/decision-service.js';

describe('DecisionService', () => {
    it('decide_whenCallbackIsValid_shouldForwardStoredCommand', async () => {
        const box = new TokenBox(Buffer.alloc(32, 9));
        const saveSession = vi.fn<LinkStore['saveSession']>().mockResolvedValue(undefined);
        const completeCallback = vi.fn<LinkStore['completeCallback']>().mockResolvedValue(undefined);
        const store = createStore({
            claimCallback: vi.fn().mockResolvedValue({
                id: '10000000-0000-4000-8000-000000000004',
                telegramUserId: '100',
                actionId: '10000000-0000-4000-8000-000000000003',
                payloadHash: 'a'.repeat(64),
                decision: 'CONFIRM',
            }),
            find: vi.fn().mockResolvedValue({
                telegramUserId: '100',
                chatId: '200',
                refreshToken: box.lock('old-refresh'),
                conversationId: '10000000-0000-4000-8000-000000000002',
            }),
            saveSession,
            completeCallback,
        });
        const auth = createAuth({
            refresh: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'new-refresh', expiresIn: 300 }),
        });
        const decide = vi.fn<GatewayClient['decide']>().mockResolvedValue({ status: 'APPROVED' });
        const service = new DecisionService(auth, { send: vi.fn(), decide }, store, box, () => new Date(1000));

        const result = await service.decide('100', '10000000-0000-4000-8000-000000000004');

        expect(result.text).toBe('Решение принято.');
        expect(decide).toHaveBeenCalledWith(
            '10000000-0000-4000-8000-000000000003',
            { decision: 'CONFIRM', payloadHash: 'a'.repeat(64) },
            'access',
        );
        expect(box.unlock(saveSession.mock.calls[0]![1])).toBe('new-refresh');
        expect(completeCallback).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000004', '100', new Date(1000));
    });

    it('decide_whenCallbackIsUnknown_shouldNotCallGateway', async () => {
        const store = createStore({ claimCallback: vi.fn().mockResolvedValue(null) });
        const decide = vi.fn();
        const service = new DecisionService(
            createAuth({}),
            { send: vi.fn(), decide },
            store,
            new TokenBox(Buffer.alloc(32, 9)),
        );

        await expect(service.decide('100', 'missing')).resolves.toEqual({
            text: 'Кнопка больше не действует.',
        });
        expect(decide).not.toHaveBeenCalled();
    });

    it('decide_whenGatewayFails_shouldReleaseCallbackForRetry', async () => {
        const box = new TokenBox(Buffer.alloc(32, 9));
        const releaseCallback = vi.fn<LinkStore['releaseCallback']>().mockResolvedValue(undefined);
        const completeCallback = vi.fn<LinkStore['completeCallback']>().mockResolvedValue(undefined);
        const store = createStore({
            claimCallback: vi.fn().mockResolvedValue({
                id: '10000000-0000-4000-8000-000000000004',
                telegramUserId: '100',
                actionId: '10000000-0000-4000-8000-000000000003',
                payloadHash: 'a'.repeat(64),
                decision: 'CONFIRM',
            }),
            find: vi.fn().mockResolvedValue({
                telegramUserId: '100',
                chatId: '200',
                refreshToken: box.lock('old-refresh'),
                conversationId: null,
            }),
            releaseCallback,
            completeCallback,
        });
        const service = new DecisionService(
            createAuth({
                refresh: vi.fn().mockResolvedValue({
                    accessToken: 'access',
                    refreshToken: 'new-refresh',
                    expiresIn: 300,
                }),
            }),
            { send: vi.fn(), decide: vi.fn().mockRejectedValue(new Error('gateway unavailable')) },
            store,
            box,
            () => new Date(1000),
        );

        await expect(service.decide('100', '10000000-0000-4000-8000-000000000004')).rejects.toThrow(
            'gateway unavailable',
        );
        expect(releaseCallback).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000004', '100');
        expect(completeCallback).not.toHaveBeenCalled();
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
    saveCallbacks: vi.fn(),
    claimCallback: vi.fn(),
    completeCallback: vi.fn(),
    releaseCallback: vi.fn(),
    ...part,
});
