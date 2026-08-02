import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockClient = {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
};
const mockShowConfirm = vi.fn();
const mockShowAlert = vi.fn();

vi.mock('../api/client.js', () => ({ default: mockClient }));
vi.mock('../utils/dialog.js', () => ({
    showConfirm: (...args) => mockShowConfirm(...args),
    showAlert: (...args) => mockShowAlert(...args),
}));

const { default: BookingList } = await import('../admin/BookingList.js');

// 2026-08-14 BKK == 2026-08-13T17:00:00Z, the instant the app stores for that night.
const NIGHT_TODAY = '2026-08-13T17:00:00.000Z';
const NIGHT_PAST = '2026-06-30T17:00:00.000Z';   // 2026-07-01 BKK
const NIGHT_FUTURE = '2026-09-04T17:00:00.000Z'; // 2026-09-05 BKK

const booking = (over = {}) => ({
    id: 1,
    customerName: 'สมชาย',
    customerPhone: '0812345678',
    guestCount: 4,
    extraTable: false,
    totalAmount: 3000,
    depositAmount: 1500,
    paymentStatus: 'paid',
    status: 'confirmed',
    arrivalTime: '20:00',
    bookingDate: NIGHT_TODAY,
    createdAt: NIGHT_TODAY,
    tableId: 10,
    table: { number: 'A12' },
    zone: { code: 'A', name: 'โซน A' },
    ...over,
});

