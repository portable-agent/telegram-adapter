import { describe, expect, it } from 'vitest';
import { readSettings } from '../src/config/settings.js';

const env = {
    TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyz',
    TELEGRAM_WEBHOOK_SECRET: 'a'.repeat(32),
    KEYCLOAK_URL: 'http://localhost:8091',
    KEYCLOAK_REALM: 'portable-agent',
    KEYCLOAK_CLIENT_ID: 'telegram-adapter',
    KEYCLOAK_CLIENT_SECRET: 'client-secret-value',
    TOKEN_KEY_BASE64: Buffer.alloc(32, 1).toString('base64'),
    DATABASE_URL: 'postgres://user:pass@localhost:5432/telegram',
    CHANNEL_GATEWAY_URL: 'http://localhost:8084',
    TELEGRAM_API_URL: 'http://fake-telegram:8080/',
};

describe('readSettings', () => {
    it('readSettings_whenValuesAreValid_shouldBuildDeviceUrl', () => {
        const settings = readSettings(env);

        expect(settings.deviceUrl).toBe(
            'http://localhost:8091/realms/portable-agent/protocol/openid-connect/auth/device',
        );
        expect(settings.telegramUrl).toBe('http://fake-telegram:8080/bot123456789:abcdefghijklmnopqrstuvwxyz');
        expect(settings.tokenKey).toHaveLength(32);
    });

    it('readSettings_whenTokenKeyIsShort_shouldRejectConfig', () => {
        expect(() => readSettings({ ...env, TOKEN_KEY_BASE64: Buffer.alloc(16).toString('base64') })).toThrow();
    });
});
