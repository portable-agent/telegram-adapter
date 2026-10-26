import type { Sql } from 'postgres';
import type { ActionCheck, ActionCheckStore } from './action-check-store.js';

export class PostgresActionCheckStore implements ActionCheckStore {
    public constructor(private readonly sql: Sql) {}

    public async watch(check: ActionCheck, nextCheck: Date): Promise<void> {
        await this.sql`
            INSERT INTO telegram_action_checks (action_id, telegram_user_id, chat_id, check_after)
            VALUES (${check.actionId}, ${check.telegramUserId}, ${check.chatId}, ${nextCheck})
            ON CONFLICT (action_id) DO NOTHING
        `;
    }

    public async claimReady(now: Date, leaseUntil: Date, limit: number): Promise<ActionCheck[]> {
        const rows = await this.sql<Array<{ action_id: string; telegram_user_id: string; chat_id: string }>>`
            WITH ready AS (
                SELECT action_id
                FROM telegram_action_checks
                WHERE check_after <= ${now}
                ORDER BY check_after
                FOR UPDATE SKIP LOCKED
                LIMIT ${limit}
            )
            UPDATE telegram_action_checks AS checks
            SET check_after = ${leaseUntil}
            FROM ready
            WHERE checks.action_id = ready.action_id
            RETURNING checks.action_id, checks.telegram_user_id, checks.chat_id
        `;
        return rows.map((row) => ({
            actionId: row.action_id,
            telegramUserId: row.telegram_user_id,
            chatId: row.chat_id,
        }));
    }

    public async reschedule(actionId: string, nextCheck: Date): Promise<void> {
        await this.sql`
            UPDATE telegram_action_checks
            SET check_after = ${nextCheck}
            WHERE action_id = ${actionId}
        `;
    }

    public async finish(actionId: string): Promise<void> {
        await this.sql`DELETE FROM telegram_action_checks WHERE action_id = ${actionId}`;
    }
}
