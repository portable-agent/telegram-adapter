import type { AuthClient } from '../client/auth-client.js';
import type { GatewayClient } from '../client/gateway-client.js';
import type { LinkReply } from '../model/link.js';
import type { LinkStore } from '../repository/link-store.js';
import type { TokenBox } from '../security/token-box.js';

export interface DecisionHandler {
    decide(telegramUserId: string, callbackId: string): Promise<LinkReply>;
}

export class DecisionService implements DecisionHandler {
    public constructor(
        private readonly auth: AuthClient,
        private readonly gateway: GatewayClient,
        private readonly store: LinkStore,
        private readonly tokenBox: TokenBox,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async decide(telegramUserId: string, callbackId: string): Promise<LinkReply> {
        const startedAt = this.now();
        const callback = await this.store.claimCallback(
            callbackId,
            telegramUserId,
            startedAt,
            new Date(startedAt.getTime() + 30_000),
        );
        if (!callback) {
            return { text: 'Кнопка больше не действует.' };
        }
        const user = await this.store.find(telegramUserId);
        if (!user) {
            await this.store.completeCallback(callbackId, telegramUserId, this.now());
            return { text: 'Подключите аккаунт командой /link.' };
        }
        try {
            const token = await this.auth.refresh(this.tokenBox.unlock(user.refreshToken));
            await this.gateway.decide(
                callback.actionId,
                { decision: callback.decision, payloadHash: callback.payloadHash },
                token.accessToken,
            );
            await this.store.saveSession(telegramUserId, this.tokenBox.lock(token.refreshToken), user.conversationId);
            await this.store.completeCallback(callbackId, telegramUserId, this.now());
            return { text: 'Решение принято.' };
        } catch (error) {
            await this.store.releaseCallback(callbackId, telegramUserId);
            throw error;
        }
    }
}
