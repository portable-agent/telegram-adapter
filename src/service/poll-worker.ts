import type { TelegramPollClient, TelegramPollUpdate } from '../client/telegram-client.js';

export class PollWorker {
    private offset: number | undefined;
    private started = false;

    public constructor(
        private readonly telegram: TelegramPollClient,
        private readonly handle: (update: TelegramPollUpdate) => Promise<void>,
    ) {}

    public async pollOnce(signal?: AbortSignal): Promise<void> {
        if (!this.started) {
            await this.telegram.deleteWebhook();
            this.started = true;
        }
        const updates = await this.telegram.getUpdates(this.offset, signal);
        for (const update of updates) {
            await this.handle(update);
            this.offset = update.update_id + 1;
        }
    }

    public async run(signal: AbortSignal): Promise<void> {
        while (!signal.aborted) {
            try {
                await this.pollOnce(signal);
            } catch {
                if (signal.aborted) return;
                console.error('Telegram polling failed; retrying.');
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }
}
