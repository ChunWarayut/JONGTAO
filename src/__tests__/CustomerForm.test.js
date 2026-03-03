import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomerForm from '../components/CustomerForm.js';

describe('CustomerForm Component', () => {
    let onSubmit, onBack, container, reservation;

    beforeEach(() => {
        onSubmit = vi.fn();
        onBack = vi.fn();
        container = document.createElement('div');
        reservation = { customer: {} };
    });

    it('should collect form data and submit', async () => {
        const component = new CustomerForm(reservation, onSubmit, onBack);
        await component.render(container);

        container.querySelector('input[name="name"]').value = 'Jon';
        container.querySelector('input[name="phone"]').value = '123';
        container.querySelector('select[name="occasion"]').value = 'birthday';

        container.querySelector('#booking-form').dispatchEvent(new Event('submit'));

        expect(onSubmit).toHaveBeenCalled();
    });

    it('should cover all occasion branches', async () => {
        const occasions = ['birthday', 'anniversary', 'other', ''];
        for (const occ of occasions) {
            reservation.customer.occasion = occ;
            const component = new CustomerForm(reservation, onSubmit, onBack);
            await component.render(container);
            const select = container.querySelector('select[name="occasion"]');
            if (occ) {
                expect(select.value).toBe(occ);
            }
        }
    });

    it('should trigger back button', async () => {
        const component = new CustomerForm(reservation, onSubmit, onBack);
        await component.render(container);
        container.querySelector('#btn-back').click();
        expect(onBack).toHaveBeenCalled();
    });
});
