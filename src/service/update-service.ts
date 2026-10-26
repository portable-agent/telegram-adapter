import type { TelegramClient } from '../client/telegram-client.js';
import type { TelegramUpdate } from '../model/telegram.js';
import type { DecisionHandler } from './decision-service.js';
import type { LinkHandler } from './link-service.js';
import type { MessageHandler } from './message-service.js';

export type UpdateParts = {
    links: LinkHandler;
    telegram: TelegramClient;
    messages: MessageHandler;
    decisions: DecisionHandler;
};

const START_TEXT = 'Portable Agent готов. Подключите аккаунт командой /link, затем опишите задачу.';

export const handleUpdate = async (update: TelegramUpdate, parts: UpdateParts): Promise<void> => {
    const callback = update.callback_query;
    if (callback) {
        const result = await parts.decisions.decide(String(callback.from.id), callback.data);
        await parts.telegram.answerCallback(callback.id, result.text);
        return;
    }
    const message = update.message;
    if (!message) return;

    const command = message.text.trim();
    if (command === '/start') {
        await parts.telegram.sendText(String(message.chat.id), START_TEXT);
        return;
    }
    if (command === '/link') {
        const result = await parts.links.start(String(message.from.id), String(message.chat.id));
        await parts.telegram.sendText(String(message.chat.id), result.text);
        return;
    }

    const result = await parts.messages.create(String(message.from.id), String(update.update_id), message.text);
    if (result.buttons) {
        await parts.telegram.sendButtons(String(message.chat.id), result);
    } else {
        await parts.telegram.sendText(String(message.chat.id), result.text);
    }
};
