export type StartLink = {
    deviceCode: string;
    userCode: string;
    verifyUrl: string;
    expiresIn: number;
    interval: number;
};

export type PendingLink = {
    telegramUserId: string;
    chatId: string;
    deviceCode: string;
    userCode: string;
    verifyUrl: string;
    expiresAt: Date;
    pollAfter: Date;
};

export type LinkReply = {
    text: string;
};
