import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createBooking, getAllBookings, getBookingById, updateBookingStatus, cancelBooking } from '../controllers/bookingController.js';

const mocks = vi.hoisted(() => ({
    booking: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
    }
}));

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return { booking: mocks.booking };
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
        it('success', async () => {
            req.body = { zoneId: 1, guestCount: 1, extraTable: true, totalAmount: 1000, depositAmount: 500, bookingDate: '2024-03-03' };
            mocks.booking.create.mockResolvedValue({ id: 1 });
            await createBooking(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('error 400', async () => {
            mocks.booking.create.mockRejectedValue(new Error());
            await createBooking(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
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
