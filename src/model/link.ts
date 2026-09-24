import type { LockedToken } from '../security/token-box.js';

export type StartLink = {
    deviceCode: string;
    userCode: string;
    verifyUrl: string;
    expiresIn: number;
    interval: number;
};

export type SavedLink = {
    telegramUserId: string;
    chatId: string;
    refreshToken: LockedToken;
    linkedAt: Date;
};

export type PendingLink = {
    telegramUserId: string;
    chatId: string;
    deviceCode: LockedToken;
    userCode: string;
    verifyUrl: string;
    expiresAt: Date;
    pollAfter: Date;
};

export type LinkReply = {
    text: string;
};
