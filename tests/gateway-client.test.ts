import { describe, expect, it, vi } from 'vitest';
import { HttpGatewayClient } from '../src/client/gateway-client.js';

describe('HttpGatewayClient', () => {
    it('send_whenGatewayReturnsText_shouldReturnReply', async () => {
        const result = {
            messageId: '10000000-0000-4000-8000-000000000001',
            conversationId: '10000000-0000-4000-8000-000000000002',
            reply: { type: 'text', text: 'Когда начать?' },
        };
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
        const client = new HttpGatewayClient('http://gateway', 1000, request);

        await expect(
            client.send(
                {
                    requestKey: 'telegram:42',
                    text: 'Создай встречу',
                    context: { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
                },
                'access-token',
            ),
        ).resolves.toEqual(result);
        expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer access-token' });
    });

    it('send_whenGatewayFails_shouldHideResponse', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('private error', { status: 502 }));
        const client = new HttpGatewayClient('http://gateway', 1000, request);

        await expect(
            client.send(
                {
                    requestKey: 'telegram:42',
                    text: 'Создай встречу',
                    context: { locale: 'ru-RU', timeZone: 'Europe/Moscow' },
                },
                'access-token',
            ),
        ).rejects.toThrow('Channel Gateway is unavailable.');
    });

    it('decide_whenGatewayAcceptsDecision_shouldReturnActionStatus', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ status: 'APPROVED' }));
        const client = new HttpGatewayClient('http://gateway', 1000, request);

        await expect(
            client.decide(
                '10000000-0000-4000-8000-000000000003',
                { decision: 'CONFIRM', payloadHash: 'a'.repeat(64) },
                'access-token',
            ),
        ).resolves.toEqual({ status: 'APPROVED' });
        expect(request.mock.calls[0]?.[0]).toBe(
            'http://gateway/api/v1/actions/10000000-0000-4000-8000-000000000003/decisions',
        );
    });

    it('decide_whenGatewayRejectsRequest_shouldHideResponse', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('private error', { status: 409 }));
        const client = new HttpGatewayClient('http://gateway', 1000, request);

        await expect(
            client.decide(
                '10000000-0000-4000-8000-000000000003',
                { decision: 'CANCEL', payloadHash: 'a'.repeat(64) },
                'access-token',
            ),
        ).rejects.toThrow('Channel Gateway decision failed.');
    });
});
