import { z } from 'zod';

export const telegramUpdateSchema = z
    .object({
        update_id: z.number().int(),
        message: z
            .object({
                message_id: z.number().int(),
                from: z.object({ id: z.number().int() }).strict(),
                chat: z.object({ id: z.number().int() }).strict(),
                text: z.string().min(1),
            })
            .strict(),
    })
    .strict();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
