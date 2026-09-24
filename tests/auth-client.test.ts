import { describe, expect, it, vi } from 'vitest';
import { KeycloakAuthClient } from '../src/client/auth-client.js';

describe('KeycloakAuthClient', () => {
    it('start_whenKeycloakReturnsDeviceCode_shouldMapResponse', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(
                JSON.stringify({
                    device_code: 'device-code',
                    user_code: 'USER-CODE',
                    verification_uri: 'https://login.example/device',
                    verification_uri_complete: 'https://login.example/device?user_code=USER-CODE',
                    expires_in: 600,
                    interval: 5,
                }),
                { status: 200, headers: { 'content-type': 'application/json' } },
            ),
        );
        const client = new KeycloakAuthClient('https://login.example/auth/device', 'telegram', 'secret', request);

        const result = await client.start();

        expect(result).toEqual({
            deviceCode: 'device-code',
            userCode: 'USER-CODE',
            verifyUrl: 'https://login.example/device?user_code=USER-CODE',
            expiresIn: 600,
            interval: 5,
        });
        const body = request.mock.calls[0]?.[1]?.body as URLSearchParams;
        expect(body.get('client_secret')).toBe('secret');
    });

    it('start_whenKeycloakFails_shouldHideRemoteResponse', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('private error', { status: 503 }));
        const client = new KeycloakAuthClient('https://login.example/auth/device', 'telegram', 'secret', request);

        await expect(client.start()).rejects.toThrow('Keycloak device flow is unavailable.');
    });

    it('start_whenCompleteUrlIsMissing_shouldUseVerifyUrlAndDefaultInterval', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(
            Response.json({
                device_code: 'device-code',
                user_code: 'USER-CODE',
                verification_uri: 'https://login.example/device',
                expires_in: 600,
            }),
        );
        const client = new KeycloakAuthClient('https://login.example/auth/device', 'telegram', 'secret', request);

        const result = await client.start();

        expect(result.verifyUrl).toBe('https://login.example/device');
        expect(result.interval).toBe(5);
    });
});
