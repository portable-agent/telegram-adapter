import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from '../src/client/auth-client.js';
import type { TelegramClient } from '../src/client/telegram-client.js';
import type { LinkStore } from '../src/repository/link-store.js';
import { TokenBox } from '../src/security/token-box.js';
import { LinkWorker } from '../src/service/link-worker.js';

describe('LinkWorker', () => {
    it('runOnce_whenUserApproved_shouldSaveEncryptedRefreshToken', async () => {
        const box = new TokenBox(Buffer.alloc(32, 4));
        const pending = {
            telegramUserId: '100',
            chatId: '200',
            deviceCode: box.lock('device-code'),
            userCode: 'CODE',
            verifyUrl: 'https://login.example/device',
            expiresAt: new Date(60_000),
            pollAfter: new Date(0),
        };
        const complete = vi.fn<LinkStore['complete']>().mockResolvedValue(undefined);
        const store: LinkStore = {
            savePending: vi.fn(),
            claimReady: vi.fn().mockResolvedValue([pending]),
            complete,
            reschedule: vi.fn(),
            removePending: vi.fn(),
            find: vi.fn(),
            saveSession: vi.fn(),
        };
        const auth: AuthClient = {
            start: vi.fn(),
            poll: vi.fn().mockResolvedValue({
                status: 'approved',
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                expiresIn: 300,
            }),
            refresh: vi.fn(),
        };
        const sendText = vi.fn<TelegramClient['sendText']>().mockResolvedValue(undefined);
        const worker = new LinkWorker(auth, store, { sendText }, box, () => new Date(1_000));

        await worker.runOnce();

        const saved = complete.mock.calls[0]?.[1];
        expect(JSON.stringify(saved)).not.toContain('refresh-token');
        expect(box.unlock(saved!)).toBe('refresh-token');
        expect(sendText).toHaveBeenCalledWith('200', 'Аккаунт подключён. Теперь можно отправлять сообщения.');
    });

    it('runOnce_whenApprovalIsPending_shouldScheduleNextPoll', async () => {
        const box = new TokenBox(Buffer.alloc(32, 4));
        const pending = {
            telegramUserId: '100',
            chatId: '200',
            deviceCode: box.lock('device-code'),
            userCode: 'CODE',
            verifyUrl: 'https://login.example/device',
            expiresAt: new Date(60_000),
            pollAfter: new Date(0),
        };
        const reschedule = vi.fn<LinkStore['reschedule']>().mockResolvedValue(undefined);
        const store: LinkStore = {
            savePending: vi.fn(),
            claimReady: vi.fn().mockResolvedValue([pending]),
            complete: vi.fn(),
            reschedule,
            removePending: vi.fn(),
            find: vi.fn(),
            saveSession: vi.fn(),
        };
        const auth: AuthClient = {
            start: vi.fn(),
            poll: vi.fn().mockResolvedValue({ status: 'waiting', waitMore: 5 }),
            refresh: vi.fn(),
        };
        const worker = new LinkWorker(auth, store, { sendText: vi.fn() }, box, () => new Date(1_000));

        await worker.runOnce();

        expect(reschedule).toHaveBeenCalledWith('100', new Date(11_000));
    });

    it.each([
        ['denied', 'Подключение отменено. Запустите /link ещё раз.'],
        ['expired', 'Код подключения истёк. Запустите /link ещё раз.'],
    ] as const)('runOnce_whenLinkIs%s_shouldRemovePendingLink', async (status, text) => {
        const box = new TokenBox(Buffer.alloc(32, 4));
        const pending = {
            telegramUserId: '100',
            chatId: '200',
            deviceCode: box.lock('device-code'),
            userCode: 'CODE',
            verifyUrl: 'https://login.example/device',
            expiresAt: new Date(60_000),
            pollAfter: new Date(0),
        };
        const removePending = vi.fn<LinkStore['removePending']>().mockResolvedValue(undefined);
        const sendText = vi.fn<TelegramClient['sendText']>().mockResolvedValue(undefined);
        const store: LinkStore = {
            savePending: vi.fn(),
            claimReady: vi.fn().mockResolvedValue([pending]),
            complete: vi.fn(),
            reschedule: vi.fn(),
            removePending,
            find: vi.fn(),
            saveSession: vi.fn(),
        };
        const auth: AuthClient = {
            start: vi.fn(),
            poll: vi.fn().mockResolvedValue({ status }),
            refresh: vi.fn(),
        };
        const worker = new LinkWorker(auth, store, { sendText }, box, () => new Date(1_000));

        await worker.runOnce();

        expect(removePending).toHaveBeenCalledWith('100');
        expect(sendText).toHaveBeenCalledWith('200', text);
    });
});
