import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const hash = async (path: string): Promise<string> => {
    const content = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
    return createHash('sha256').update(content).digest('hex');
};

describe('contract snapshots', () => {
    it('uses the exact files from contract bundle 4.1.0', async () => {
        await expect(hash('contracts/channel-gateway-api.yaml')).resolves.toBe(
            'f5cc5ce0c2458c3bad8fe86f53ac33b3c89d78877510260c91c69e03a2f73c7e',
        );
        await expect(hash('contracts/action-api.yaml')).resolves.toBe(
            '81828aaf9283062095cda528ef3a62be3a1395e7a7139a73b29c8fe174b55695',
        );
        await expect(hash('contracts/agent-runtime-api.yaml')).resolves.toBe(
            'fec584fb5f082d36dadab505b153b52405340463fe910749d649dcdb7f701367',
        );
        await expect(hash('contracts/conversation-api.yaml')).resolves.toBe(
            'df09e002bbec715c436ce9207706069fb7862d7acf76646977cbfa400fbff4db',
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
