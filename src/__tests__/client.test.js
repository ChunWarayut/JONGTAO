import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../api/client.js';

describe('API Client', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        }));
        // Clear the global mock if it exists
        if (global.localStorage && global.localStorage.getItem.mockReset) {
            global.localStorage.getItem.mockReset();
            global.localStorage.setItem.mockReset();
            global.localStorage.clear.mockReset();
        }
        vi.clearAllMocks();
    });

    it('should handle request with token', async () => {
        global.localStorage.getItem.mockReturnValue('test-token');
        await client.get('/test');
        expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        }));
    });

    it('should handle request without token', async () => {
        global.localStorage.getItem.mockReturnValue(null);
        await client.get('/test');
        expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            headers: expect.not.objectContaining({ Authorization: expect.any(String) })
        }));
    });

    it('should throw error if response not ok', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Custom Error' })
        });
        await expect(client.get('/test')).rejects.toThrow('Custom Error');
    });

    it('should throw default error if no error message in data', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({})
        });
        await expect(client.get('/test')).rejects.toThrow('Something went wrong');
    });

    it('should handle all HTTP methods', async () => {
        await client.get('/test');
        expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }));

        await client.post('/test', { a: 1 });
        expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'POST', body: JSON.stringify({ a: 1 }) }));

        await client.patch('/test', { a: 1 });
        expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PATCH' }));

        await client.put('/test', { a: 1 });
        expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PUT' }));

        await client.delete('/test');
        expect(fetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'DELETE' }));
    });

    it('should log error on network failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        fetch.mockRejectedValueOnce(new Error('Network Error'));
        await expect(client.get('/test')).rejects.toThrow('Network Error');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
