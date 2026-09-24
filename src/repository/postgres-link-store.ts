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
                ${link.deviceCode}::jsonb,
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
}
