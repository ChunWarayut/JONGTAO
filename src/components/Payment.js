export default class Payment {
  constructor(reservation, onNext, onPrev) {
    this.reservation = reservation;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.depositPercent = 100; // Always pay full amount
  }

  render(container) {
    const { zone, extraTable, specialDate } = this.reservation;

    // Calculate based on special date if exists
    let isFeeRequired = window.appConfig?.isBookingFeeRequired ?? true;
    let totalMinSpend = zone.minSpend + (extraTable ? zone.extraTableCost : 0);
    let depositAmount = 0;
    let priceNote = '';

    if (specialDate && specialDate.isActive) {
      switch (specialDate.priceType) {
        case 'free':
          isFeeRequired = false;
          totalMinSpend = 0;
          depositAmount = 0;
          priceNote = '<span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="party-popper" style="width: 16px; height: 16px;"></i> วันนี้เข้าฟรี!</span>';
          break;
        case 'full':
          isFeeRequired = true;
          depositAmount = totalMinSpend;
          this.depositPercent = 100;
          priceNote = '<span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i> วันพิเศษ: จ่ายเต็มจำนวนเท่านั้น</span>';
          break;
        case 'custom':
          isFeeRequired = true;
          depositAmount = specialDate.depositAmount || 0;
          totalMinSpend = depositAmount;
          this.depositPercent = 100;
          priceNote = `<span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="credit-card" style="width: 16px; height: 16px;"></i> วันพิเศษ: ${specialDate.name}</span>`;
          break;
        case 'normal':
        default:
          isFeeRequired = true;
          depositAmount = (totalMinSpend * this.depositPercent) / 100;
          priceNote = '<span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="banknote" style="width: 16px; height: 16px;"></i> ราคาปกติตามโซน</span>';
          break;
      }
    } else {
      depositAmount = isFeeRequired ? (totalMinSpend * this.depositPercent) / 100 : 0;
    }

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
            <p style="color: var(--text-dim); margin-bottom: var(--spacing-md); font-weight: 500;">เลือกรูปแบบและช่องทางการชำระเงินที่ต้องการ</p>
            ${priceNote ? `
              <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: rgba(124, 58, 237, 0.15); border: 2px solid var(--primary); border-radius: var(--radius-md); font-weight: 600;">
                ${priceNote}
              </div>
            ` : ''}
            ${isFeeRequired ? `
            <div style="margin-bottom: var(--spacing-xl);">
              <label class="font-heading" style="display: block; margin-bottom: var(--spacing-md); font-size: 1.1rem;">ยอดชำระทั้งหมด</label>
              <div class="payment-type-grid" style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-md);">
                <div class="payment-option active" data-percent="100">
                  <p style="font-size: 0.85rem; color: var(--text-dim); font-weight: 600;">ชำระเต็มจำนวน / Full Payment (100%)</p>
                  <p style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit';">฿${depositAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div style="margin-bottom: var(--spacing-xl);">
              <label class="font-heading" style="display: block; margin-bottom: var(--spacing-md); font-size: 1.1rem;">ช่องทางการชำระ (Payment Method)</label>
              <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                <label class="method-card">
                  <input type="radio" name="method" value="promptpay" checked>
                  <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                    <img src="/src/assets/promptpay-logo.png" alt="PromptPay" style="height: 24px;">
                    <span style="font-weight: 600;">Thai QR PromptPay</span>
                  </div>
                  <div class="check-icon"></div>
                </label>
              </div>
            </div>
            ` : `
            <div style="text-align: center; padding: var(--spacing-xl) 0;">
                <h3 style="color: var(--success); font-size: 1.5rem; margin-bottom: var(--spacing-sm); display: flex; align-items: center; justify-content: center; gap: 8px;"><i data-lucide="party-popper" style="width: 28px; height: 28px;"></i> วันนี้จองฟรี!</h3>
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
              <div style="display: flex; justify-content: space-between; font-weight: 800; color: var(--accent-neon); margin-top: var(--spacing-sm); border-top: 1px solid var(--glass-border); padding-top: var(--spacing-lg); font-size: 1.25rem;">
                <span class="font-heading">ยอดชำระทั้งหมด</span>
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
          border: 2px solid var(--primary);
          border-radius: var(--radius-md);
          text-align: center;
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

    this.attachEvents(container, totalMinSpend, depositAmount);

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  attachEvents(container, totalMinSpend, depositAmount) {
    const { zone, extraTable } = this.reservation;

    // No need for payment option click handlers - always 100%

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
        depositAmount: depositAmount,
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
