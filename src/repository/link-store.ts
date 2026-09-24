import type { PendingLink, SavedLink } from '../model/link.js';

export interface LinkStore {
    savePending(link: PendingLink): Promise<void>;
    claimReady(now: Date, leaseUntil: Date, limit: number): Promise<PendingLink[]>;
    complete(telegramUserId: string, link: SavedLink['refreshToken'], linkedAt: Date): Promise<void>;
    reschedule(telegramUserId: string, pollAfter: Date): Promise<void>;
    removePending(telegramUserId: string): Promise<void>;
}
