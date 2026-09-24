import { z } from 'zod';

export const telegramUpdateSchema = z
    .object({
        update_id: z.number().int(),
        message: z
            .object({
                message_id: z.number().int(),
                from: z.object({ id: z.number().int() }).passthrough(),
                chat: z.object({ id: z.number().int() }).passthrough(),
                text: z.string().min(1),
            })
            .passthrough()
            .optional(),
        callback_query: z
            .object({
                id: z.string().min(1),
                from: z.object({ id: z.number().int() }).passthrough(),
                data: z.uuid(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
