import { describe, expect, it } from 'vitest';
import { TokenBox } from '../src/security/token-box.js';

describe('TokenBox', () => {
    it('constructor_whenKeyIsNot32Bytes_shouldRejectKey', () => {
        expect(() => new TokenBox(Buffer.alloc(16))).toThrow('Token key must contain 32 bytes.');
    });

    it('unlock_whenTokenWasLocked_shouldReturnOriginalValue', () => {
        const box = new TokenBox(Buffer.alloc(32, 7));
        const token = box.lock('secret-token');

        expect(box.unlock(token)).toBe('secret-token');
        expect(token.value).not.toContain('secret-token');
    });

    it('lock_whenCalledTwice_shouldUseDifferentIv', () => {
        const box = new TokenBox(Buffer.alloc(32, 7));

        expect(box.lock('same').iv).not.toBe(box.lock('same').iv);
    });
});
