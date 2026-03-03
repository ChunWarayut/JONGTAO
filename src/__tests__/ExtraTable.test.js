import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExtraTable from '../components/ExtraTable.js';

describe('ExtraTable Component', () => {
    let onNext, onPrev, container, reservation;

    beforeEach(() => {
        onNext = vi.fn();
        onPrev = vi.fn();
        container = document.createElement('div');
        reservation = {
            zone: { code: 'A', minSpend: 1000, extraTableCost: 500 },
            extraTable: false
        };
    });

    it('should handle both extraTable states accurately', async () => {
        // State 1: False
        const component = new ExtraTable(reservation, onNext, onPrev);
        await component.render(container);
        expect(container.querySelector('#summary-extra').style.display).toBe('none');
        expect(container.querySelector('#total-price-display').textContent).toBe('฿1,000');

        // State 2: True
        reservation.extraTable = true;
        const component2 = new ExtraTable(reservation, onNext, onPrev);
        await component2.render(container);
        expect(container.querySelector('#summary-extra').style.display).toBe('flex');
        expect(container.querySelector('#total-price-display').textContent).toBe('฿1,500');
    });

    it('should update price when extra table toggled', async () => {
        reservation.extraTable = false;
        const component = new ExtraTable(reservation, onNext, onPrev);
        await component.render(container);

        const toggle = container.querySelector('#extra-table-toggle');
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));

        expect(container.querySelector('#total-price-display').textContent).toContain('1,500');
        expect(reservation.extraTable).toBe(true);

        // Toggle back
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
        expect(container.querySelector('#total-price-display').textContent).toContain('1,000');
        expect(reservation.extraTable).toBe(false);
    });

    it('should handle navigation', async () => {
        const component = new ExtraTable(reservation, onNext, onPrev);
        await component.render(container);
        container.querySelector('#btn-back').click();
        expect(onPrev).toHaveBeenCalled();
        container.querySelector('#btn-next').click();
        expect(onNext).toHaveBeenCalled();
    });
});
