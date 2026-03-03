import { vi, describe, it, expect, beforeEach } from 'vitest';
import { authenticate } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

describe('authMiddleware', () => {
    let req, res, next;
    beforeEach(() => {
        vi.resetAllMocks();
        req = { headers: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        next = vi.fn();
    });

    it('should return 401 if header missing', async () => {
        await authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if token missing from bearer', async () => {
        req.headers.authorization = 'Bearer ';
        await authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if token invalid', async () => {
        req.headers.authorization = 'Bearer invalid';
        jwt.verify.mockImplementation(() => { throw new Error(); });
        await authenticate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next if token valid', async () => {
        req.headers.authorization = 'Bearer valid';
        jwt.verify.mockReturnValue({ id: 1 });
        await authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({ id: 1 });
    });
});
