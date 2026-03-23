export default class Confirmation {
  constructor(reservation) {
    this.reservation = reservation;
    this.pollingInterval = null;
  }

  render(container) {
    const { customer, zone, table, guestCount, extraTable, payment, qrCode, id } = this.reservation;

    const isPaid = this.reservation.paymentStatus === 'paid' || this.reservation.status === 'confirmed';
    const isPendingVerification = this.reservation.paymentStatus === 'pending_verification';
    const isRejected = this.reservation.paymentStatus === 'slip_rejected';
    const isFree = payment.method === 'none' || payment.depositAmount === 0;
    const rejectReason = this.reservation.slipRejectReason || 'สลิปไม่ถูกต้อง';

    let statusIcon, statusColor, statusGlow, headingText, subText;

    if (isPaid) {
      statusIcon = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      statusColor = 'var(--success)';
      statusGlow = 'rgba(50, 215, 75, 0.4)';
      headingText = 'จองและชำระเงินสำเร็จ!';
      subText = 'แอดมินยืนยันการชำระเงินเรียบร้อยแล้ว เตรียมตัวมาสนุกกันได้เลย!';
    } else if (isRejected) {
      statusIcon = '<i data-lucide="x" style="width: 40px; height: 40px; color: white;"></i>';
      statusColor = '#ef4444';
      statusGlow = 'rgba(239, 68, 68, 0.4)';
      headingText = 'สลิปถูกปฏิเสธ';
      subText = 'กรุณาตรวจสอบและส่งสลิปใหม่อีกครั้ง';
    } else if (isPendingVerification) {
      statusIcon = '<i data-lucide="clock" style="width: 40px; height: 40px; color: white;"></i>';
      statusColor = '#f59e0b';
      statusGlow = 'rgba(245, 158, 11, 0.4)';
      headingText = 'รอแอดมินตรวจสลิป';
      subText = 'เราได้รับสลิปของคุณแล้ว แอดมินจะตรวจสอบและยืนยันการจองโดยเร็วที่สุด';
    } else if (isFree) {
      statusIcon = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      statusColor = 'var(--success)';
      statusGlow = 'rgba(50, 215, 75, 0.4)';
      headingText = 'จองโต๊ะสำเร็จ!';
      subText = 'ไม่มีค่าใช้จ่าย รับโต๊ะก่อน 21:00 น. หลังจากนั้นระบบจะยกเลิกอัตโนมัติ';
    } else {
      statusIcon = '<i data-lucide="loader" class="spin" style="width: 40px; height: 40px; color: white;"></i>';
      statusColor = 'var(--accent-gold)';
      statusGlow = 'rgba(215, 180, 50, 0.4)';
      headingText = 'รอการยืนยัน...';
      subText = 'กำลังรอการตรวจสอบ';
    }

    const slipImageUrl = this.reservation.slipImageUrl || this.reservation.slipFile;

    container.innerHTML = `
      <div class="confirmation-container animate-fade" style="text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="width: 80px; height: 80px; background: ${statusColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--spacing-lg); box-shadow: 0 0 30px ${statusGlow}; border: 4px solid rgba(255,255,255,0.1);">
          ${statusIcon}
        </div>

        <h1 class="font-heading confirmation-heading" style="margin-bottom: var(--spacing-xs); font-size: 2.5rem;">
          ${headingText}
        </h1>
        <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">${subText}</p>

        ${isRejected ? `
        <div style="padding: 16px 20px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.4); border-radius: var(--radius-md); margin-bottom: var(--spacing-xl); text-align: left;">
          <div style="font-weight: 700; color: #ef4444; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="alert-circle" style="width: 16px; height: 16px;"></i> เหตุผลที่ถูกปฏิเสธ
          </div>
          <p style="color: #fca5a5; margin: 0 0 16px; font-size: 0.95rem;">${rejectReason}</p>
          <div style="border-top: 1px solid rgba(239,68,68,0.3); padding-top: 16px;">
            <p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: 12px;">อัปโหลดสลิปใหม่:</p>
            <div id="reupload-area" style="border: 2px dashed rgba(239,68,68,0.5); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; position: relative;">
              <input type="file" id="reupload-input" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;">
              <div id="reupload-placeholder">
                <i data-lucide="upload-cloud" style="width: 28px; height: 28px; color: #ef4444; margin-bottom: 8px;"></i>
                <p style="color: #ef4444; font-size: 0.85rem; margin: 0;">คลิกเพื่อเลือกสลิปใหม่</p>
              </div>
              <div id="reupload-preview" style="display:none;">
                <img id="reupload-img" style="max-width:100%;max-height:150px;border-radius:4px;object-fit:contain;">
                <p id="reupload-filename" style="font-size:0.75rem;color:var(--text-dim);margin:6px 0 0;"></p>
              </div>
            </div>
            <button id="btn-resubmit-slip" style="width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:var(--radius-md);font-size:0.95rem;font-weight:700;cursor:pointer;" disabled>
              ส่งสลิปใหม่
            </button>
          </div>
        </div>
        ` : ''}

        ${isPendingVerification ? `
        <div style="padding: 16px 20px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); margin-bottom: var(--spacing-xl); display: flex; align-items: flex-start; gap: 12px; text-align: left;">
          <i data-lucide="info" style="width: 18px; height: 18px; color: #f59e0b; flex-shrink: 0; margin-top: 2px;"></i>
          <span style="color: #f59e0b; font-size: 0.9rem; line-height: 1.5;">หน้านี้จะอัปเดตสถานะอัตโนมัติเมื่อแอดมินยืนยันการชำระเงิน คุณสามารถออกจากหน้านี้ได้โดยไม่สูญเสียข้อมูล</span>
        </div>
        ` : ''}

        ${slipImageUrl && !isPaid ? `
        <div class="glass-card" style="padding: var(--spacing-lg); margin-bottom: var(--spacing-xl); text-align: left;">
          <p class="font-heading" style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: var(--spacing-md); text-transform: uppercase; letter-spacing: 0.1em;">สลิปที่ส่งมา</p>
          <img src="${slipImageUrl}" style="max-width: 100%; border-radius: var(--radius-sm); display: block; margin: 0 auto;" alt="สลิปโอนเงิน">
        </div>
        ` : ''}

        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: var(--spacing-xl); border-color: ${isPaid ? 'var(--success)' : (isPendingVerification ? '#f59e0b' : 'var(--glass-border)')  };">
          <div style="background: linear-gradient(90deg, ${isPaid ? 'var(--success), #28a745' : (isPendingVerification ? '#f59e0b, #d97706' : 'var(--primary), var(--secondary)')}); padding: 12px; color: white; font-weight: 800; font-family: 'Outfit'; letter-spacing: 0.1em; font-size: 0.8rem;">
            CHECK-IN QR CODE
          </div>
          <div style="padding: 32px; background: white; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div id="qr-code-placeholder" style="padding: 12px; border: 2px dashed #ddd; border-radius: 16px;">
               <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCode || 'NO-QR-CODE'}" alt="QR Code" style="display: block; width: 200px; height: 200px;">
            </div>
            <p style="color: #666; font-size: 0.8rem; font-weight: 600;">Booking ID: #${id ? id.toString().padStart(4, '0') : 'N/A'}</p>
          </div>
          <div style="padding: var(--spacing-xl); text-align: left; background: var(--bg-surface); border-top: 1px solid var(--glass-border);">
            <p class="font-heading" style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: var(--spacing-md); text-transform: uppercase; letter-spacing: 0.1em;">สรุปรายการจอง</p>
            <div class="confirmation-summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 1rem;">
              <div style="display: flex; align-items: center; gap: 10px; grid-column: span 2; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                <i data-lucide="calendar" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">DATE / วันที่จอง</div>
                  <strong style="font-family: 'Outfit'; color: var(--accent-neon);">${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <i data-lucide="map-pin" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">ZONE / โซน</div>
                  <strong style="font-family: 'Outfit';">${zone.name}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <i data-lucide="armchair" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">TABLE / โต๊ะ</div>
                  <strong style="font-family: 'Outfit';">No. ${table ? table.number : 'N/A'}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; grid-column: span 2;">
                <i data-lucide="users" style="width: 20px; height: 20px; color: var(--accent-gold);"></i>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">GUESTS / จำนวนคน</div>
                  <strong style="font-family: 'Outfit';">${guestCount} ท่าน</strong>
                </div>
              </div>
              <div style="grid-column: span 2; margin-top: 8px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border-left: 3px solid ${extraTable ? 'var(--accent-neon)' : 'var(--text-dim)'};">
                ${extraTable ? '<span style="color: var(--accent-neon); font-weight: 700; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> เสริมโต๊ะ (+1 Table Added)</span>' : '<span style="color: var(--text-dim); font-weight: 500; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="x-circle" style="width: 16px; height: 16px;"></i> ไม่มีการเสริมโต๊ะ</span>'}
              </div>
            </div>

            <div style="margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="color: var(--text-dim); display: block; font-size: 0.8rem;">ยอดเงินที่ชำระ</span>
                <span style="color: ${isPaid ? 'var(--success)' : (isPendingVerification ? '#f59e0b' : 'var(--text-dim)')}; font-size: 0.8rem;">${isPaid ? '✓ ยืนยันแล้ว' : (isPendingVerification ? '⏳ รอตรวจสอบ' : (isFree ? 'ฟรี' : 'รอชำระ'))}</span>
              </div>
              <span style="color: ${isPaid ? 'var(--success)' : 'var(--text-main)'}; font-weight: 800; font-size: 1.75rem; font-family: 'Outfit';">
                ${payment.depositAmount === 0 ? 'ฟรี' : `฿${payment.depositAmount.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        <div class="confirmation-actions" style="display: flex; gap: var(--spacing-md); margin-bottom: 40px;">
          <button class="btn btn-ghost" style="flex: 1; height: 56px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="if(window.app){ window.app.reservation = window.app.getDefaultReservation(); window.app.goToStep(1); } else { window.location.reload(); }">
            <i data-lucide="refresh-cw" style="width: 18px; height: 18px;"></i> เริ่มใหม่
          </button>
          <button class="btn btn-primary" style="flex: 1; height: 56px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.location.href='/'">
            <i data-lucide="home" style="width: 18px; height: 18px;"></i> กลับหน้าแรก
          </button>
        </div>
      </div>

      <style>
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      </style>
    `;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    if (isRejected) {
      this.attachReuploadEvents(container);
    }

    if (!isPaid && this.reservation.id) {
      this.startPolling();
    }
  }

  attachReuploadEvents(container) {
    const input = container.querySelector('#reupload-input');
    const placeholder = container.querySelector('#reupload-placeholder');
    const preview = container.querySelector('#reupload-preview');
    const img = container.querySelector('#reupload-img');
    const filename = container.querySelector('#reupload-filename');
    const btnSubmit = container.querySelector('#btn-resubmit-slip');
    let newSlipData = null;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        newSlipData = ev.target.result;
        placeholder.style.display = 'none';
        preview.style.display = '';
        img.src = newSlipData;
        filename.textContent = file.name;
        btnSubmit.disabled = false;
      };
      reader.readAsDataURL(file);
    });

    btnSubmit.addEventListener('click', async () => {
      if (!newSlipData) return;
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'กำลังส่ง...';
      try {
        const response = await fetch(`/api/payments/upload-slip/${this.reservation.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slipImage: newSlipData })
        });
        if (!response.ok) throw new Error('ส่งสลิปไม่สำเร็จ');
        this.reservation.paymentStatus = 'pending_verification';
        this.reservation.slipFile = newSlipData;
        this.reservation.slipRejectReason = null;
        if (window.app && window.app.saveToStorage) window.app.saveToStorage();
        this.render(container.closest('#step-content') || container);
      } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'ส่งสลิปใหม่';
      }
    });
  }

  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/check-status/${this.reservation.id}`);
        if (!response.ok) return;

        const data = await response.json();

        if (data.paymentStatus !== this.reservation.paymentStatus || data.status !== this.reservation.status) {
          if (data.paymentStatus === 'paid' || data.status === 'confirmed') {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
          }

          this.reservation.status = data.status;
          this.reservation.paymentStatus = data.paymentStatus;
          if (data.slipRejectReason) this.reservation.slipRejectReason = data.slipRejectReason;

          if (window.app && window.app.saveToStorage) {
            window.app.saveToStorage();
          }

          this.render(document.querySelector('#step-content'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  }

  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
