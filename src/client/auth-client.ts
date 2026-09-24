import { z } from 'zod';
import type { StartLink } from '../model/link.js';

export interface AuthClient {
    start(): Promise<StartLink>;
    poll(deviceCode: string): Promise<LinkPoll>;
}

export type LinkPoll =
    | { status: 'waiting'; waitMore: number }
    | { status: 'approved'; accessToken: string; refreshToken: string; expiresIn: number }
    | { status: 'denied' }
    | { status: 'expired' };

type Fetch = typeof fetch;

const responseSchema = z
    .object({
        device_code: z.string().min(1),
        user_code: z.string().min(1),
        verification_uri: z.url(),
        verification_uri_complete: z.url().optional(),
        expires_in: z.number().int().positive(),
        interval: z.number().int().positive().default(5),
    })
    .passthrough();

const tokenSchema = z
    .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1),
        expires_in: z.number().int().positive(),
    })
    .passthrough();

const errorSchema = z.object({ error: z.string().min(1) }).passthrough();

export class KeycloakAuthClient implements AuthClient {
    public constructor(
        private readonly deviceUrl: string,
        private readonly tokenUrl: string,
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly request: Fetch = fetch,
    ) {}

    public async start(): Promise<StartLink> {
        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            scope: 'openid offline_access',
        });
        const response = await this.request(this.deviceUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!response.ok) {
            throw new Error('Keycloak device flow is unavailable.');
        }
        const value = responseSchema.parse(await response.json());
        return {
            deviceCode: value.device_code,
            userCode: value.user_code,
            verifyUrl: value.verification_uri_complete ?? value.verification_uri,
            expiresIn: value.expires_in,
            interval: value.interval,
        };
    }

    public async poll(deviceCode: string): Promise<LinkPoll> {
        const body = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            device_code: deviceCode,
            client_id: this.clientId,
            client_secret: this.clientSecret,
        });
        const response = await this.request(this.tokenUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body,
        });
        const value: unknown = await response.json();
        if (response.ok) {
            const token = tokenSchema.parse(value);
            return {
                status: 'approved',
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expiresIn: token.expires_in,
            };
        }
        const error = errorSchema.parse(value).error;
        if (error === 'authorization_pending') {
            return { status: 'waiting', waitMore: 0 };
        }
        if (error === 'slow_down') {
            return { status: 'waiting', waitMore: 5 };
        }
        if (error === 'access_denied') {
            return { status: 'denied' };
        }
        if (error === 'expired_token') {
            return { status: 'expired' };
        }
        throw new Error('Keycloak token request failed.');
    }
}
