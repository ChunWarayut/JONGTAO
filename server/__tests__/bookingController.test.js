import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createBooking, getAllBookings, getBookingById, updateBookingStatus, cancelBooking } from '../controllers/bookingController.js';

const mocks = vi.hoisted(() => {
    // No default implementations here — beforeEach's vi.resetAllMocks() would wipe
    // them anyway; each test arms exactly the lookups it hits (see armEmptyLookups).
    const model = () => ({
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn()
    });
    const db = {
        booking: model(),
        bookingTable: model(),
        tableHold: model()
    };
    // createBooking runs its availability + hold checks inside a transaction; the
    // callback just gets the same mock db back.
    db.$transaction = (fn) => fn(db);
    return db;
});

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return mocks;
        }
    };
});

describe('bookingController', () => {
    let req, res;
    beforeEach(() => {
        vi.resetAllMocks();
        req = { params: {}, body: {}, query: {} };
        res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        res.status.mockReturnThis(); res.json.mockReturnThis();
    });

    describe('createBooking', () => {
        // vi.resetAllMocks wipes the mockResolvedValue([]) defaults on findMany,
        // so every test re-arms the lookups it will hit.
        const armEmptyLookups = () => {
            mocks.bookingTable.findMany.mockResolvedValue([]);
            mocks.tableHold.findMany.mockResolvedValue([]);
            mocks.tableHold.deleteMany.mockResolvedValue({ count: 0 });
        };

        it('success', async () => {
            req.body = { zoneId: 1, guestCount: 1, extraTable: true, totalAmount: 1000, depositAmount: 500, bookingDate: '2024-03-03' };
            armEmptyLookups();
            mocks.booking.create.mockResolvedValue({ id: 1 });
            await createBooking(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('error 400', async () => {
            armEmptyLookups();
            mocks.booking.create.mockRejectedValue(new Error());
            await createBooking(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('books when every table has a live hold for the session', async () => {
            req.body = {
                zoneId: 1, guestCount: 4, totalAmount: 3000, depositAmount: 3000,
                tableIds: [1, 2], sessionId: 's1', bookingDate: '2026-08-14'
            };
            armEmptyLookups();
            const future = new Date(Date.now() + 10 * 60 * 1000);
            mocks.tableHold.findMany.mockResolvedValue([
                { tableId: 1, bookingDate: new Date('2026-08-14T00:00:00Z'), expiresAt: future },
                { tableId: 2, bookingDate: new Date('2026-08-14T00:00:00Z'), expiresAt: future },
            ]);
            mocks.booking.create.mockResolvedValue({ id: 7, qrCode: 'q', tables: [] });

            await createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mocks.tableHold.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 's1' } });
        });

        it('rejects with the lapsed tables listed when a hold is missing', async () => {
            req.body = {
                zoneId: 1, guestCount: 4, totalAmount: 3000, depositAmount: 3000,
                tableIds: [1, 2], sessionId: 's1', bookingDate: '2026-08-14'
            };
            armEmptyLookups();
            // Only table 1 still has a hold; table 2's lapsed (or never existed).
            mocks.tableHold.findMany.mockResolvedValue([
                { tableId: 1, bookingDate: new Date('2026-08-14T00:00:00Z'), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            ]);

            await createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'HOLD_EXPIRED',
                missingTableIds: [2],
            }));
            expect(mocks.booking.create).not.toHaveBeenCalled();
        });

        it('rejects an expired hold even though the row still exists', async () => {
            req.body = {
                zoneId: 1, guestCount: 2, totalAmount: 1500, depositAmount: 1500,
                tableIds: [1], sessionId: 's1', bookingDate: '2026-08-14'
            };
            armEmptyLookups();
            mocks.tableHold.findMany.mockResolvedValue([
                { tableId: 1, bookingDate: new Date('2026-08-14T00:00:00Z'), expiresAt: new Date(Date.now() - 1000) },
            ]);

            await createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'HOLD_EXPIRED',
                missingTableIds: [1],
            }));
        });
    });

    describe('getAllBookings', () => {
        it('success', async () => {
            mocks.booking.findMany.mockResolvedValue([]);
            await getAllBookings({}, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 500', async () => {
            mocks.booking.findMany.mockRejectedValue(new Error());
            await getAllBookings({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getBookingById', () => {
        it('success', async () => {
            req.params.id = '1';
            mocks.booking.findUnique.mockResolvedValue({ id: 1 });
            await getBookingById(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 404', async () => {
            req.params.id = '1';
            mocks.booking.findUnique.mockResolvedValue(null);
            await getBookingById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('error 500', async () => {
            req.params.id = '1';
            mocks.booking.findUnique.mockRejectedValue(new Error());
            await getBookingById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('updateBookingStatus', () => {
        it('success', async () => {
            req.params.id = '1';
            req.body = { status: 'confirmed', paymentStatus: 'paid' };
            mocks.booking.update.mockResolvedValue({ id: 1 });
            await updateBookingStatus(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 400', async () => {
            req.params.id = '1';
            mocks.booking.update.mockRejectedValue(new Error());
            await updateBookingStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('cancelBooking', () => {
        it('success', async () => {
            req.params.id = '1';
            mocks.booking.update.mockResolvedValue({ id: 1, status: 'cancelled' });
            await cancelBooking(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('error 400', async () => {
            req.params.id = '1';
            mocks.booking.update.mockRejectedValue(new Error());
            await cancelBooking(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
