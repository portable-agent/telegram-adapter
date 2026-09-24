export type Decision = 'CONFIRM' | 'CANCEL';

export type StoredCallback = {
    id: string;
    telegramUserId: string;
    actionId: string;
    payloadHash: string;
    decision: Decision;
    expiresAt: Date;
};
