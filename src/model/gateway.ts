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
    actionId: string;
    payloadHash: string;
    title: string;
    fields: Array<{ label: string; value: string; sensitive?: boolean | undefined }>;
    actions: Array<{ id: 'confirm' | 'cancel'; label: string }>;
};

export type ActionResult = { status: string };

export type GatewayResult = {
    messageId: string;
    conversationId: string;
    reply: { type: 'text'; text: string } | { type: 'confirmation'; card: Card };
};
