import type { AuthClient } from '../client/auth-client.js';
import type { LinkReply } from '../model/link.js';
import type { LinkStore } from '../repository/link-store.js';
import type { TokenBox } from '../security/token-box.js';

export interface LinkHandler {
    start(telegramUserId: string, chatId: string): Promise<LinkReply>;
}

export class LinkService implements LinkHandler {
    public constructor(
        private readonly auth: AuthClient,
        private readonly store: LinkStore,
        private readonly tokenBox: TokenBox,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async start(telegramUserId: string, chatId: string): Promise<LinkReply> {
        const link = await this.auth.start();
        const createdAt = this.now();
        const deviceCode = this.tokenBox.lock(link.deviceCode);
        await this.store.savePending({
            telegramUserId,
            chatId,
            deviceCode,
            userCode: link.userCode,
            verifyUrl: link.verifyUrl,
            expiresAt: new Date(createdAt.getTime() + link.expiresIn * 1000),
            pollAfter: new Date(createdAt.getTime() + link.interval * 1000),
        });
        return {
            text: `Откройте ${link.verifyUrl}. Если код не подставился автоматически, введите ${link.userCode}.`,
        };
    }
}
