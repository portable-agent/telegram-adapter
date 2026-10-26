import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from '../src/client/auth-client.js';
import type { StatusClient } from '../src/client/gateway-client.js';
import type { TelegramClient } from '../src/client/telegram-client.js';
import type { ActionCheckStore } from '../src/repository/action-check-store.js';
import type { LinkStore } from '../src/repository/link-store.js';
import { TokenBox } from '../src/security/token-box.js';
import { ActionWorker } from '../src/service/action-worker.js';

const actionId = '10000000-0000-4000-8000-000000000003';
const check = { actionId, telegramUserId: '100', chatId: '200' };

const makeWorker = (status: 'APPROVED' | 'SUCCEEDED' | 'FAILED') => {
    const box = new TokenBox(Buffer.alloc(32, 9));
    const sendText = vi.fn().mockResolvedValue(undefined);
    const finish = vi.fn().mockResolvedValue(undefined);
    const reschedule = vi.fn().mockResolvedValue(undefined);
    const checks: ActionCheckStore = {
        watch: vi.fn(),
        claimReady: vi.fn().mockResolvedValue([check]),
        finish,
        reschedule,
    };
    const links = {
        find: vi.fn().mockResolvedValue({
            telegramUserId: '100',
            chatId: '200',
            refreshToken: box.lock('old-refresh'),
            conversationId: null,
        }),
        saveSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as LinkStore;
    const auth = {
        refresh: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'new-refresh' }),
    } as unknown as AuthClient;
    const getStatus = vi.fn().mockResolvedValue({ actionId, status, kind: 'calendar.create_event', title: 'Встреча' });
    const gateway = { getStatus } as StatusClient;
    const telegram = { sendText } as unknown as TelegramClient;
    const worker = new ActionWorker(auth, gateway, links, checks, telegram, box, () => new Date(1000));
    return { worker, getStatus, sendText, finish, reschedule };
};

describe('ActionWorker', () => {
    it('runOnce_whenActionSucceeded_shouldSendOneResult', async () => {
        const { worker, getStatus, sendText, finish, reschedule } = makeWorker('SUCCEEDED');

        await worker.runOnce();

        expect(getStatus).toHaveBeenCalledWith(actionId, 'access');
        expect(sendText).toHaveBeenCalledWith('200', 'Готово: Встреча');
        expect(finish).toHaveBeenCalledWith(actionId);
        expect(reschedule).not.toHaveBeenCalled();
    });

    it('runOnce_whenActionIsPending_shouldCheckLater', async () => {
        const { worker, sendText, finish, reschedule } = makeWorker('APPROVED');

        await worker.runOnce();

        expect(sendText).not.toHaveBeenCalled();
        expect(finish).not.toHaveBeenCalled();
        expect(reschedule).toHaveBeenCalledWith(actionId, new Date(4000));
    });

    it('runOnce_whenTelegramFails_shouldRetry', async () => {
        const { worker, sendText, finish, reschedule } = makeWorker('FAILED');
        sendText.mockRejectedValueOnce(new Error('Telegram unavailable'));

        await worker.runOnce();

        expect(finish).not.toHaveBeenCalled();
        expect(reschedule).toHaveBeenCalledWith(actionId, new Date(6000));
    });

    it('runOnce_whenSavingDeliveryFails_shouldAllowDuplicateAfterRetry', async () => {
        const { worker, sendText, finish, reschedule } = makeWorker('SUCCEEDED');
        finish.mockRejectedValueOnce(new Error('PostgreSQL unavailable'));

        await worker.runOnce();
        await worker.runOnce();

        expect(sendText).toHaveBeenCalledTimes(2);
        expect(reschedule).toHaveBeenCalledWith(actionId, new Date(6000));
    });
});
