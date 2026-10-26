import { describe, expect, it, vi } from 'vitest';
import { PollWorker } from '../src/service/poll-worker.js';

const update = (id: number) => ({ update_id: id, message: { text: 'hello' } });

describe('PollWorker', () => {
    it('pollOnce_whenUpdatesArrive_shouldHandleAndConfirmThemInOrder', async () => {
        const getUpdates = vi
            .fn()
            .mockResolvedValueOnce([update(10), update(11)])
            .mockResolvedValueOnce([]);
        const deleteWebhook = vi.fn().mockResolvedValue(undefined);
        const handle = vi.fn().mockResolvedValue(undefined);
        const worker = new PollWorker({ getUpdates, deleteWebhook }, handle);

        await worker.pollOnce();
        await worker.pollOnce();

        expect(deleteWebhook).toHaveBeenCalledTimes(1);
        expect(handle).toHaveBeenNthCalledWith(1, update(10));
        expect(handle).toHaveBeenNthCalledWith(2, update(11));
        expect(getUpdates.mock.calls[0]).toEqual([undefined, undefined]);
        expect(getUpdates.mock.calls[1]).toEqual([12, undefined]);
    });

    it('pollOnce_whenHandlerFails_shouldRetryOnlyFailedUpdate', async () => {
        const getUpdates = vi
            .fn()
            .mockResolvedValueOnce([update(10), update(11)])
            .mockResolvedValueOnce([update(11)]);
        const handle = vi
            .fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('temporary'))
            .mockResolvedValueOnce(undefined);
        const worker = new PollWorker({ getUpdates, deleteWebhook: vi.fn().mockResolvedValue(undefined) }, handle);

        await expect(worker.pollOnce()).rejects.toThrow('temporary');
        await worker.pollOnce();

        expect(getUpdates.mock.calls[1]).toEqual([11, undefined]);
        expect(handle).toHaveBeenNthCalledWith(1, update(10));
        expect(handle).toHaveBeenNthCalledWith(2, update(11));
        expect(handle).toHaveBeenNthCalledWith(3, update(11));
    });
});