describe('BookingList', () => {
    let container;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-14T06:00:00.000Z')); // 13:00 BKK on the 14th
        container = document.createElement('div');
        mockClient.get.mockReset();
        mockClient.delete.mockReset().mockResolvedValue({ success: true });
        mockShowConfirm.mockReset().mockResolvedValue(true);
        mockShowAlert.mockReset().mockResolvedValue(true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Row text only — the per-row status <select> repeats every status label, so
    // assert against names that cannot collide with those options.
    const rowText = () =>
        [...container.querySelectorAll('.booking-desktop-table tbody tr')]
            .map((tr) => tr.querySelector('td').textContent)
            .join(' | ');

    const mount = async (bookings, specialDates = []) => {
        mockClient.get.mockImplementation((url) =>
            Promise.resolve(url === '/bookings' ? bookings : specialDates)
        );
        const view = new BookingList();
        await view.render(container);
        return view;
    };

    it('shows the table number instead of only the zone', async () => {
        await mount([booking()]);
        const cell = container.querySelector('.booking-desktop-table .table-number');
        expect(cell.textContent.trim()).toBe('A12');
        expect(container.querySelector('.booking-desktop-table').textContent).toContain('โซน A');
    });

    it('marks a booking with no table assigned', async () => {
        await mount([booking({ tableId: null, table: null })]);
        expect(container.querySelector('.table-number.unassigned').textContent.trim())
            .toBe('ยังไม่ระบุโต๊ะ');
    });

    it('defaults to tonight and hides bookings from other days', async () => {
        const view = await mount([
            booking({ id: 1, customerName: 'คืนนี้', bookingDate: NIGHT_TODAY }),
            booking({ id: 2, customerName: 'เดือนก่อน', bookingDate: NIGHT_PAST }),
            booking({ id: 3, customerName: 'เดือนหน้า', bookingDate: NIGHT_FUTURE }),
        ]);

        expect(view.filterDate).toBe('2026-08-14');
        const rows = container.querySelectorAll('.booking-desktop-table tbody tr');
        expect(rows).toHaveLength(1);
        expect(rows[0].textContent).toContain('คืนนี้');
    });

    it('falls back to the next upcoming night when today has no bookings', async () => {
        const view = await mount([
            booking({ id: 2, bookingDate: NIGHT_PAST }),
            booking({ id: 3, bookingDate: NIGHT_FUTURE }),
        ]);
        expect(view.filterDate).toBe('2026-09-05');
    });

    it('falls back to the most recent past night when nothing is upcoming', async () => {
        const view = await mount([booking({ id: 2, bookingDate: NIGHT_PAST })]);
        expect(view.filterDate).toBe('2026-07-01');
    });

    it('labels the date option with the event name', async () => {
        await mount(
            [booking()],
            [{ date: NIGHT_TODAY, name: 'คอนเสิร์ต Sweet Mullet', isActive: true }]
        );
        const option = container.querySelector('#booking-date-filter option');
        expect(option.textContent).toContain('คอนเสิร์ต Sweet Mullet');
        expect(option.textContent).toContain('(1)');
    });

    it('switching the date filter re-renders that night only', async () => {
        const view = await mount([
            booking({ id: 1, customerName: 'คืนนี้', bookingDate: NIGHT_TODAY }),
            booking({ id: 3, customerName: 'เดือนหน้า', bookingDate: NIGHT_FUTURE }),
        ]);

        const select = container.querySelector('#booking-date-filter');
        select.value = '2026-09-05';
        select.dispatchEvent(new Event('change'));

        // The handler kicks off an async re-render, so wait on the DOM, not the flag.
        await vi.waitFor(() => expect(rowText()).toContain('เดือนหน้า'));
        expect(view.filterDate).toBe('2026-09-05');
        expect(container.querySelectorAll('.booking-desktop-table tbody tr')).toHaveLength(1);
        expect(rowText()).not.toContain('คืนนี้');
    });

    it('defaults to active statuses and switches on chip click', async () => {
        const view = await mount([
            booking({ id: 1, customerName: 'สมชาย', status: 'confirmed' }),
            booking({ id: 2, customerName: 'มานี', status: 'cancelled' }),
        ]);

        expect(view.filterStatus).toBe('active');
        expect(container.querySelectorAll('.booking-desktop-table tbody tr')).toHaveLength(1);
        expect(rowText()).toContain('สมชาย');
        expect(rowText()).not.toContain('มานี');

        const cancelledChip = [...container.querySelectorAll('.status-chip')]
            .find((c) => c.getAttribute('data-status') === 'cancelled');
        expect(cancelledChip.textContent).toContain('1');
        cancelledChip.click();

        await vi.waitFor(() => expect(rowText()).toContain('มานี'));
        expect(view.filterStatus).toBe('cancelled');
        expect(container.querySelectorAll('.booking-desktop-table tbody tr')).toHaveLength(1);
    });

    it('summarises only the non-cancelled bookings on screen', async () => {
        await mount([
            booking({ id: 1, guestCount: 4, extraTable: true, totalAmount: 3000, depositAmount: 1500, paymentStatus: 'paid' }),
            booking({ id: 2, guestCount: 2, totalAmount: 2000, depositAmount: 1000, paymentStatus: 'unpaid', status: 'pending' }),
        ]);

        const values = [...container.querySelectorAll('.sum-value')].map((v) => v.textContent.trim());
        expect(values[0]).toBe('3');            // 2 tables + 1 extra
        expect(values[1]).toBe('6');            // guests
        expect(values[2]).toBe('฿5,000');       // min spend
        expect(values[3]).toBe('฿1,500');       // deposits actually paid
    });

    it('permanently deletes a booking after confirmation', async () => {
        await mount([booking({ id: 42 })]);
        container.querySelector('.booking-desktop-table .btn-delete-booking').click();

        await vi.waitFor(() => expect(mockClient.delete).toHaveBeenCalledWith('/bookings/42/permanent'));
        expect(mockShowConfirm).toHaveBeenCalledOnce();
        expect(mockShowConfirm.mock.calls[0][0]).toContain('A12');
    });

    it('does not delete when the confirmation is dismissed', async () => {
        mockShowConfirm.mockResolvedValue(false);
        await mount([booking({ id: 42 })]);
        container.querySelector('.booking-desktop-table .btn-delete-booking').click();

        await vi.waitFor(() => expect(mockShowConfirm).toHaveBeenCalledOnce());
        expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('escapes customer-supplied text', async () => {
        await mount([booking({ customerName: '<img src=x onerror=alert(1)>' })]);
        expect(container.querySelector('.booking-desktop-table tbody').innerHTML)
            .not.toContain('<img src=x');
    });
});
