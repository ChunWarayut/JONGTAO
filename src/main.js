import AllZonesTableMap from './components/AllZonesTableMap.js';
import { showAlert, showConfirm } from './utils/dialog.js';
import GuestCount from './components/GuestCount.js';
import ExtraTable from './components/ExtraTable.js';
import CustomerForm from './components/CustomerForm.js';
import Payment from './components/Payment.js';
import Confirmation from './components/Confirmation.js';
import client from './api/client.js';
import { getSessionId } from './utils/session.js';

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
        this.sessionId = getSessionId();
        this.holdTimerInterval = null;
        this.loadFromStorage();
        this.attachGlobalEvents();
        this.init();
    }

    getDefaultReservation() {
        return {
            zone: null,
            tables: [],
            tableIds: [],
            guestCount: 3,
            extraTable: false,
            customer: {},
            payment: {}
        };
    }

    // Wipe the chosen tables (both the multi-table set and the legacy single-table
    // mirrors) — used whenever the customer has to go back to the map and pick again.
    clearSelectedTables() {
        if (!this.reservation) return;
        this.reservation.tables = [];
        this.reservation.tableIds = [];
        this.reservation.tableCount = 0;
        this.reservation.table = null;
        this.reservation.tableId = null;
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
            await this.releaseHold();
            this.stopHoldTimer();
            this.clearStorage();
            this.reservation = this.getDefaultReservation();
            this.goToStep(1);
        }
    }

    // ---- Table hold countdown -------------------------------------------------
    // From the moment a table is picked until payment is submitted, the customer
    // holds the table. If the countdown hits zero the hold is released server-side
    // (cleanup job) and here we drop them back to the map.

    async releaseHold() {
        const held = this.reservation?.tableIds?.length || this.reservation?.tableId;
        if (!held) return;
        try {
            // No tableId in the body — releases every table this session is holding.
            await client.delete('/holds', {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        } catch (e) {
            console.error('Failed to release hold', e);
        }
    }

    startHoldTimer(expiresAt) {
        this.reservation.holdExpiresAt = expiresAt;
        this.saveToStorage();
        this.stopHoldTimer(false); // clear any previous interval without wiping state
        this.renderHoldBanner();
        this.holdTimerInterval = setInterval(() => this.renderHoldBanner(), 1000);
    }

    stopHoldTimer(clearState = true) {
        if (this.holdTimerInterval) {
            clearInterval(this.holdTimerInterval);
            this.holdTimerInterval = null;
        }
        const banner = document.querySelector('#hold-timer-banner');
        if (banner) banner.remove();
        if (clearState && this.reservation) {
            this.reservation.holdExpiresAt = null;
        }
    }

    async onHoldExpired() {
        this.stopHoldTimer();
        await this.releaseHold();
        this.clearSelectedTables();
        this.saveToStorage();
        await showAlert('⏰ หมดเวลาในการจอง ระบบได้คืนโต๊ะให้ลูกค้าท่านอื่นแล้ว กรุณาเลือกโต๊ะใหม่อีกครั้ง');
        this.goToStep(1);
    }

    renderHoldBanner() {
        const expiresAt = this.reservation && this.reservation.holdExpiresAt;
        // Only show the countdown while a table is held and before completion.
        if (!expiresAt || this.currentStep < 2 || this.currentStep >= 6) {
            const existing = document.querySelector('#hold-timer-banner');
            if (existing) existing.remove();
            return;
        }

        const msLeft = new Date(expiresAt).getTime() - Date.now();
        if (msLeft <= 0) {
            this.onHoldExpired();
            return;
        }

        const totalSec = Math.floor(msLeft / 1000);
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        const urgent = totalSec <= 60;

        let banner = document.querySelector('#hold-timer-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'hold-timer-banner';
            document.body.appendChild(banner);
            const style = document.createElement('style');
            style.textContent = `
                #hold-timer-banner {
                    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
                    z-index: 9000; display: flex; align-items: center; gap: 10px;
                    padding: 10px 18px; border-radius: var(--radius-full);
                    background: rgba(20,20,28,0.92); backdrop-filter: blur(10px);
                    border: 1px solid var(--glass-border); box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    font-weight: 700; font-size: 0.95rem; color: white; white-space: nowrap;
                }
                #hold-timer-banner.urgent { border-color: var(--danger); animation: holdBlink 1s steps(2) infinite; }
                #hold-timer-banner .ht-time { font-family: 'Outfit', monospace; font-size: 1.1rem; }
                #hold-timer-banner.urgent .ht-time { color: #fca5a5; }
                @keyframes holdBlink { 50% { opacity: 0.55; } }
            `;
            document.head.appendChild(style);
        }
        banner.className = urgent ? 'urgent' : '';
        banner.innerHTML = `<span>⏳ จองโต๊ะภายใน</span><span class="ht-time">${mm}:${ss}</span>`;
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

        window.appConfig = this.config;

        // Read ?date= from URL and lock it
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            // Only apply if no booking in progress
            if (!this.reservation.id && !this.reservation.zone) {
                this.reservation.bookingDate = dateParam;
                this.reservation.lockedDate = true;
                this.currentStep = 1;
            }
        } else if (this.reservation.lockedDate) {
            // No date in the current URL. A `lockedDate` here is stale — left in
            // localStorage from a previous event-link (?date=) visit — and would
            // wrongly keep the date picker locked. Always unlock so the user can
            // choose a date freely. Only forget the date itself when nothing is in
            // progress (don't wipe an in-progress booking's date).
            this.reservation.lockedDate = false;
            if (!this.reservation.id && !this.reservation.zone) {
                this.reservation.bookingDate = null;
            }
        }

        this.setupRealtimeFeed();
        this.goToStep(this.currentStep);

        // Resume an in-progress hold countdown after a reload (or expire it if time's up).
        if (this.reservation.holdExpiresAt && this.currentStep >= 2 && this.currentStep < 6) {
            this.startHoldTimer(this.reservation.holdExpiresAt);
        }
    }

    setupRealtimeFeed() {
        if (this.sseSource) this.sseSource.close();
        this.sseSource = new EventSource('/api/bookings/stream');

        this.sseSource.onmessage = async (e) => {
            let event = {};
            try { event = JSON.parse(e.data); } catch { event = { type: e.data }; }

            // Soft refresh the map on Step 1 when bookings/holds change so taken tables
            // (booked OR held by others) update live and can't be selected.
            const mapAffecting = ['update', 'new_booking', 'holds_update'].includes(event.type);
            if (mapAffecting) {
                if (this.currentStep === 1 && this.currentViewInstance && typeof this.currentViewInstance.render === 'function') {
                    await this.currentViewInstance.render(this.container);
                    // The map render is async. If the user advanced past Step 1 while it was
                    // in flight (e.g. they just confirmed a table — which itself triggers a
                    // holds_update broadcast back to us), this stale render would clobber the
                    // new screen and look like a "bounce back to table select". Re-render the
                    // correct step to undo that.
                    if (this.currentStep !== 1) {
                        this.renderStep(this.currentStep);
                    }
                }
            }

            if (event.type === 'update' || event.type === 'new_booking') {
                // If on Step 6 (Confirmation) and we have a booking ID, refresh the status
                if (this.currentStep === 6 && this.reservation.id) {
                    try {
                        const updatedBooking = await client.get(`/bookings/${this.reservation.id}`);
                        if (updatedBooking.status !== this.reservation.status || updatedBooking.paymentStatus !== this.reservation.paymentStatus) {
                            // Update local reservation object
                            this.reservation.status = updatedBooking.status;
                            this.reservation.paymentStatus = updatedBooking.paymentStatus;
                            
                            // Re-render the confirmation screen
                            this.renderStep(6);
                        }
                    } catch (err) {
                        console.error('Failed to refresh booking status', err);
                    }
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
        this.renderHoldBanner();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderStep(step) {
        this.container.innerHTML = '';
        this.currentViewInstance = null;

        switch (step) {
            case 1:
                this.currentViewInstance = new AllZonesTableMap(this.reservation, (zone) => {
                    this.reservation.zone = zone;
                    // Hold was just placed by the map; start the countdown to payment.
                    if (this.reservation.holdExpiresAt) {
                        this.startHoldTimer(this.reservation.holdExpiresAt);
                    }
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

            // Stable per-attempt key so retries (double-tap / flaky network) don't
            // create duplicate bookings. Reused across retries of THIS submission;
            // a fresh booking gets a new key (cleared on success / reset).
            if (!this.reservation.idempotencyKey) {
                this.reservation.idempotencyKey = (crypto.randomUUID && crypto.randomUUID()) ||
                    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
                this.saveToStorage();
            }

            const payload = {
                zoneId: this.reservation.zone.id,
                tableIds: this.reservation.tableIds,
                tableId: this.reservation.tableId,
                idempotencyKey: this.reservation.idempotencyKey,
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
                bookingDate: this.reservation.bookingDate ? new Date(this.reservation.bookingDate + 'T00:00:00').toISOString() : new Date().toISOString(),
                paymentMethod: this.reservation.payment.method,
                sessionId: this.sessionId
            };

            const result = await client.post('/bookings', payload);
            // Booking succeeded — the server consumed our hold; stop the countdown.
            this.stopHoldTimer();
            this.reservation.idempotencyKey = null;
            this.reservation.id = result.id;
            this.reservation.qrCode = result.qrCode;

            // Upload slip if exists
            if (this.reservation.slipFile && this.reservation.payment.method === 'bank_transfer') {
                this.container.querySelector('p').textContent = 'กำลังอัปโหลดสลิป...';
                await fetch(`/api/payments/upload-slip/${result.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slipImage: this.reservation.slipFile })
                });
            }

            this.clearStorage();
            this.goToStep(6);
        } catch (error) {
            const msg = error.message || '';
            // Hold expired (didn't pay in time) — table was released.
            if (msg.includes('หมดเวลา')) {
                this.stopHoldTimer();
                this.clearSelectedTables();
                this.reservation.idempotencyKey = null;
                await showAlert(msg);
                this.goToStep(1);
                return;
            }
            // Table got booked by someone else in the meantime (backend 409 guard).
            // Clear the chosen table and send the user back to the map to pick another.
            if (msg.includes('ถูกจองไปแล้ว')) {
                this.stopHoldTimer();
                this.reservation.idempotencyKey = null;
                await showAlert(msg);
                this.clearSelectedTables();
                this.goToStep(1);
                return;
            }
            await showAlert('เกิดข้อผิดพลาด: ' + msg);
            this.goToStep(5);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
