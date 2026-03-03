import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getTodayStats, getSummaryStats } from '../controllers/statsController.js';

const mocks = vi.hoisted(() => ({
    booking: {
        findMany: vi.fn(),
        aggregate: vi.fn()
    }
}));

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return { booking: mocks.booking };
        }
    };
});

describe('statsController', () => {
    let req, res;
    beforeEach(() => {
        vi.resetAllMocks();
        res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        res.status.mockReturnThis(); res.json.mockReturnThis();
    });

    describe('getTodayStats', () => {
        it('success with data branches', async () => {
            mocks.booking.findMany.mockResolvedValue([
                { status: 'confirmed', paymentStatus: 'deposit', depositAmount: 500 },
                { status: 'confirmed', paymentStatus: 'paid', totalAmount: 1000 },
                { status: 'pending', paymentStatus: 'unpaid' }
            ]);
            await getTodayStats({}, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalBookings: 3,
                confirmedBookings: 2,
                todayRevenue: 1500
            }));
        });

        it('error 500', async () => {
            mocks.booking.findMany.mockRejectedValue(new Error());
            await getTodayStats({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getSummaryStats', () => {
        it('success with data branches', async () => {
            mocks.booking.findMany.mockResolvedValue([
                { paymentStatus: 'paid', totalAmount: 1000 },
                { paymentStatus: 'deposit', depositAmount: 300 },
                { paymentStatus: 'unpaid' }
            ]);
            await getSummaryStats({}, res);
            expect(res.json).toHaveBeenCalledWith({ totalRevenue: 1300, totalBookings: 3 });
        });

        it('error 500', async () => {
            mocks.booking.findMany.mockRejectedValue(new Error());
            await getSummaryStats({}, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
