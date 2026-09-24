import type { LinkedUser, PendingLink, SavedLink } from '../model/link.js';

export interface LinkStore {
    savePending(link: PendingLink): Promise<void>;
    claimReady(now: Date, leaseUntil: Date, limit: number): Promise<PendingLink[]>;
    complete(telegramUserId: string, link: SavedLink['refreshToken'], linkedAt: Date): Promise<void>;
    reschedule(telegramUserId: string, pollAfter: Date): Promise<void>;
    removePending(telegramUserId: string): Promise<void>;
    find(telegramUserId: string): Promise<LinkedUser | null>;
    saveSession(
        telegramUserId: string,
        refreshToken: SavedLink['refreshToken'],
        conversationId: string | null,
    ): Promise<void>;
    saveCallbacks(callbacks: StoredCallback[]): Promise<void>;
    claimCallback(id: string, telegramUserId: string, now: Date, leaseUntil: Date): Promise<StoredCallback | null>;
    completeCallback(id: string, telegramUserId: string, usedAt: Date): Promise<void>;
    releaseCallback(id: string, telegramUserId: string): Promise<void>;
}
import type { StoredCallback } from '../model/decision.js';
