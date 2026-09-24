import { z } from 'zod';
import type { StartLink } from '../model/link.js';

export interface AuthClient {
    start(): Promise<StartLink>;
}

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

export class KeycloakAuthClient implements AuthClient {
    public constructor(
        private readonly deviceUrl: string,
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
}
