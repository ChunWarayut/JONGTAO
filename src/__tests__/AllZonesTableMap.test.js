import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
const mockShowAlert = vi.fn();

vi.mock('../api/client.js', () => ({ default: mockClient }));
vi.mock('../utils/dialog.js', () => ({ showAlert: (...a) => mockShowAlert(...a) }));
vi.mock('../utils/session.js', () => ({ getSessionId: () => 'test-session' }));

const { default: AllZonesTableMap } = await import('../components/AllZonesTableMap.js');

const ZONE_A = { id: 1, code: 'A', name: 'โซน A', color: '#ff0000', minSpend: 2000, seatsPerTable: 4, extraTableCost: 500 };
const ZONE_B = { id: 2, code: 'B', name: 'โซน B', color: '#00ff00', minSpend: 1500, seatsPerTable: 4, extraTableCost: 400 };

const TABLES = [
    { id: 1, number: 'A1', zoneId: 1, x: 10, y: 10 },
    { id: 2, number: 'A2', zoneId: 1, x: 20, y: 10 },
    { id: 3, number: 'A3', zoneId: 1, x: 30, y: 10 },
    { id: 9, number: 'B1', zoneId: 2, x: 10, y: 40 },
];

const SPECIAL_DATE = { id: 1, name: 'คอนเสิร์ต', priceType: 'normal', isActive: true, depositAmount: null };

