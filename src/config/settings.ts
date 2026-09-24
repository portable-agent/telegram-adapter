import { z } from 'zod';

const envSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
    HOST: z.string().min(1).default('0.0.0.0'),
    TELEGRAM_BOT_TOKEN: z.string().min(20),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(32),
    KEYCLOAK_URL: z.url().transform((url) => url.replace(/\/$/, '')),
    KEYCLOAK_REALM: z.string().min(1),
    KEYCLOAK_CLIENT_ID: z.string().min(1),
    KEYCLOAK_CLIENT_SECRET: z.string().min(16),
    LINK_POLL_MS: z.coerce.number().int().min(500).max(60_000).default(1000),
    DATABASE_URL: z.url(),
    TOKEN_KEY_BASE64: z.string().transform((value, context) => {
        const key = Buffer.from(value, 'base64');
        if (key.length !== 32) {
            context.addIssue({ code: 'custom', message: 'TOKEN_KEY_BASE64 должен содержать 32 байта.' });
            return z.NEVER;
        }
        return key;
    }),
});

export type Settings = {
    port: number;
    host: string;
    telegramToken: string;
    webhookSecret: string;
    deviceUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    tokenKey: Buffer;
    databaseUrl: string;
    linkPollMs: number;
};

export const readSettings = (env: NodeJS.ProcessEnv): Settings => {
    const value = envSchema.parse(env);
    return {
        port: value.PORT,
        host: value.HOST,
        telegramToken: value.TELEGRAM_BOT_TOKEN,
        webhookSecret: value.TELEGRAM_WEBHOOK_SECRET,
        deviceUrl: `${value.KEYCLOAK_URL}/realms/${value.KEYCLOAK_REALM}/protocol/openid-connect/auth/device`,
        tokenUrl: `${value.KEYCLOAK_URL}/realms/${value.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        clientId: value.KEYCLOAK_CLIENT_ID,
        clientSecret: value.KEYCLOAK_CLIENT_SECRET,
        tokenKey: value.TOKEN_KEY_BASE64,
        databaseUrl: value.DATABASE_URL,
        linkPollMs: value.LINK_POLL_MS,
    };
};
