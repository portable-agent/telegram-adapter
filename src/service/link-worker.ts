import type { AuthClient, LinkPoll } from '../client/auth-client.js';
import type { TelegramClient } from '../client/telegram-client.js';
import type { PendingLink } from '../model/link.js';
import type { LinkStore } from '../repository/link-store.js';
import type { TokenBox } from '../security/token-box.js';

export class LinkWorker {
    public constructor(
        private readonly auth: AuthClient,
        private readonly store: LinkStore,
        private readonly telegram: TelegramClient,
        private readonly tokenBox: TokenBox,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async runOnce(): Promise<void> {
        const now = this.now();
        const links = await this.store.claimReady(now, new Date(now.getTime() + 30_000), 20);
        await Promise.all(links.map(async (link) => this.poll(link)));
    }

    private async poll(link: PendingLink): Promise<void> {
        const result = await this.auth.poll(this.tokenBox.unlock(link.deviceCode));
        const handlers: Record<LinkPoll['status'], (value: LinkPoll) => Promise<void>> = {
            approved: async (value) => {
                const approved = value as Extract<LinkPoll, { status: 'approved' }>;
                await this.store.complete(link.telegramUserId, this.tokenBox.lock(approved.refreshToken), this.now());
                await this.telegram.sendText(link.chatId, 'Аккаунт подключён. Теперь можно отправлять сообщения.');
            },
            waiting: async (value) => {
                const waiting = value as Extract<LinkPoll, { status: 'waiting' }>;
                await this.store.reschedule(
                    link.telegramUserId,
                    new Date(this.now().getTime() + (5 + waiting.waitMore) * 1000),
                );
            },
            denied: async () => {
                await this.store.removePending(link.telegramUserId);
                await this.telegram.sendText(link.chatId, 'Подключение отменено. Запустите /link ещё раз.');
            },
            expired: async () => {
                await this.store.removePending(link.telegramUserId);
                await this.telegram.sendText(link.chatId, 'Код подключения истёк. Запустите /link ещё раз.');
            },
        };
        await handlers[result.status](result);
    }
}
