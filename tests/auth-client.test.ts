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
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

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
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

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
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

        const result = await client.start();

        expect(result.verifyUrl).toBe('https://login.example/device');
        expect(result.interval).toBe(5);
    });

    it('poll_whenUserApproved_shouldReturnTokens', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 300 }));
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

        await expect(client.poll('device')).resolves.toEqual({
            status: 'approved',
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresIn: 300,
        });
    });

    it('poll_whenUserHasNotApproved_shouldReturnWaiting', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(Response.json({ error: 'authorization_pending' }, { status: 400 }));
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

        await expect(client.poll('device')).resolves.toEqual({ status: 'waiting', waitMore: 0 });
    });

    it.each([
        ['slow_down', { status: 'waiting', waitMore: 5 }],
        ['access_denied', { status: 'denied' }],
        ['expired_token', { status: 'expired' }],
    ])('poll_whenKeycloakReturns%s_shouldMapStatus', async (error, expected) => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error }, { status: 400 }));
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

        await expect(client.poll('device')).resolves.toEqual(expected);
    });

    it('poll_whenKeycloakReturnsUnknownError_shouldHideResponse', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(Response.json({ error: 'private_error' }, { status: 400 }));
        const client = new KeycloakAuthClient(
            'https://login.example/auth/device',
            'https://login.example/token',
            'telegram',
            'secret',
            request,
        );

        await expect(client.poll('device')).rejects.toThrow('Keycloak token request failed.');
    });
});
