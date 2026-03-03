import { describe, it, expect, vi, beforeEach } from 'vitest';
import GuestCount from '../components/GuestCount.js';

describe('GuestCount Component', () => {
    let onNext, onPrev, container, reservation;

    beforeEach(() => {
        onNext = vi.fn();
        onPrev = vi.fn();
        container = document.createElement('div');
        reservation = {
            zone: { name: 'A', seats: 4 },
            guestCount: 1
        };
    });

    it('should cover all recommendation branches', async () => {
        const component = new GuestCount(reservation, onNext, onPrev);
        await component.render(container);

        component.count = 2; component.updateDisplay(container);
        expect(container.textContent).toContain('✅');

        component.count = 5; component.updateDisplay(container);
        expect(container.textContent).toContain('⚠️');

        component.count = 10; component.updateDisplay(container);
        expect(container.textContent).toContain('🛑');
    });

    it('should handle count controls', async () => {
        const component = new GuestCount(reservation, onNext, onPrev);
        await component.render(container);

        container.querySelector('#btn-plus').click();
        expect(component.count).toBe(2);

        container.querySelector('#btn-minus').click();
        expect(component.count).toBe(1);

        // Lower limit
        container.querySelector('#btn-minus').click();
        expect(component.count).toBe(1);

        container.querySelector('#btn-next').click();
        expect(onNext).toHaveBeenCalled();
    });

    it('should cover initialization branch', () => {
        delete reservation.guestCount;
        const component = new GuestCount(reservation, onNext, onPrev);
        expect(component.count).toBe(1);
    });

    it('should handle back navigation', async () => {
        const component = new GuestCount(reservation, onNext, onPrev);
        await component.render(container);
        container.querySelector('#btn-back').click();
        expect(onPrev).toHaveBeenCalled();
    });
});
