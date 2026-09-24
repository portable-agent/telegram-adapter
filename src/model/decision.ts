import type { DecisionCommand } from './gateway.js';

export type Decision = DecisionCommand['decision'];

export type StoredCallback = {
    id: string;
    telegramUserId: string;
    actionId: string;
    payloadHash: string;
    decision: Decision;
    expiresAt: Date;
};
