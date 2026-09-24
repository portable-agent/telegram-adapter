import { readFile } from 'node:fs/promises';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresLinkStore } from '../src/repository/postgres-link-store.js';
import { TokenBox, type LockedToken } from '../src/security/token-box.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL is required.');
}

describe('PostgresLinkStore', () => {
    let sql: Sql;

    beforeAll(async () => {
        sql = postgres(databaseUrl, { max: 2 });
        const migration = await readFile(new URL('../migrations/001_init.sql', import.meta.url), 'utf8');
        await sql.unsafe(migration);
        await sql`TRUNCATE telegram_callbacks, telegram_links, telegram_pending_links`;
    });

    afterAll(async () => {
        await sql.end();
    });

    it('complete_whenLinkWasClaimed_shouldMoveEncryptedToken', async () => {
        const box = new TokenBox(Buffer.alloc(32, 6));
        const store = new PostgresLinkStore(sql);
        await store.savePending({
            telegramUserId: '100',
            chatId: '200',
            deviceCode: box.lock('device-code'),
            userCode: 'CODE',
            verifyUrl: 'https://login.example/device',
            expiresAt: new Date(Date.now() + 60_000),
            pollAfter: new Date(0),
        });

        const claimed = await store.claimReady(new Date(), new Date(Date.now() + 30_000), 10);
        expect(claimed).toHaveLength(1);
        expect(box.unlock(claimed[0]!.deviceCode)).toBe('device-code');

        const refreshToken = box.lock('refresh-token');
        await store.complete('100', refreshToken, new Date());
        const user = await store.find('100');
        expect(box.unlock(user!.refreshToken)).toBe('refresh-token');

        const conversationId = '10000000-0000-4000-8000-000000000002';
        await store.saveSession('100', box.lock('rotated-refresh'), conversationId);

        const pending = await sql<Array<{ count: number }>>`SELECT count(*)::int AS count FROM telegram_pending_links`;
        const saved = await sql<Array<{ refresh_token: LockedToken }>>`
            SELECT refresh_token FROM telegram_links WHERE telegram_user_id = 100
        `;
        expect(pending[0]?.count).toBe(0);
        expect(saved).toHaveLength(1);
        expect(box.unlock(saved[0]!.refresh_token)).toBe('rotated-refresh');
        await expect(store.find('404')).resolves.toBeNull();

        const callbackId = '10000000-0000-4000-8000-000000000004';
        const callback = {
            id: callbackId,
            telegramUserId: '100',
            actionId: '10000000-0000-4000-8000-000000000003',
            payloadHash: 'a'.repeat(64),
            decision: 'CONFIRM' as const,
            expiresAt: new Date(Date.now() + 60_000),
        };
        await store.saveCallbacks([callback]);

        const now = new Date();
        const leaseUntil = new Date(now.getTime() + 30_000);
        await expect(store.claimCallback(callbackId, '100', now, leaseUntil)).resolves.toMatchObject(callback);
        await expect(store.claimCallback(callbackId, '100', now, leaseUntil)).resolves.toBeNull();

        await store.releaseCallback(callbackId, '100');
        await expect(store.claimCallback(callbackId, '100', now, leaseUntil)).resolves.toMatchObject(callback);

        await store.completeCallback(callbackId, '100', new Date());
        await expect(store.claimCallback(callbackId, '100', now, leaseUntil)).resolves.toBeNull();
    });
});
