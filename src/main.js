import ZoneMap from './components/ZoneMap.js';
import { showAlert, showConfirm } from './utils/dialog.js';
import GuestCount from './components/GuestCount.js';
import ExtraTable from './components/ExtraTable.js';
import CustomerForm from './components/CustomerForm.js';
import Payment from './components/Payment.js';
import Confirmation from './components/Confirmation.js';
import client from './api/client.js';

class App {
    constructor() {
        this.container = document.querySelector('#step-content');
        this.stepperItems = document.querySelectorAll('.step-item');
        this.btnClear = document.querySelector('#btn-clear-booking');
        this.logoHome = document.querySelector('#logo-home');
        this.reservation = this.getDefaultReservation();
        this.currentStep = 1;
        this.config = null;
        this.currentViewInstance = null;
        this.sseSource = null;
        this.loadFromStorage();
        this.attachGlobalEvents();
        this.init();
    }

    getDefaultReservation() {
        return {
            zone: null,
            guestCount: 1,
            extraTable: false,
            customer: {},
            payment: {}
        };
    }

    attachGlobalEvents() {
        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => this.resetBookingFlow());
        }
        if (this.logoHome) {
            this.logoHome.addEventListener('click', () => this.resetBookingFlow());
        }
    }

    async resetBookingFlow() {
        const confirmed = await showConfirm('คุณต้องการยกเลิกและเริ่มจองใหม่ใช่หรือไม่?\nข้อมูลที่กรอกไว้จะถูกลบทั้งหมด');
        if (confirmed) {
            this.clearStorage();
            this.reservation = this.getDefaultReservation();
            this.goToStep(1);
        }
    }

    saveToStorage() {
        localStorage.setItem('jongtao_reservation', JSON.stringify({
            reservation: this.reservation,
            currentStep: this.currentStep
        }));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('jongtao_reservation');
        if (stored) {
            const data = JSON.parse(stored);
            this.reservation = data.reservation;
            this.currentStep = data.currentStep;
        }
    }

    clearStorage() {
        localStorage.removeItem('jongtao_reservation');
    }

    async init() {
        try {
            this.config = await client.get('/config');
        } catch (e) {
            console.error('Failed to load config', e);
            this.config = { isBookingOpen: true, openTime: '18:00', closeTime: '02:00', isBookingFeeRequired: true };
        }

        if (!this.config.isBookingOpen) {
            this.renderClosedState();
            return;
        }

        // Apply config to global window so components can access without prop drilling
        window.appConfig = this.config;

        this.setupRealtimeFeed();
        this.goToStep(this.currentStep);
    }

    setupRealtimeFeed() {
        if (this.sseSource) this.sseSource.close();
        this.sseSource = new EventSource('http://localhost:3001/api/bookings/stream');

        this.sseSource.onmessage = async (e) => {
            if (e.data === 'update') {
                // Soft refresh the map if the user is currently on Step 1 (Zone Selection)
                if (this.currentStep === 1 && this.currentViewInstance && typeof this.currentViewInstance.render === 'function') {
                    await this.currentViewInstance.render(this.container);
                }
            }
        };
    }

    renderClosedState() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 100px 20px;">
                <h1 class="font-heading" style="color: var(--danger); font-size: 3rem; margin-bottom: var(--spacing-md);">ร้านปิดรับจอง 🚫</h1>
                <p style="color: var(--text-dim); font-size: 1.2rem; margin-bottom: var(--spacing-xl);">ขออภัย วันนี้ปิดรับการจองผ่านระบบชั่วคราว<br>กรุณาติดต่อทางร้านโดยตรงอีกครั้ง</p>
                <div style="display: flex; gap: var(--spacing-md); justify-content: center;">
                    <a href="#" class="btn btn-ghost" style="padding: 12px 24px; pointer-events: none;">TEL: 000-000-0000</a>
                </div>
            </div>
        `;
        document.querySelector('.stepper')?.remove();
    }

    goToStep(step) {
        // Update Stepper UI
        this.stepperItems.forEach((item, index) => {
            const stepNum = index + 1;
            item.classList.remove('active', 'completed');
            if (stepNum === step) {
                item.classList.add('active');
            } else if (stepNum < step) {
                item.classList.add('completed');
            }
        });

        this.currentStep = step;

        // Toggle Clear button
        if (this.btnClear) {
            this.btnClear.style.display = (step > 1 && step < 6) ? 'block' : 'none';
        }

        this.saveToStorage();
        this.renderStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderStep(step) {
        this.container.innerHTML = '';
        this.currentViewInstance = null;

        switch (step) {
            case 1:
                this.currentViewInstance = new ZoneMap(this.reservation, (zone) => {
                    this.reservation.zone = zone;
                    this.goToStep(2);
                });
                this.currentViewInstance.render(this.container);
                break;

            case 2:
                new GuestCount(
                    this.reservation,
                    () => {
                        // Logic to check if need Step 3 (Extra Table) or go to Step 4
                        if (this.reservation.guestCount > this.reservation.zone.seats) {
                            this.goToStep(3);
                        } else {
                            this.goToStep(4);
                        }
                    },
                    () => this.goToStep(1)
                ).render(this.container);
                break;

            case 3:
                new ExtraTable(
                    this.reservation,
                    () => this.goToStep(4),
                    () => this.goToStep(2)
                ).render(this.container);
                break;

            case 4:
                new CustomerForm(
                    this.reservation,
                    () => this.goToStep(5),
                    () => {
                        if (this.reservation.guestCount > this.reservation.zone.seats) {
                            this.goToStep(3);
                        } else {
                            this.goToStep(2);
                        }
                    }
                ).render(this.container);
                break;

            case 5:
                new Payment(
                    this.reservation,
                    () => this.submitBooking(),
                    () => this.goToStep(4)
                ).render(this.container);
                break;

            case 6: // Success screen
                new Confirmation(this.reservation).render(this.container);
                break;
        }
    }

    async submitBooking() {
        try {
            this.container.innerHTML = `
        <div style="text-align: center; padding: 100px 0;">
          <div class="loader" style="margin: 0 auto 20px;"></div>
          <p>กำลังบันทึกข้อมูลการจอง...</p>
        </div>
        <style>
          .loader { width: 48px; height: 48px; border: 5px solid var(--glass-border); border-bottom-color: var(--primary); border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
          @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;

            // Transform reservation to API format
            const payload = {
                zoneId: this.reservation.zone.id,
                tableId: this.reservation.tableId,
                guestCount: this.reservation.guestCount,
                extraTable: this.reservation.extraTable,
                totalAmount: this.reservation.payment.totalAmount,
                depositAmount: this.reservation.payment.depositAmount,
                customerName: this.reservation.customer.name || 'Unknown',
                customerPhone: this.reservation.customer.phone || '0000000000',
                lineId: this.reservation.customer.lineId,
                arrivalTime: this.reservation.customer.arrivalTime || '19:00',
                occasion: this.reservation.customer.occasion,
                note: this.reservation.customer.note,
                bookingDate: new Date().toISOString(),
                paymentMethod: this.reservation.payment.method
            };

            const result = await client.post('/bookings', payload);
            this.reservation.id = result.id;
            this.reservation.qrCode = result.qrCode;

            // Handle Stripe PromptPay payment
            if (this.reservation.payment.method === 'promptpay' && this.reservation.payment.depositAmount > 0) {
                this.container.innerHTML = `
                <div style="text-align: center; padding: 100px 0;">
                  <div class="loader" style="margin: 0 auto 20px;"></div>
                  <p>กำลังเตรียมช่องทางชำระเงิน (PromptPay)...</p>
                </div>
              `;

                // 1. Create PaymentIntent on server
                const stripeData = await client.post('/payments/create-intent', {
                    bookingId: result.id,
                    amount: this.reservation.payment.depositAmount
                });

                // 2. Re-fetch config to ensure we have the latest publishable key
                const freshConfig = await client.get('/config');
                const publishableKey = freshConfig.stripePublishableKey;
                if (!publishableKey) {
                    throw new Error('Stripe publishable key not configured');
                }
                const stripe = Stripe(publishableKey);

                // 3. Handle next action for PromptPay (QR Code)
                const { error, paymentIntent } = await stripe.confirmPromptPayPayment(stripeData.clientSecret, {
                    payment_method: {
                        promptpay: {},
                        billing_details: {
                            name: this.reservation.customer.name || 'Unknown',
                            email: this.reservation.customer.email
                        }
                    }
                });

                if (error) {
                    throw new Error(error.message);
                }

                // After confirmation, Stripe will show the QR code in a redirect or we can handle it.
                // For PromptPay, confirmPromptPayPayment might redirect or open a modal.
                // If it returns, we Proceed to success screen where we wait for webhook.
                this.reservation.stripePaymentIntentId = paymentIntent.id;
            }

            this.clearStorage();
            this.goToStep(6);
        } catch (error) {
            await showAlert('เกิดข้อผิดพลาด: ' + error.message);
            this.goToStep(5);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
