import type { PendingLink } from '../model/link.js';

export interface LinkStore {
    savePending(link: PendingLink): Promise<void>;
}
