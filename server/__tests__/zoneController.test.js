import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getAllZones, getZoneById, createZone, updateZone, deleteZone } from '../controllers/zoneController.js';

const mocks = vi.hoisted(() => ({
    zone: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return { zone: mocks.zone };
        }
    };
});

describe('zoneController', () => {
    let req, res;
    beforeEach(() => {
        vi.resetAllMocks();
        req = { params: {}, body: {} };
        res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
        res.status.mockReturnThis(); res.json.mockReturnThis(); res.send.mockReturnThis();
    });

    describe('getAllZones', () => {
        it('success', async () => {
            mocks.zone.findMany.mockResolvedValue([{ totalTables: 5, _count: { bookings: 1 } }]);
            await getAllZones(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 500', async () => {
            mocks.zone.findMany.mockRejectedValue(new Error());
            await getAllZones(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getZoneById', () => {
        it('success', async () => {
            req.params.id = '1';
            mocks.zone.findUnique.mockResolvedValue({ id: 1 });
            await getZoneById(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 404', async () => {
            req.params.id = '1';
            mocks.zone.findUnique.mockResolvedValue(null);
            await getZoneById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('error 500', async () => {
            req.params.id = '1';
            mocks.zone.findUnique.mockRejectedValue(new Error());
            await getZoneById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('createZone', () => {
        it('success', async () => {
            req.body = { code: 'A', name: 'Z', seatsPerTable: 4, totalTables: 10, minSpend: 1000, extraTableCost: 200, color: '#f00' };
            mocks.zone.create.mockResolvedValue({ id: 1 });
            await createZone(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('error 400', async () => {
            mocks.zone.create.mockRejectedValue(new Error());
            await createZone(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateZone', () => {
        it('success', async () => {
            req.params.id = '1';
            mocks.zone.update.mockResolvedValue({ id: 1 });
            await updateZone(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 400', async () => {
            mocks.zone.update.mockRejectedValue(new Error());
            await updateZone(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteZone', () => {
        it('success', async () => {
            req.params.id = '1';
            mocks.zone.delete.mockResolvedValue({});
            await deleteZone(req, res);
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('error 400', async () => {
            req.params.id = '1';
            mocks.zone.delete.mockRejectedValue(new Error());
            await deleteZone(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
