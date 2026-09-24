import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from '../src/client/auth-client.js';
import type { PendingLink } from '../src/model/link.js';
import type { LinkStore } from '../src/repository/link-store.js';
import { TokenBox } from '../src/security/token-box.js';
import { LinkService } from '../src/service/link-service.js';

describe('LinkService', () => {
    it('start_whenDeviceFlowStarts_shouldSaveEncryptedCode', async () => {
        const auth: AuthClient = {
            start: vi.fn().mockResolvedValue({
                deviceCode: 'device-secret',
                userCode: 'ABCD-EFGH',
                verifyUrl: 'https://login.example/device',
                expiresIn: 600,
                interval: 5,
            }),
            poll: vi.fn(),
            refresh: vi.fn(),
        };
        const savePending = vi.fn<LinkStore['savePending']>().mockResolvedValue(undefined);
        const store: LinkStore = {
            savePending,
            claimReady: vi.fn(),
            complete: vi.fn(),
            reschedule: vi.fn(),
            removePending: vi.fn(),
            find: vi.fn(),
            saveSession: vi.fn(),
        };
        const service = new LinkService(auth, store, new TokenBox(Buffer.alloc(32, 3)), () => new Date(0));

        const result = await service.start('100', '200');

        expect(result.text).toContain('ABCD-EFGH');
        expect(savePending).toHaveBeenCalledOnce();
        const saved = savePending.mock.calls[0]?.[0] as PendingLink;
        expect(saved).toMatchObject({
            telegramUserId: '100',
            chatId: '200',
            userCode: 'ABCD-EFGH',
            expiresAt: new Date(600_000),
            pollAfter: new Date(5_000),
        });
        expect(saved.deviceCode).not.toContain('device-secret');
    });

    it('start_whenClockIsNotGiven_shouldUseCurrentTime', async () => {
        const auth: AuthClient = {
            start: vi.fn().mockResolvedValue({
                deviceCode: 'device-secret',
                userCode: 'CODE',
                verifyUrl: 'https://login.example/device',
                expiresIn: 600,
                interval: 5,
            }),
            poll: vi.fn(),
            refresh: vi.fn(),
        };
        const savePending = vi.fn<LinkStore['savePending']>().mockResolvedValue(undefined);
        const before = Date.now();
        const service = new LinkService(
            auth,
            {
                savePending,
                claimReady: vi.fn(),
                complete: vi.fn(),
                reschedule: vi.fn(),
                removePending: vi.fn(),
                find: vi.fn(),
                saveSession: vi.fn(),
            },
            new TokenBox(Buffer.alloc(32, 3)),
        );

        await service.start('100', '200');

        const saved = savePending.mock.calls[0]?.[0] as PendingLink;
        expect(saved.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 600_000);
    });
});
