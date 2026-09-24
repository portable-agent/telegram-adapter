import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { KeycloakAuthClient } from './client/auth-client.js';
import { HttpTelegramClient } from './client/telegram-client.js';
import { HttpGatewayClient } from './client/gateway-client.js';
import { readSettings } from './config/settings.js';
import { createApp } from './controller/app.js';
import { PostgresLinkStore } from './repository/postgres-link-store.js';
import { TokenBox } from './security/token-box.js';
import { LinkService } from './service/link-service.js';
import { LinkWorker } from './service/link-worker.js';
import { MessageService } from './service/message-service.js';

const settings = readSettings(process.env);
const sql = postgres(settings.databaseUrl, { max: 5 });
const migration = await readFile(new URL('../migrations/001_init.sql', import.meta.url), 'utf8');
await sql.unsafe(migration);

const auth = new KeycloakAuthClient(settings.deviceUrl, settings.tokenUrl, settings.clientId, settings.clientSecret);
const telegram = new HttpTelegramClient(`https://api.telegram.org/bot${settings.telegramToken}`);
const store = new PostgresLinkStore(sql);
const links = new LinkService(auth, store, new TokenBox(settings.tokenKey));
const worker = new LinkWorker(auth, store, telegram, new TokenBox(settings.tokenKey));
const gateway = new HttpGatewayClient(settings.gatewayUrl, settings.gatewayTimeoutMs);
const messages = new MessageService(
    auth,
    gateway,
    store,
    new TokenBox(settings.tokenKey),
    settings.locale,
    settings.timeZone,
);
const app = createApp({ webhookSecret: settings.webhookSecret, links, telegram, messages });

let stopping = false;
const runWorker = async (): Promise<void> => {
    while (!stopping) {
        try {
            await worker.runOnce();
        } catch {
            console.error('Link worker failed.');
        }
        await new Promise((resolve) => setTimeout(resolve, settings.linkPollMs));
    }
};

const close = async (): Promise<void> => {
    stopping = true;
    await app.close();
    await sql.end();
};

process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());

await app.listen({ port: settings.port, host: settings.host });
void runWorker();