describe('AllZonesTableMap multi-table selection', () => {
    let container, reservation, onSelect;

    const setup = ({ publicBookings = [], holds = [], specialDate = SPECIAL_DATE, tableIds = [] } = {}) => {
        reservation = { bookingDate: '2026-12-25', tableIds };
        onSelect = vi.fn();

        mockClient.get.mockImplementation((url) => {
            if (url === '/zones') return Promise.resolve([ZONE_A, ZONE_B]);
            if (url === '/tables') return Promise.resolve(TABLES);
            if (url === '/fixtures') return Promise.resolve([]);
            if (url.startsWith('/bookings/public-status')) return Promise.resolve(publicBookings);
            if (url.startsWith('/holds/public')) return Promise.resolve(holds);
            if (url.startsWith('/special-dates/by-date')) return Promise.resolve(specialDate);
            return Promise.resolve([]);
        });
        mockClient.post.mockResolvedValue({ expiresAt: '2026-12-25T12:15:00.000Z', holdMinutes: 15 });
        mockClient.delete.mockResolvedValue({ ok: true });

        return new AllZonesTableMap(reservation, onSelect);
    };

    const tableEl = (id) => container.querySelector(`.table-map-item[data-id="${id}"]`);
    // The cart floats on <body>, outside the step container.
    const cart = () => document.querySelector('#selection-cart');

    beforeEach(() => {
        // Containers from earlier tests must go: jsdom resolves `#id` through the
        // document-wide id map, so a stale duplicate would shadow this one.
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        mockClient.get.mockReset();
        mockClient.post.mockReset();
        mockClient.delete.mockReset();
        mockShowAlert.mockReset().mockResolvedValue(true);
    });

    it('selects a table and places a hold for it', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));

        expect(mockClient.post).toHaveBeenCalledWith('/holds', {
            tableId: 1, bookingDate: '2026-12-25', sessionId: 'test-session',
        });
        expect(tableEl(1).classList.contains('mine')).toBe(true);
    });

    it('holds each table separately when several are picked', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));
        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));
        tableEl(3).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2, 3]));

        expect(mockClient.post).toHaveBeenCalledTimes(3);
        expect(cart().textContent).toContain('3 โต๊ะ');
    });

    it('tapping a selected table again releases just that hold', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));
        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([2]));

        expect(mockClient.delete).toHaveBeenCalledWith('/holds', expect.objectContaining({
            body: JSON.stringify({ sessionId: 'test-session', tableId: 1 }),
        }));
        expect(tableEl(1).classList.contains('mine')).toBe(false);
        expect(tableEl(2).classList.contains('mine')).toBe(true);
    });

    it('refuses a table from a different zone', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));

        tableEl(9).click();
        await vi.waitFor(() => expect(mockShowAlert).toHaveBeenCalled());

        expect(map.selectedTableIds).toEqual([1]);
        expect(mockShowAlert.mock.calls[0][0]).toContain('โซนเดียวกัน');
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('multiplies the minimum spend by the number of tables', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));
        expect(map.selectionPricing()).toMatchObject({ total: 2000, perTable: 2000, free: false });

        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));
        expect(map.selectionPricing()).toMatchObject({ total: 4000, free: false });
        expect(cart().textContent).toContain('฿4,000');
        expect(cart().textContent).toContain('8 ที่นั่ง');
    });

    it('multiplies a custom event price by the number of tables', async () => {
        const map = setup({ specialDate: { ...SPECIAL_DATE, priceType: 'custom', depositAmount: 700 } });
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));
        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));

        expect(map.selectionPricing()).toMatchObject({ total: 1400, perTable: 700 });
    });

    it('charges nothing when the night has no special date', async () => {
        const map = setup({ specialDate: null });
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));

        expect(map.selectionPricing().free).toBe(true);
        expect(cart().textContent).toContain('จองฟรี');
    });

    it('confirming writes the whole table set onto the reservation', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));
        tableEl(3).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 3]));

        cart().querySelector('#btn-confirm-selection').click();

        expect(reservation.tableIds).toEqual([1, 3]);
        expect(reservation.tables.map((t) => t.number)).toEqual(['A1', 'A3']);
        expect(reservation.tableCount).toBe(2);
        expect(reservation.tableId).toBe(1);          // legacy mirror
        expect(reservation.table.number).toBe('A1');
        expect(reservation.zone.seats).toBe(8);       // 4 seats × 2 tables
        expect(onSelect).toHaveBeenCalledOnce();
    });

    it('treats every table of an existing booking as taken, not just the first', async () => {
        const map = setup({
            publicBookings: [{ id: 5, status: 'confirmed', tableId: 1, tableIds: [1, 2] }],
        });
        await map.render(container);

        expect(map.bookedTableIds).toEqual(expect.arrayContaining([1, 2]));
        expect(tableEl(1).classList.contains('selectable')).toBe(false);
        expect(tableEl(2).classList.contains('selectable')).toBe(false);
        expect(tableEl(3).classList.contains('selectable')).toBe(true);
    });

    it('falls back to tableId for bookings made before multi-table existed', async () => {
        const map = setup({ publicBookings: [{ id: 5, status: 'confirmed', tableId: 2, tableIds: [] }] });
        await map.render(container);

        expect(map.bookedTableIds).toEqual([2]);
        expect(tableEl(2).classList.contains('selectable')).toBe(false);
    });

    it('restores a selection made before stepping away', async () => {
        const map = setup({ tableIds: [1, 2] });
        await map.render(container);

        expect(tableEl(1).classList.contains('mine')).toBe(true);
        expect(tableEl(2).classList.contains('mine')).toBe(true);
        expect(cart().textContent).toContain('2 โต๊ะ');
    });

    // Placing a hold makes the server broadcast holds_update, which comes straight
    // back to this same browser and makes main.js re-render the map. Picking the
    // next table has to keep working across that.
    it('can still pick another table after the map re-renders underneath', async () => {
        const map = setup();
        await map.render(container);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1]));

        await map.render(container);
        expect(map.selectedTableIds).toEqual([1]);
        expect(tableEl(1).classList.contains('mine')).toBe(true);

        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));
        expect(cart().textContent).toContain('2 โต๊ะ');
    });

    it('survives a re-render that lands mid-tap', async () => {
        const map = setup();
        await map.render(container);

        await Promise.all([map.toggleTable(1, 1, tableEl(1)), map.render(container)]);
        expect(map.selectedTableIds).toEqual([1]);

        tableEl(2).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([1, 2]));
    });

    it('shows no cart until something is selected, and drops it when emptied', async () => {
        const map = setup();
        await map.render(container);
        expect(cart()).toBeNull();
        expect(document.body.classList.contains('has-selection-cart')).toBe(false);

        tableEl(1).click();
        await vi.waitFor(() => expect(cart()).not.toBeNull());
        expect(document.body.classList.contains('has-selection-cart')).toBe(true);

        tableEl(1).click();
        await vi.waitFor(() => expect(map.selectedTableIds).toEqual([]));
        expect(cart()).toBeNull();
        expect(document.body.classList.contains('has-selection-cart')).toBe(false);
    });

    it('floats outside the step container so it cannot scroll away', async () => {
        const map = setup();
        await map.render(container);
        tableEl(1).click();
        await vi.waitFor(() => expect(cart()).not.toBeNull());

        expect(cart().parentElement).toBe(document.body);
        expect(container.contains(cart())).toBe(false);
    });

    it('keeps the table unselected when the hold is rejected', async () => {
        const map = setup();
        await map.render(container);
        mockClient.post.mockRejectedValueOnce(new Error('โต๊ะนี้ถูกจองไปแล้ว'));

        tableEl(1).click();
        await vi.waitFor(() => expect(mockShowAlert).toHaveBeenCalled());

        expect(map.selectedTableIds).toEqual([]);
        expect(mockShowAlert.mock.calls[0][0]).toContain('ถูกจองไปแล้ว');
    });
});
