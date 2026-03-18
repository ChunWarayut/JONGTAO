export default class Confirmation {
  constructor(reservation) {
    this.reservation = reservation;
    this.pollingInterval = null;
  }

  render(container) {
    const { customer, zone, table, guestCount, extraTable, payment, qrCode, id } = this.reservation;

    const isPaid = this.reservation.paymentStatus === 'paid' || this.reservation.status === 'confirmed';
    const isFailed = this.reservation.paymentStatus === 'failed';

    container.innerHTML = `
      <div class="confirmation-container animate-fade" style="text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="width: 80px; height: 80px; background: ${isPaid ? 'var(--success)' : (isFailed ? 'var(--danger)' : 'var(--accent-gold)')}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--spacing-lg); box-shadow: 0 0 30px ${isPaid ? 'rgba(50, 215, 75, 0.4)' : (isFailed ? 'rgba(215, 50, 75, 0.4)' : 'rgba(215, 180, 50, 0.4)')}; border: 4px solid rgba(255,255,255,0.1);">
          ${isPaid ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : (isFailed ? '<i data-lucide="x" style="width: 40px; height: 40px; color: white;"></i>' : '<i data-lucide="loader" class="spin" style="width: 40px; height: 40px; color: white;"></i>')}
        </div>
        
        <h1 class="font-heading confirmation-heading" style="margin-bottom: var(--spacing-xs); font-size: 2.5rem;">
          ${isPaid ? 'จองและชำระเงินสำเร็จ!' : (isFailed ? 'การชำระเงินไม่สำเร็จ' : (payment.method === 'promptpay' ? 'รอการยืนยันเงินเข้า...' : 'จองโต๊ะสำเร็จ!'))}
        </h1>
        <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">
          ${isPaid 
            ? 'ได้รับยอดเงินเรียบร้อยแล้ว เตรียมตัวมาสนุกกันได้เลย!' 
            : (isFailed
              ? 'เกิดข้อผิดพลาดในการชำระเงิน กรุณาติดต่อทางร้าน'
              : (payment.method === 'promptpay'
                ? 'เรากำลังรอยืนยันยอดเงินจาก Stripe... เมื่อสำเร็จ ระบบจะอัปเดตสถานะทันที'
                : `รายละเอียดถูกส่งไปที่ Line ID: <span style="color: var(--accent-neon); font-weight: 700;">${customer.lineId || 'N/A'}</span>`))}
        </p>

        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: var(--spacing-xl); border-color: var(--success);">
          <div style="background: linear-gradient(90deg, var(--success), #28a745); padding: 12px; color: white; font-weight: 800; font-family: 'Outfit'; letter-spacing: 0.1em; font-size: 0.8rem;">
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
                <span style="color: var(--text-dim); display: block; font-size: 0.8rem;">ยอดเงินที่ชำระล่วงหน้า</span>
                <span style="color: var(--text-main); font-size: 0.8rem;">(PAID DEPOSIT)</span>
              </div>
              <span style="color: var(--success); font-weight: 800; font-size: 1.75rem; font-family: 'Outfit';">฿${payment.depositAmount.toLocaleString()}</span>
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
    `;

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Start polling if status is not final
    if (!isPaid && !isFailed && this.reservation.id) {
      this.startPolling();
    }
  }

  startPolling() {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Poll every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        // We need to use the global client. It's usually imported or accessed via window.app.
        // But since this is a class, let's assume client is somehow available.
        // The previous code in main.js used client.get. Let's send a fetch request manually if client is not imported,
        // to avoid missing import errors.
        const response = await fetch(`/api/payments/check-status/${this.reservation.id}`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.updated || data.status === 'confirmed' || data.paymentStatus === 'paid' || data.paymentStatus === 'failed') {
          // Stop polling
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;

          // Update reservation object
          this.reservation.status = data.status;
          this.reservation.paymentStatus = data.paymentStatus;
          
          if (window.app && window.app.saveToStorage) {
            window.app.saveToStorage();
          }

          // Re-render
          this.render(document.querySelector('#step-content'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  }

  // Good practice to clean up if the user navigates away, though in SPA it might just be fine or handled by main.js
  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
