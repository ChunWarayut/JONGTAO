import { vi, describe, it, expect, beforeEach } from 'vitest';
import { login, checkAuth } from '../controllers/authController.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

const mocks = vi.hoisted(() => ({
    owner: { findUnique: vi.fn() }
}));

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return { owner: mocks.owner };
        }
    };
});

describe('authController', () => {
    let req, res;
    beforeEach(() => {
        vi.resetAllMocks();
        req = { body: {} };
        res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        res.status.mockReturnThis(); res.json.mockReturnThis();
    });

    describe('login', () => {
        it('error 400 if missing username', async () => {
            req.body = { password: 'p' };
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Username and password are required' });
        });

        it('error 401 if owner not found', async () => {
            req.body = { username: 'a', password: 'p' };
            mocks.owner.findUnique.mockResolvedValue(null);
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('error 401 if password mismatch', async () => {
            req.body = { username: 'a', password: 'p' };
            mocks.owner.findUnique.mockResolvedValue({ password: 'h' });
            bcrypt.compare.mockResolvedValue(false);
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('success 200', async () => {
            req.body = { username: 'a', password: 'p' };
            mocks.owner.findUnique.mockResolvedValue({ id: 1, password: 'h', name: 'N' });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            await login(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token' }));
        });

        it('error 500 on database fail', async () => {
            req.body = { username: 'a', password: 'p' };
            mocks.owner.findUnique.mockRejectedValue(new Error('DB Fail'));
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('checkAuth', () => {
        it('returns user info', async () => {
            req.user = { id: 1, name: 'N' };
            await checkAuth(req, res);
            expect(res.json).toHaveBeenCalledWith({ user: req.user });
        });
    });
});
