import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const hash = async (path: string): Promise<string> => {
    const content = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
    return createHash('sha256').update(content).digest('hex');
};

describe('contract snapshots', () => {
    it('uses the exact files from contract bundle 4.0.0', async () => {
        await expect(hash('contracts/channel-gateway-api.yaml')).resolves.toBe(
            'a7eb39148c10e3738a2171fde1a900659fc9d7ef8d3cbe39c09781ab590796ee',
        );
        await expect(hash('contracts/action-api.yaml')).resolves.toBe(
            '4e81629ae113e354849e04616a74c6b93f597702f99e3fb2bd43b0f85eb7f3d8',
        );
        await expect(hash('contracts/agent-runtime-api.yaml')).resolves.toBe(
            'eae15ea79621139b2676e5d809c86f41e4911354fc4b44ee52baed659b591c88',
        );
        await expect(hash('contracts/conversation-api.yaml')).resolves.toBe(
            'ad4632524be68d2612b1efc6c6c0e988212ef3404f507083b32de67af0792329',
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
