import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { KeycloakAuthClient } from './client/auth-client.js';
import { HttpTelegramClient } from './client/telegram-client.js';
import { HttpGatewayClient } from './client/gateway-client.js';
import { readSettings } from './config/settings.js';
import { createApp } from './controller/app.js';
import { PostgresLinkStore } from './repository/postgres-link-store.js';
import { PostgresActionCheckStore } from './repository/postgres-action-check-store.js';
import { TokenBox } from './security/token-box.js';
import { LinkService } from './service/link-service.js';
import { LinkWorker } from './service/link-worker.js';
import { MessageService } from './service/message-service.js';
import { DecisionService } from './service/decision-service.js';
import { ActionWorker } from './service/action-worker.js';

const settings = readSettings(process.env);
const sql = postgres(settings.databaseUrl, { max: 5 });
const migration = await readFile(new URL('../migrations/001_init.sql', import.meta.url), 'utf8');
await sql.unsafe(migration);
const actionMigration = await readFile(new URL('../migrations/002_action_checks.sql', import.meta.url), 'utf8');
await sql.unsafe(actionMigration);

const auth = new KeycloakAuthClient(settings.deviceUrl, settings.tokenUrl, settings.clientId, settings.clientSecret);
const telegram = new HttpTelegramClient(settings.telegramUrl);
const store = new PostgresLinkStore(sql);
const checks = new PostgresActionCheckStore(sql);
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
const decisions = new DecisionService(auth, gateway, store, checks, new TokenBox(settings.tokenKey));
const actionWorker = new ActionWorker(auth, gateway, store, checks, telegram, new TokenBox(settings.tokenKey));
const app = createApp({ webhookSecret: settings.webhookSecret, links, telegram, messages, decisions });

let stopping = false;
const runWorker = async (run: () => Promise<void>, name: string, waitMs: number): Promise<void> => {
    while (!stopping) {
        try {
            await run();
        } catch {
            console.error(`${name} worker failed.`);
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
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
void runWorker(() => worker.runOnce(), 'Link', settings.linkPollMs);
void runWorker(() => actionWorker.runOnce(), 'Action', settings.actionPollMs);
