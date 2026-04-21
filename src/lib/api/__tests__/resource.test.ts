import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the http module before importing resource
vi.mock('@/lib/api/http', () => ({
    http: {
        post: vi.fn(),
    },
}));

import resource from '@/lib/api/resource';
import { http } from '@/lib/api/http';

describe('api/resource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (http.post as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    });

    it('getTime calls POST cpu/time with the account', async () => {
        await resource.getTime('alice');
        expect(http.post).toHaveBeenCalledWith('cpu/time', { account: 'alice' });
    });

    it('getTime returns the http response', async () => {
        (http.post as ReturnType<typeof vi.fn>).mockResolvedValue({ time: 1234567890 });
        const result = await resource.getTime('alice');
        expect(result).toEqual({ time: 1234567890 });
    });

    it('pushTx calls POST cpu/pushtx with the provided data', async () => {
        const txData = { serializedTransaction: 'abc123', signatures: ['SIG_K1_...'] };
        await resource.pushTx(txData);
        expect(http.post).toHaveBeenCalledWith('cpu/pushtx', txData);
    });

    it('pushTx returns the http response', async () => {
        (http.post as ReturnType<typeof vi.fn>).mockResolvedValue({ transaction_id: 'tx123' });
        const result = await resource.pushTx({});
        expect(result).toEqual({ transaction_id: 'tx123' });
    });
});
