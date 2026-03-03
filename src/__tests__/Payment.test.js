import { describe, it, expect, vi, beforeEach } from 'vitest';
import Payment from '../components/Payment.js';

describe('Payment Component', () => {
    let onNext, onPrev, container, reservation;

    beforeEach(() => {
        onNext = vi.fn();
        onPrev = vi.fn();
        container = document.createElement('div');
        reservation = {
            zone: { minSpend: 1000, extraTableCost: 500 },
            extraTable: true
        };
    });

    it('should cover all branches in render and selection', async () => {
        const component = new Payment(reservation, onNext, onPrev);
        await component.render(container);

        // Initial active states
        expect(container.querySelector('.payment-option[data-percent="30"]').classList.contains('active')).toBe(true);

        const opt100 = container.querySelector('.payment-option[data-percent="100"]');
        opt100.click();
        expect(opt100.classList.contains('active')).toBe(true);
        expect(container.querySelector('#final-amount').textContent).toContain('1,500');

        const opt30 = container.querySelector('.payment-option[data-percent="30"]');
        opt30.click();
        expect(container.querySelector('#final-amount').textContent).toContain('450');

        container.querySelector('#btn-submit').click();
        expect(onNext).toHaveBeenCalled();
    });

    it('should cover extraTable false branch', async () => {
        reservation.extraTable = false;
        const component = new Payment(reservation, onNext, onPrev);
        await component.render(container);
        expect(container.querySelector('#final-amount').textContent).toContain('300');
    });

    it('should cover depositPercent 100 active branch', async () => {
        const component = new Payment(reservation, onNext, onPrev);
        component.depositPercent = 100;
        await component.render(container);
        expect(container.querySelector('.payment-option[data-percent="100"]').classList.contains('active')).toBe(true);
    });

    it('should handle back navigation', async () => {
        const component = new Payment(reservation, onNext, onPrev);
        await component.render(container);
        container.querySelector('#btn-back').click();
        expect(onPrev).toHaveBeenCalled();
    });
});
