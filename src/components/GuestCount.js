export default class GuestCount {
    constructor(reservation, onNext, onPrev) {
        this.reservation = reservation;
        this.onNext = onNext;
        this.onPrev = onPrev;
        this.count = reservation.guestCount || 3;
    }

    render(container) {
        container.innerHTML = `
      <div class="guest-count-container animate-fade">
        <button id="btn-back" class="btn btn-ghost" style="margin-bottom: var(--spacing-lg); padding: 10px 20px; font-weight: 700;">
            <span style="margin-right: 8px;">←</span> ย้อนกลับ
        </button>
        
        <div class="glass-card" style="max-width: 580px; margin: 0 auto; text-align: center; padding: var(--spacing-xl);">
          <h2 class="font-heading" style="margin-bottom: var(--spacing-sm); font-size: 2rem;">ระบุจำนวนผู้เข้าใช้</h2>
          <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">สำหรับโซน: <span id="selected-zone-name" style="color: var(--accent-neon); font-weight: 800; font-family: 'Outfit';">${this.reservation.zone.name}</span></p>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 32px; margin-bottom: var(--spacing-xl); background: rgba(255,255,255,0.02); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border);">
            <button id="btn-minus" class="btn btn-ghost guest-counter-btn" style="width: 64px; height: 64px; font-size: 2rem; border-radius: 50%; padding: 0; line-height: 1;">-</button>
            <div style="display: flex; flex-direction: column; align-items: center;">
                <span id="guest-count-display" class="guest-count-display" style="font-size: 5rem; font-weight: 800; min-width: 100px; font-family: 'Outfit', sans-serif; line-height: 1; color: var(--text-main);">${this.count}</span>
                <span style="font-size: 0.9rem; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">GUESTS</span>
            </div>
            <button id="btn-plus" class="btn btn-ghost guest-counter-btn" style="width: 64px; height: 64px; font-size: 2rem; border-radius: 50%; padding: 0; line-height: 1;">+</button>
          </div>

          <div id="recommendation-box" style="margin-bottom: var(--spacing-xl); padding: var(--spacing-lg); border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); min-height: 80px; display: flex; align-items: center; justify-content: center;">
            <!-- Recommendation text goes here -->
          </div>

          <button id="btn-next" class="btn btn-primary" style="width: 100%; height: 60px; font-size: 1.2rem; font-weight: 700;">ยืนยันจำนวนคน</button>
        </div>
      </div>
    `;

        this.updateRecommendation(container);
        this.attachEvents(container);
    }

    attachEvents(container) {
        container.querySelector('#btn-minus').addEventListener('click', () => {
            if (this.count > 2) {
                this.count--;
                this.updateDisplay(container);
            }
        });

        container.querySelector('#btn-plus').addEventListener('click', () => {
            this.count++;
            this.updateDisplay(container);
        });

        container.querySelector('#btn-back').addEventListener('click', () => {
            this.onPrev();
        });

        container.querySelector('#btn-next').addEventListener('click', () => {
            this.reservation.guestCount = this.count;
            this.onNext();
        });
    }

    updateDisplay(container) {
        container.querySelector('#guest-count-display').textContent = this.count;
        this.reservation.guestCount = this.count; // Sync real-time
        this.updateRecommendation(container);
        if (window.app && window.app.saveToStorage) {
            window.app.saveToStorage();
        }
    }

    updateRecommendation(container) {
        const box = container.querySelector('#recommendation-box');
        const { zone } = this.reservation;

        let html = '';

        if (this.count === 2) {
            html = `
        <div style="text-align: center;">
          <p style="color: var(--accent-neon); margin-bottom: 5px; font-weight: 700;">🤝 นโยบายการใช้บริการ 2 ท่าน</p>
          <p style="font-size: 0.85rem; color: var(--text-main);">ทางร้านขออนุญาตจัดลูกค้า Walk-in เข้านั่งร่วมโต๊ะ (Sharing Table) เพื่อให้เป็นไปตามจำนวนขั้นต่ำที่กำหนด</p>
        </div>
      `;
        } else if (this.count <= zone.seats) {
            html = `<p style="color: var(--success);">✅ จำนวนคนที่เหมาะสมสำหรับโซนนี้</p>`;
        } else if (this.count <= zone.seats + 2) {
            html = `
        <p style="color: var(--warning); margin-bottom: 5px;">⚠️ จำนวนคนเกินจำนวนที่นั่งปกติ (${zone.seats} คน)</p>
        <p style="font-size: 0.85rem; color: var(--text-dim);">เราแนะนำให้คุณเลือก "เสริมโต๊ะ" ในขั้นตอนถัดไปเพื่อความสะดวกสบาย</p>
      `;
        } else {
            html = `
        <p style="color: var(--danger); margin-bottom: 5px;">🛑 จำนวนคนเกินขีดจำกัดสูงสุดของโต๊ะเดี่ยว</p>
        <p style="font-size: 0.85rem; color: var(--text-dim);">แนะนำให้จอง VIP หรือจอง 2 โต๊ะแยกกัน กรุณาติดต่อร้านโดยตรง</p>
      `;
        }

        box.innerHTML = html;
    }
}
