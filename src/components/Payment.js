export default class Payment {
  constructor(reservation, onNext, onPrev) {
    this.reservation = reservation;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.depositPercent = 30; // Default 30%
  }

  render(container) {
    const { zone, extraTable } = this.reservation;
    const isFeeRequired = window.appConfig?.isBookingFeeRequired ?? true;
    const totalMinSpend = isFeeRequired ? zone.minSpend + (extraTable ? zone.extraTableCost : 0) : 0;
    const depositAmount = isFeeRequired ? (totalMinSpend * this.depositPercent) / 100 : 0;

    container.innerHTML = `
      <div class="payment-container animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
          <button id="btn-back" class="btn btn-ghost" style="padding: 10px 20px; font-weight: 700;">
            <span style="margin-right: 8px;">←</span> ย้อนกลับ
          </button>
          <button id="btn-cancel-checkout" class="btn btn-outline" style="padding: 8px 16px; font-size: 0.85rem; font-weight: 700; border-color: var(--danger); color: var(--danger);">
            เริ่มใหม่
          </button>
        </div>
        
        <div class="resp-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-xl); align-items: start;">
          <div class="glass-card" style="padding: var(--spacing-xl);">
            <h2 class="font-heading" style="margin-bottom: var(--spacing-md); font-size: 2rem;">ชำระเงิน / Payment</h2>
            <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">เลือกรูปแบบและช่องทางการชำระเงินที่ต้องการ</p>
            ${isFeeRequired ? `
            <div style="margin-bottom: var(--spacing-xl);">
              <label class="font-heading" style="display: block; margin-bottom: var(--spacing-md); font-size: 1.1rem;">รูปแบบการชำระเงิน</label>
              <div class="payment-type-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="payment-option ${this.depositPercent === 30 ? 'active' : ''}" data-percent="30">
                  <p style="font-size: 0.85rem; color: var(--text-dim); font-weight: 600;">มัดจำ / Deposit (30%)</p>
                  <p style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit';">฿${((totalMinSpend * 30) / 100).toLocaleString()}</p>
                </div>
                <div class="payment-option ${this.depositPercent === 100 ? 'active' : ''}" data-percent="100">
                  <p style="font-size: 0.85rem; color: var(--text-dim); font-weight: 600;">ชำระเต็ม / Full (100%)</p>
                  <p style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit';">฿${totalMinSpend.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div style="margin-bottom: var(--spacing-xl);">
              <label class="font-heading" style="display: block; margin-bottom: var(--spacing-md); font-size: 1.1rem;">ช่องทางการชำระ (Payment Method)</label>
              <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                <label class="method-card">
                  <input type="radio" name="method" value="promptpay" checked>
                  <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay_logo.png" alt="PromptPay" style="height: 24px;">
                    <span style="font-weight: 600;">Thai QR PromptPay</span>
                  </div>
                  <div class="check-icon"></div>
                </label>
                <label class="method-card">
                  <input type="radio" name="method" value="bank">
                  <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                    <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">🏦</div>
                    <span style="font-weight: 600;">Mobile Banking (โอนเงิน)</span>
                  </div>
                  <div class="check-icon"></div>
                </label>
                <label class="method-card">
                  <input type="radio" name="method" value="credit">
                  <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                    <div style="width: 24px; height: 24px; background: var(--secondary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">💳</div>
                    <span style="font-weight: 600;">Credit / Debit Card</span>
                  </div>
                  <div class="check-icon"></div>
                </label>
              </div>
            </div>
            ` : `
            <div style="text-align: center; padding: var(--spacing-xl) 0;">
                <h3 style="color: var(--success); font-size: 1.5rem; margin-bottom: var(--spacing-sm);">วันนี้จองฟรี! 🎉</h3>
                <p style="color: var(--text-dim);">ไม่ต้องชำระค่ามัดจำหรือค่าเปิดโต๊ะ กดยืนยันการจองได้เลยทันที</p>
                <!-- Hidden input to pass validation -->
                <input type="radio" name="method" value="none" checked style="display:none;">
            </div>
            `}
          </div>

          <!-- Price Summary Detail -->
          <div class="glass-card" style="border-color: var(--primary); padding: var(--spacing-xl); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; right: 0; padding: 8px 16px; background: var(--primary); color: white; font-size: 0.7rem; font-weight: 800; border-bottom-left-radius: var(--radius-md);">BILLING SUMMARY</div>
            
            <h3 class="font-heading" style="margin-bottom: var(--spacing-xl); font-size: 1.5rem;">สรุปยอดชำระ</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: var(--spacing-xl); font-size: 0.95rem;">
              <div style="display: flex; justify-content: space-between; color: var(--text-dim);">
                <span>ยอดรวมการจอง (Total Bill)</span>
                <span style="font-weight: 700;">฿${totalMinSpend.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: var(--text-dim);">
                <span>รูปแบบการชำระ (${this.depositPercent}%)</span>
                <span style="font-weight: 700;">${this.depositPercent === 30 ? 'มัดจำ' : 'เต็มจำนวน'}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; font-weight: 800; color: var(--accent-neon); margin-top: var(--spacing-sm); border-top: 1px solid var(--glass-border); padding-top: var(--spacing-lg); font-size: 1.25rem;">
                <span class="font-heading">ยอดโอนสุทธิ</span>
                <span id="final-amount" style="font-family: 'Outfit';">฿${depositAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.03); padding: var(--spacing-md); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--text-dim); margin-bottom: var(--spacing-xl); line-height: 1.6;">
              ⚠️ เมื่อคลิกจองแล้ว ท่านจะได้รับคิวอาร์โค้ดสำหรับชำระเงิน กรุณาชำระภายใน 10 นาทีเพื่อรักษาสิทธิ์การจอง
            </div>
            
            <button id="btn-submit" class="btn btn-primary" style="width: 100%; height: 60px; font-size: 1.25rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);">
              ยืนยันและรับ QR Code
            </button>
          </div>
        </div>
      </div>

      <style>
        .payment-option {
          padding: 20px;
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
          background: rgba(255,255,255,0.02);
        }
        .payment-option:hover { border-color: var(--primary); background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .payment-option.active { 
          border-color: var(--primary); 
          background: rgba(124, 58, 237, 0.1); 
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
          position: relative;
        }
        .payment-option.active::after {
          content: '✓';
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px var(--primary);
        }
        
        .method-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 18px 22px;
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.02);
        }
        .method-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        .method-card input { display: none; }
        .method-card input:checked + div + .check-icon::before {
          content: '';
          display: block;
          width: 12px;
          height: 12px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--primary);
        }
        .check-icon {
          width: 22px;
          height: 22px;
          border: 2px solid var(--glass-border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .method-card:has(input:checked) {
          border-color: var(--primary);
          background: rgba(124, 58, 237, 0.05);
        }
        .method-card:has(input:checked) .check-icon {
          border-color: var(--primary);
        }
      </style>
    `;

    this.attachEvents(container);
  }

  attachEvents(container) {
    const options = container.querySelectorAll('.payment-option');
    const finalAmount = container.querySelector('#final-amount');
    const { zone, extraTable } = this.reservation;
    const isFeeRequired = window.appConfig?.isBookingFeeRequired ?? true;
    const totalMinSpend = isFeeRequired ? zone.minSpend + (extraTable ? zone.extraTableCost : 0) : 0;

    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.depositPercent = parseInt(opt.getAttribute('data-percent'));
        const amount = (totalMinSpend * this.depositPercent) / 100;
        finalAmount.textContent = `฿${amount.toLocaleString()}`;
      });
    });

    container.querySelector('#btn-back').addEventListener('click', () => {
      this.onPrev();
    });

    const btnCancel = container.querySelector('#btn-cancel-checkout');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (window.app && window.app.resetBookingFlow) {
          window.app.resetBookingFlow();
        }
      });
    }

    container.querySelector('#btn-submit').addEventListener('click', () => {
      const selectedMethod = container.querySelector('input[name="method"]:checked');
      if (!selectedMethod) return;

      const method = selectedMethod.value;
      this.reservation.payment = {
        method,
        depositPercent: this.depositPercent,
        depositAmount: (totalMinSpend * this.depositPercent) / 100,
        totalAmount: totalMinSpend
      };

      if (window.app && window.app.saveToStorage) {
        window.app.saveToStorage();
      }

      // If method is promptpay, we handle it specially in main.js
      // But we can also trigger a loading state here if needed
      this.onNext();
    });
  }
}
