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
        private readonly now: () => Date = () => new Date(),
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
        return this.render(telegramUserId, result);
    }

    private async render(telegramUserId: string, result: GatewayResult): Promise<LinkReply> {
        switch (result.reply.type) {
            case 'text':
                return { text: result.reply.text };
            case 'connection':
                return {
                    text: `${result.reply.card.title}\n${result.reply.card.text}`,
                    buttons: [
                        {
                            type: 'url',
                            label: result.reply.card.button.label,
                            url: result.reply.card.button.url,
                        },
                    ],
                };
            case 'confirmation':
                return this.renderConfirmation(telegramUserId, result.reply.card);
        }
    }

    private async renderConfirmation(
        telegramUserId: string,
        card: Extract<GatewayResult['reply'], { type: 'confirmation' }>['card'],
    ): Promise<LinkReply> {
        const fields = card.fields.map((field) => `${field.label}: ${field.value}`).join('\n');
        const expiresAt = new Date(this.now().getTime() + 15 * 60 * 1000);
        const callbacks = card.actions.map((action) => ({
            id: randomUUID(),
            telegramUserId,
            actionId: card.actionId,
            payloadHash: card.payloadHash,
            decision: action.id === 'confirm' ? ('CONFIRM' as const) : ('CANCEL' as const),
            expiresAt,
        }));
        await this.store.saveCallbacks(callbacks);
        return {
            text: `${card.title}\n${fields}`,
            buttons: callbacks.map((callback, index) => ({
                type: 'callback' as const,
                id: callback.id,
                label: card.actions[index]!.label,
            })),
        };
    }
}
import { randomUUID } from 'node:crypto';
