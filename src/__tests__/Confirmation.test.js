import { describe, it, expect, vi, beforeEach } from 'vitest';
import Confirmation from '../components/Confirmation.js';

describe('Confirmation Component', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
    });

    it('should render booking details with extraTable', async () => {
        const reservation = {
            customer: { name: 'Jon Snow', lineId: 'jon_line', arrivalTime: '19:00' },
            bookingDate: '2024-03-03',
            zone: { name: 'VIP' },
            guestCount: 4,
            extraTable: true,
            payment: { depositAmount: 5000 },
            qrCode: 'TESTQR'
        };

        const component = new Confirmation(reservation);
        await component.render(container);

        expect(container.textContent).toContain('จองโต๊ะสำเร็จ!');
        expect(container.textContent).toContain('✅ เสริมโต๊ะ (+1 Table Added)');
    });

    it('should render booking details without extraTable', async () => {
        const reservation = {
            customer: { name: 'Jon Snow', lineId: '', arrivalTime: '19:00' },
            bookingDate: '2024-03-03',
            zone: { name: 'A' },
            guestCount: 2,
            extraTable: false,
            payment: { depositAmount: 2000 },
            qrCode: 'TESTQR'
        };

        const component = new Confirmation(reservation);
        await component.render(container);

        expect(container.textContent).toContain('❌ ไม่มีการเสริมโต๊ะ');
    });
});
