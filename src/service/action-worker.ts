import type { AuthClient } from '../client/auth-client.js';
import type { StatusClient } from '../client/gateway-client.js';
import type { TelegramClient } from '../client/telegram-client.js';
import type { ActionStatusView } from '../model/gateway.js';
import type { ActionCheck, ActionCheckStore } from '../repository/action-check-store.js';
import type { LinkStore } from '../repository/link-store.js';
import type { TokenBox } from '../security/token-box.js';

const terminalText: Partial<Record<ActionStatusView['status'], (title: string) => string>> = {
    SUCCEEDED: (title) => `Готово: ${title}`,
    FAILED: (title) => `Не удалось выполнить: ${title}`,
    CANCELLED: (title) => `Отменено: ${title}`,
};

export class ActionWorker {
    public constructor(
        private readonly auth: AuthClient,
        private readonly gateway: StatusClient,
        private readonly links: LinkStore,
        private readonly checks: ActionCheckStore,
        private readonly telegram: TelegramClient,
        private readonly tokenBox: TokenBox,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async runOnce(): Promise<void> {
        const now = this.now();
        const ready = await this.checks.claimReady(now, new Date(now.getTime() + 30_000), 20);
        await Promise.all(ready.map(async (check) => this.poll(check)));
    }

    private async poll(check: ActionCheck): Promise<void> {
        try {
            const user = await this.links.find(check.telegramUserId);
            if (!user) {
                await this.checks.finish(check.actionId);
                return;
            }
            const token = await this.auth.refresh(this.tokenBox.unlock(user.refreshToken));
            await this.links.saveSession(
                check.telegramUserId,
                this.tokenBox.lock(token.refreshToken),
                user.conversationId,
            );
            const status = await this.gateway.getStatus(check.actionId, token.accessToken);
            const message = terminalText[status.status]?.(status.title);
            if (!message) {
                await this.checks.reschedule(check.actionId, new Date(this.now().getTime() + 3_000));
                return;
            }
            await this.telegram.sendText(check.chatId, message);
            await this.checks.finish(check.actionId);
        } catch {
            await this.checks.reschedule(check.actionId, new Date(this.now().getTime() + 5_000));
        }
    }
}
