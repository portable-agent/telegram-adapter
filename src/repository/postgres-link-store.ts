import type { Sql } from 'postgres';
import type { PendingLink } from '../model/link.js';
import type { LinkStore } from './link-store.js';

export class PostgresLinkStore implements LinkStore {
    public constructor(private readonly sql: Sql) {}

    public async savePending(link: PendingLink): Promise<void> {
        await this.sql`
            INSERT INTO telegram_pending_links (
                telegram_user_id,
                chat_id,
                device_code,
                user_code,
                verify_url,
                expires_at,
                poll_after
            ) VALUES (
                ${link.telegramUserId},
                ${link.chatId},
                ${this.sql.json(link.deviceCode)},
                ${link.userCode},
                ${link.verifyUrl},
                ${link.expiresAt},
                ${link.pollAfter}
            )
            ON CONFLICT (telegram_user_id) DO UPDATE SET
                chat_id = EXCLUDED.chat_id,
                device_code = EXCLUDED.device_code,
                user_code = EXCLUDED.user_code,
                verify_url = EXCLUDED.verify_url,
                expires_at = EXCLUDED.expires_at,
                poll_after = EXCLUDED.poll_after,
                updated_at = now()
        `;
    }

    public async claimReady(now: Date, leaseUntil: Date, limit: number): Promise<PendingLink[]> {
        const rows = await this.sql<
            Array<{
                telegram_user_id: string;
                chat_id: string;
                device_code: PendingLink['deviceCode'];
                user_code: string;
                verify_url: string;
                expires_at: Date;
                poll_after: Date;
            }>
        >`
            WITH ready AS (
                SELECT telegram_user_id
                FROM telegram_pending_links
                WHERE poll_after <= ${now} AND expires_at > ${now}
                ORDER BY poll_after
                FOR UPDATE SKIP LOCKED
                LIMIT ${limit}
            )
            UPDATE telegram_pending_links AS links
            SET poll_after = ${leaseUntil}, updated_at = now()
            FROM ready
            WHERE links.telegram_user_id = ready.telegram_user_id
            RETURNING
                links.telegram_user_id,
                links.chat_id,
                links.device_code,
                links.user_code,
                links.verify_url,
                links.expires_at,
                links.poll_after
        `;
        return rows.map((row) => ({
            telegramUserId: row.telegram_user_id,
            chatId: row.chat_id,
            deviceCode: row.device_code,
            userCode: row.user_code,
            verifyUrl: row.verify_url,
            expiresAt: row.expires_at,
            pollAfter: row.poll_after,
        }));
    }

    public async complete(
        telegramUserId: string,
        refreshToken: PendingLink['deviceCode'],
        linkedAt: Date,
    ): Promise<void> {
        await this.sql.begin(async (sql) => {
            await sql`
                INSERT INTO telegram_links (telegram_user_id, chat_id, refresh_token, linked_at)
                SELECT telegram_user_id, chat_id, ${sql.json(refreshToken)}, ${linkedAt}
                FROM telegram_pending_links
                WHERE telegram_user_id = ${telegramUserId}
                ON CONFLICT (telegram_user_id) DO UPDATE SET
                    chat_id = EXCLUDED.chat_id,
                    refresh_token = EXCLUDED.refresh_token,
                    linked_at = EXCLUDED.linked_at,
                    updated_at = now()
            `;
            await sql`DELETE FROM telegram_pending_links WHERE telegram_user_id = ${telegramUserId}`;
        });
    }

    public async reschedule(telegramUserId: string, pollAfter: Date): Promise<void> {
        await this.sql`
            UPDATE telegram_pending_links
            SET poll_after = ${pollAfter}, updated_at = now()
            WHERE telegram_user_id = ${telegramUserId}
        `;
    }

    public async removePending(telegramUserId: string): Promise<void> {
        await this.sql`DELETE FROM telegram_pending_links WHERE telegram_user_id = ${telegramUserId}`;
    }
}
