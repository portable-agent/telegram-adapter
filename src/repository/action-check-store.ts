export type ActionCheck = {
    actionId: string;
    telegramUserId: string;
    chatId: string;
};

export interface ActionCheckStore {
    watch(check: ActionCheck, nextCheck: Date): Promise<void>;
    claimReady(now: Date, leaseUntil: Date, limit: number): Promise<ActionCheck[]>;
    reschedule(actionId: string, nextCheck: Date): Promise<void>;
    finish(actionId: string): Promise<void>;
}
