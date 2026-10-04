import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const hash = async (path: string): Promise<string> => {
    const content = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
    return createHash('sha256').update(content).digest('hex');
};

describe('contract snapshots', () => {
    it('uses the exact files from contract bundle 3.1.0', async () => {
        await expect(hash('contracts/channel-gateway-api.yaml')).resolves.toBe(
            'cb0476d78bc93a52ae677468d0551356546e61fdf9bb6d4d1a70d2dade64c445',
        );
        await expect(hash('contracts/action-api.yaml')).resolves.toBe(
            'b66489ba87369eccaea0aecfdb8151eca96f46961f7974db3b273ca20a82325e',
        );
        await expect(hash('contracts/agent-runtime-api.yaml')).resolves.toBe(
            '1defb8f2165289e21f16b0e0fb893a3f767c0d21f92b4088db6c9395166c69c8',
        );
        await expect(hash('contracts/conversation-api.yaml')).resolves.toBe(
            '10accd0e403fd2ce443b900a6693e84d4c3e093bdd01d43d7971033f7d121b1b',
        );
        await expect(hash('schemas/action-confirmation.schema.json')).resolves.toBe(
            'd0352c8685c7a0a7d9a887e80c7db4209defb4da9c8596d7f4bd7981eba6b4b8',
        );
        await expect(hash('schemas/message-context.schema.json')).resolves.toBe(
            '6a95cb60f6d92f8090168e24d5a68899faab41e432976927937f4f92dade6e3e',
        );
        await expect(hash('schemas/connection-widget.schema.json')).resolves.toBe(
            'c610fba12988b27f87eaf069dc14309023d2a8daf9aee585520d8c138dfa201d',
        );
    });
});
