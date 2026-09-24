import type { AuthClient } from '../client/auth-client.js';
import type { GatewayClient } from '../client/gateway-client.js';
import type { GatewayMessage, GatewayResult } from '../model/gateway.js';
import type { LinkReply } from '../model/link.js';
import type { LinkStore } from '../repository/link-store.js';
import type { TokenBox } from '../security/token-box.js';

export interface MessageHandler {
    create(telegramUserId: string, updateId: string, text: string): Promise<LinkReply>;
}

export class MessageService implements MessageHandler {
    public constructor(
        private readonly auth: AuthClient,
        private readonly gateway: GatewayClient,
        private readonly store: LinkStore,
        private readonly tokenBox: TokenBox,
        private readonly locale: string,
        private readonly timeZone: string,
    ) {}

    public async create(telegramUserId: string, updateId: string, text: string): Promise<LinkReply> {
        const user = await this.store.find(telegramUserId);
        if (!user) {
            return { text: 'Сначала подключите аккаунт командой /link.' };
        }
        const token = await this.auth.refresh(this.tokenBox.unlock(user.refreshToken));
        const message: GatewayMessage = {
            requestKey: `telegram:${updateId}`,
            text,
            context: { locale: this.locale, timeZone: this.timeZone },
            ...(user.conversationId ? { conversationId: user.conversationId } : {}),
        };
        const result = await this.gateway.send(message, token.accessToken);
        await this.store.saveSession(telegramUserId, this.tokenBox.lock(token.refreshToken), result.conversationId);
        return { text: this.render(result) };
    }

    private render(result: GatewayResult): string {
        if (result.reply.type === 'text') {
            return result.reply.text;
        }
        const fields = result.reply.card.fields.map((field) => `${field.label}: ${field.value}`).join('\n');
        return `${result.reply.card.title}\n${fields}`;
    }
}
