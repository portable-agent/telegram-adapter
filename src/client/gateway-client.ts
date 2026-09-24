import { z } from 'zod';
import type { ActionResult, DecisionCommand, GatewayMessage, GatewayResult } from '../model/gateway.js';

export interface GatewayClient {
    send(message: GatewayMessage, accessToken: string): Promise<GatewayResult>;
    decide(actionId: string, command: DecisionCommand, accessToken: string): Promise<ActionResult>;
}

type Fetch = typeof fetch;

const resultSchema = z
    .object({
        messageId: z.uuid(),
        conversationId: z.uuid(),
        reply: z.discriminatedUnion('type', [
            z.object({ type: z.literal('text'), text: z.string().min(1) }).strict(),
            z
                .object({
                    type: z.literal('confirmation'),
                    card: z
                        .object({
                            schemaVersion: z.literal(1),
                            widget: z.literal('action_confirmation'),
                            actionId: z.uuid(),
                            payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
                            title: z.string().min(1),
                            fields: z.array(
                                z
                                    .object({
                                        label: z.string().min(1),
                                        value: z.string().min(1),
                                        sensitive: z.boolean().default(false),
                                    })
                                    .strict(),
                            ),
                            actions: z.array(
                                z.object({ id: z.enum(['confirm', 'cancel']), label: z.string().min(1) }).strict(),
                            ),
                        })
                        .strict(),
                })
                .strict(),
        ]),
    })
    .strict();

export class HttpGatewayClient implements GatewayClient {
    public constructor(
        private readonly url: string,
        private readonly timeoutMs: number,
        private readonly request: Fetch = fetch,
    ) {}

    public async send(message: GatewayMessage, accessToken: string): Promise<GatewayResult> {
        const response = await this.request(`${this.url}/api/v1/conversations/messages`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(message),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
            throw new Error('Channel Gateway is unavailable.');
        }
        return resultSchema.parse(await response.json());
    }

    public async decide(actionId: string, command: DecisionCommand, accessToken: string): Promise<ActionResult> {
        const response = await this.request(`${this.url}/api/v1/actions/${actionId}/decisions`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(command),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
            throw new Error('Channel Gateway decision failed.');
        }
        return z
            .object({
                status: z.enum([
                    'PROPOSED',
                    'AWAITING_APPROVAL',
                    'APPROVED',
                    'EXECUTING',
                    'SUCCEEDED',
                    'FAILED',
                    'CANCELLED',
                ]),
            })
            .passthrough()
            .parse(await response.json());
    }
}
