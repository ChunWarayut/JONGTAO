import { describe, it, expect, vi, beforeEach } from 'vitest';
import ZoneMap from '../components/ZoneMap.js';

describe('ZoneMap Component', () => {
    let onSelect, container, reservation;

    beforeEach(() => {
        onSelect = vi.fn();
        reservation = { zone: {}, table: {}, tableId: null };
        container = document.createElement('div');
        vi.resetAllMocks();
    });

    it('should render SVG map and stage', async () => {
        const component = new ZoneMap(reservation, onSelect);
        component.zones = [{ id: 1, code: 'A', name: 'Zone A', color: '#ff0000', minSpend: 1000 }];
        component.tables = [{ id: 101, number: 'A1', x: 50, y: 50, zoneId: 1 }];

        await component.render(container);
        expect(container.querySelector('svg')).toBeTruthy();
        expect(container.textContent).toContain('STAGE / เวที');
    });

    it('should handle zone clicks', async () => {
        const component = new ZoneMap(reservation, onSelect);
        component.zones = [{ id: 1, code: 'A', name: 'Zone A', color: '#ff0000', minSpend: 1000 }];
        component.tables = [{ id: 101, number: 'A1', x: 50, y: 50, zoneId: 1 }];

        await component.render(container);

        const zoneA = container.querySelector('[data-zone-code="A"]');
        expect(zoneA).not.toBeNull();

        zoneA.dispatchEvent(new Event('click', { bubbles: true }));

        const detailPanel = container.querySelector('#zone-detail-panel');
        expect(detailPanel.textContent).toContain('Zone A');
        expect(detailPanel.textContent).toContain('1,000');
    });

    it('should transition to tables view and select a table', async () => {
        const component = new ZoneMap(reservation, onSelect);
        component.zones = [{ id: 1, code: 'A', name: 'Zone A', color: '#ff0000', minSpend: 1000 }];
        component.tables = [{ id: 101, number: 'A1', x: 50, y: 50, zoneId: 1 }];

        await component.render(container);

        // 1. Click Zone
        const zoneA = container.querySelector('[data-zone-code="A"]');
        zoneA.dispatchEvent(new Event('click', { bubbles: true }));

        // 2. Click "Go to tables"
        const nextBtn = container.querySelector('#btn-go-to-tables');
        expect(nextBtn).not.toBeNull();
        nextBtn.click();

        // 3. Verify Table View
        expect(container.textContent).toContain('เลือกเลขโต๊ะ');
        const count = container.querySelectorAll('.table-select').length;
        expect(count).toBeGreaterThan(0);

        // 4. Click Table
        const tableBtn = container.querySelector('.table-select');
        tableBtn.click();

        // 5. Confirm selection
        const confirmBtn = container.querySelector('#btn-confirm-table');
        expect(confirmBtn).not.toBeNull();
        confirmBtn.click();

        expect(onSelect).toHaveBeenCalled();
    });
});
