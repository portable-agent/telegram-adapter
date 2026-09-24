import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type LockedToken = {
    value: string;
    iv: string;
    tag: string;
};

export class TokenBox {
    public constructor(private readonly key: Buffer) {
        if (key.length !== 32) {
            throw new Error('Token key must contain 32 bytes.');
        }
    }

    public lock(value: string): LockedToken {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.key, iv);
        const locked = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return {
            value: locked.toString('base64'),
            iv: iv.toString('base64'),
            tag: cipher.getAuthTag().toString('base64'),
        };
    }

    public unlock(token: LockedToken): string {
        const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(token.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(token.tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(token.value, 'base64')), decipher.final()]).toString('utf8');
    }
}
