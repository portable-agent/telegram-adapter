export type GatewayMessage = {
    requestKey: string;
    text: string;
    context: {
        locale: string;
        timeZone: string;
    };
    conversationId?: string;
};

export type Card = {
    title: string;
    fields: Array<{ label: string; value: string; sensitive?: boolean | undefined }>;
};

export type GatewayResult = {
    messageId: string;
    conversationId: string;
    reply: { type: 'text'; text: string } | { type: 'confirmation'; card: Card };
};
