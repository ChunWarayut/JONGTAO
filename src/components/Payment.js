export default class Payment {
  constructor(reservation, onNext, onPrev) {
    this.reservation = reservation;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.depositPercent = 100;
  }

  render(container) {
    const { zone, extraTable, specialDate } = this.reservation;

    // Every table in the booking carries the zone's minimum spend.
    const tableCount = this.reservation.tableCount || this.reservation.tableIds?.length || 1;

    let isFeeRequired = window.appConfig?.isBookingFeeRequired ?? true;
    let totalMinSpend = zone.minSpend * tableCount + (extraTable ? zone.extraTableCost : 0);
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
          // The event's fixed price is per table, so it scales with the booking too.
          depositAmount = (specialDate.depositAmount || 0) * tableCount;
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
      isFeeRequired = false;
      totalMinSpend = 0;
      depositAmount = 0;
      priceNote = '<span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="gift" style="width: 16px; height: 16px;"></i> วันนี้เข้าฟรี ไม่ต้องวางเงินล่วงหน้า</span>';
    }

    const config = window.appConfig || {};
    const bankName = config.bankName || '';
    const bankAccountNumber = config.bankAccountNumber || '';
    const bankAccountName = config.bankAccountName || '';
    const promptPayNumber = config.promptPayNumber || '';

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
            ${priceNote ? `
              <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: rgba(124, 58, 237, 0.15); border: 2px solid var(--primary); border-radius: var(--radius-md); font-weight: 600;">
                ${priceNote}
              </div>
            ` : ''}
            ${isFeeRequired ? `
            <div style="margin-bottom: var(--spacing-xl);">
              <label class="font-heading" style="display: block; margin-bottom: var(--spacing-sm); font-size: 1.1rem;">ช่องทางการโอนเงิน</label>

              ${(bankName || bankAccountNumber) ? `
              <div style="padding: var(--spacing-lg); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <i data-lucide="landmark" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                  <span style="font-weight: 700; font-size: 1rem;">โอนผ่านธนาคาร</span>
                </div>
                <div style="display: grid; gap: 6px; font-size: 0.9rem;">
                  ${bankName ? `<div style="display: flex; justify-content: space-between;"><span style="color: var(--text-dim);">ธนาคาร</span><span style="font-weight: 600;">${bankName}</span></div>` : ''}
                  ${bankAccountNumber ? `<div style="display: flex; justify-content: space-between; align-items: center;"><span style="color: var(--text-dim);">เลขบัญชี</span><span style="font-weight: 800; font-family: 'Outfit'; font-size: 1.05rem; color: var(--accent-neon);">${bankAccountNumber}</span></div>` : ''}
                  ${bankAccountName ? `<div style="display: flex; justify-content: space-between;"><span style="color: var(--text-dim);">ชื่อบัญชี</span><span style="font-weight: 600;">${bankAccountName}</span></div>` : ''}
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--glass-border);">
                    <span style="color: var(--text-dim);">จำนวนเงิน</span>
                    <span style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit'; color: var(--accent-gold);">฿${depositAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              ` : ''}

              ${promptPayNumber ? `
              <div style="padding: var(--spacing-lg); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <i data-lucide="smartphone" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                  <span style="font-weight: 700; font-size: 1rem;">PromptPay</span>
                </div>
                <div style="display: grid; gap: 6px; font-size: 0.9rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-dim);">เบอร์/เลขบัตร</span>
                    <span style="font-weight: 800; font-family: 'Outfit'; font-size: 1.05rem; color: var(--accent-neon);">${promptPayNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--glass-border);">
                    <span style="color: var(--text-dim);">จำนวนเงิน</span>
                    <span style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit'; color: var(--accent-gold);">฿${depositAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              ` : ''}

              ${(!bankName && !bankAccountNumber && !promptPayNumber) ? `
              <div style="padding: var(--spacing-lg); background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
                <p style="color: #fbbf24; font-size: 0.9rem; margin: 0;">ยังไม่ได้ตั้งค่าข้อมูลบัญชีธนาคาร กรุณาติดต่อแอดมิน</p>
              </div>
              ` : ''}

              <div style="margin-top: var(--spacing-lg);">
                <label class="font-heading" style="display: block; margin-bottom: var(--spacing-sm); font-size: 1rem;">อัปโหลดสลิปการโอนเงิน <span style="color: var(--danger);">*</span></label>
                <div id="slip-upload-area" style="border: 2px dashed var(--glass-border); border-radius: var(--radius-md); padding: var(--spacing-xl); text-align: center; cursor: pointer; transition: all 0.3s ease; position: relative;">
                  <input type="file" id="slip-file-input" accept="image/*" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;">
                  <div id="slip-upload-placeholder">
                    <i data-lucide="upload-cloud" style="width: 40px; height: 40px; color: var(--text-dim); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin: 0;">คลิกหรือลากไฟล์มาวางที่นี่</p>
                    <p style="color: var(--text-dim); font-size: 0.75rem; margin: 4px 0 0;">รองรับ JPG, PNG (ไม่เกิน 5MB)</p>
                  </div>
                  <div id="slip-preview" style="display: none;">
                    <img id="slip-preview-img" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-sm); object-fit: contain;">
                    <p id="slip-filename" style="font-size: 0.8rem; color: var(--text-dim); margin-top: 8px;"></p>
                    <button id="btn-remove-slip" style="font-size: 0.75rem; color: var(--danger); background: none; border: none; cursor: pointer; margin-top: 4px;">ลบและเลือกใหม่</button>
                  </div>
                </div>
              </div>
            </div>
            ` : `
            <div style="text-align: center; padding: var(--spacing-xl) 0;">
                <h3 style="color: var(--success); font-size: 1.5rem; margin-bottom: var(--spacing-sm); display: flex; align-items: center; justify-content: center; gap: 8px;"><i data-lucide="party-popper" style="width: 28px; height: 28px;"></i> จองฟรี ไม่มีค่าใช้จ่าย!</h3>
                <p style="color: var(--text-dim); margin-bottom: var(--spacing-md);">ไม่ต้องชำระค่ามัดจำหรือค่าเปิดโต๊ะ กดยืนยันการจองได้เลยทันที</p>
                <div style="display: inline-flex; align-items: flex-start; gap: 8px; padding: 10px 16px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: var(--radius-md); text-align: left; max-width: 360px;">
                  <i data-lucide="clock-alert" style="width: 16px; height: 16px; color: #fbbf24; margin-top: 2px; flex-shrink: 0;"></i>
                  <span style="color: #fbbf24; font-size: 0.85rem; line-height: 1.5;">รับโต๊ะก่อน 21:00 น. — หลัง 21:00 น. ระบบจะยกเลิกโต๊ะโดยอัตโนมัติ</span>
                </div>
            </div>
            `}
          </div>

          <!-- Price Summary -->
          <div class="glass-card" style="border-color: var(--primary); padding: var(--spacing-xl); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; right: 0; padding: 8px 16px; background: var(--primary); color: white; font-size: 0.7rem; font-weight: 800; border-bottom-left-radius: var(--radius-md);">BILLING SUMMARY</div>

            <h3 class="font-heading" style="margin-bottom: var(--spacing-xl); font-size: 1.5rem;">สรุปยอดชำระ</h3>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: var(--spacing-xl); font-size: 0.95rem;">
              <div style="display: flex; justify-content: space-between; color: var(--text-dim);">
                <span>ยอดรวมการจอง (Total Bill)</span>
                <span style="font-weight: 700;">฿${totalMinSpend.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 800; color: var(--accent-neon); margin-top: var(--spacing-sm); border-top: 1px solid var(--glass-border); padding-top: var(--spacing-lg); font-size: 1.25rem;">
                <span class="font-heading">ยอดที่ต้องโอน</span>
                <span style="font-family: 'Outfit';">฿${depositAmount.toLocaleString()}</span>
              </div>
            </div>

            ${isFeeRequired ? `
            <div style="background: rgba(255, 255, 255, 0.03); padding: var(--spacing-md); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--text-dim); margin-bottom: var(--spacing-xl); line-height: 1.6;">
              📋 โอนเงินแล้วอย่าลืมอัปโหลดสลิป แอดมินจะตรวจสอบและยืนยันการจองของคุณ
            </div>
            ` : ''}

            <button id="btn-submit" class="btn btn-primary" style="width: 100%; height: 60px; font-size: 1.25rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);">
              ${isFeeRequired ? 'ส่งสลิปและยืนยันการจอง' : 'ยืนยันการจอง'}
            </button>
          </div>
        </div>
      </div>

      <style>
        #slip-upload-area:hover { border-color: var(--primary); background: rgba(124, 58, 237, 0.05); }
        #slip-upload-area.has-file { border-color: var(--success); border-style: solid; background: rgba(50, 215, 75, 0.05); }
      </style>
    `;

    this.attachEvents(container, totalMinSpend, depositAmount, isFeeRequired);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  attachEvents(container, totalMinSpend, depositAmount, isFeeRequired) {
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

    if (isFeeRequired) {
      const fileInput = container.querySelector('#slip-file-input');
      const uploadArea = container.querySelector('#slip-upload-area');
      const placeholder = container.querySelector('#slip-upload-placeholder');
      const preview = container.querySelector('#slip-preview');
      const previewImg = container.querySelector('#slip-preview-img');
      const filename = container.querySelector('#slip-filename');
      const btnRemove = container.querySelector('#btn-remove-slip');

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.handleSlipFile(file, uploadArea, placeholder, preview, previewImg, filename);
      });

      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        this.reservation.slipFile = null;
        uploadArea.classList.remove('has-file');
        placeholder.style.display = '';
        preview.style.display = 'none';
      });
    }

    container.querySelector('#btn-submit').addEventListener('click', () => {
      if (isFeeRequired && !this.reservation.slipFile) {
        alert('กรุณาอัปโหลดสลิปการโอนเงินก่อน');
        return;
      }

      this.reservation.payment = {
        method: isFeeRequired ? 'bank_transfer' : 'none',
        depositPercent: this.depositPercent,
        depositAmount: depositAmount,
        totalAmount: totalMinSpend
      };

      if (window.app && window.app.saveToStorage) {
        window.app.saveToStorage();
      }

      this.onNext();
    });
  }

  handleSlipFile(file, uploadArea, placeholder, preview, previewImg, filename) {
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.reservation.slipFile = e.target.result; // base64 data URL
      uploadArea.classList.add('has-file');
      placeholder.style.display = 'none';
      preview.style.display = '';
      previewImg.src = e.target.result;
      filename.textContent = file.name;
    };
    reader.readAsDataURL(file);
  }
}
