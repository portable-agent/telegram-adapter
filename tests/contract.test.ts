import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const hash = async (path: string): Promise<string> => {
    const content = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
    return createHash('sha256').update(content).digest('hex');
};

describe('contract snapshots', () => {
    it('uses the exact files from contract bundle 2.5.0', async () => {
        await expect(hash('contracts/channel-gateway-api.yaml')).resolves.toBe(
            'c629f1916a2f6c38905d617a751f2b31bb1f5e9b19220ecbc97c505dc3923810',
        );
        await expect(hash('contracts/action-api.yaml')).resolves.toBe(
            'b96191bd9665f1fcd7c509ec03f85643e90bc11b047db791062268349f578cbc',
        );
        await expect(hash('contracts/agent-runtime-api.yaml')).resolves.toBe(
            '07ecc4a6024cce5d9fd1a960f2b0ec910c363eca9163a2f62b46a9af2f6ec610',
        );
        await expect(hash('contracts/conversation-api.yaml')).resolves.toBe(
            '5e103d43fc6a815ed40c6d84fcfebd80e0726448d2f53a343f5e6d1797648505',
        );
        await expect(hash('schemas/action-confirmation.schema.json')).resolves.toBe(
            'd0352c8685c7a0a7d9a887e80c7db4209defb4da9c8596d7f4bd7981eba6b4b8',
        );
        await expect(hash('schemas/message-context.schema.json')).resolves.toBe(
            '6a95cb60f6d92f8090168e24d5a68899faab41e432976927937f4f92dade6e3e',
        );
    });
});
