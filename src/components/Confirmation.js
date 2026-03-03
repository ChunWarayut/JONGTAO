export default class Confirmation {
  constructor(reservation) {
    this.reservation = reservation;
  }

  render(container) {
    const { customer, zone, table, guestCount, extraTable, payment } = this.reservation;

    container.innerHTML = `
      <div class="confirmation-container animate-fade" style="text-align: center; max-width: 600px; margin: 0 auto;">
        <div style="width: 80px; height: 80px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--spacing-lg); box-shadow: 0 0 30px rgba(50, 215, 75, 0.4); border: 4px solid rgba(255,255,255,0.1);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        
        <h1 class="font-heading confirmation-heading" style="margin-bottom: var(--spacing-xs); font-size: 2.5rem;">${payment.method === 'promptpay' ? 'รับทราบการจ่ายเงิน!' : 'จองโต๊ะสำเร็จ!'}</h1>
        <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">
          ${payment.method === 'promptpay'
        ? 'เรากำลังรอยืนยันยอดเงินจาก Stripe... เมื่อสำเร็จ ระบบจะอัปเดตสถานะทันที'
        : `รายละเอียดถูกส่งไปที่ Line ID: <span style="color: var(--accent-neon); font-weight: 700;">${customer.lineId || 'N/A'}</span>`}
        </p>

        <div class="glass-card" style="padding: 0; overflow: hidden; margin-bottom: var(--spacing-xl); border-color: var(--success);">
          <div style="background: linear-gradient(90deg, var(--success), #28a745); padding: 12px; color: white; font-weight: 800; font-family: 'Outfit'; letter-spacing: 0.1em; font-size: 0.8rem;">
            CHECK-IN QR CODE
          </div>
          <div style="padding: 32px; background: white; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div id="qr-code-placeholder" style="padding: 12px; border: 2px dashed #ddd; border-radius: 16px;">
               <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BOOKING-${Math.floor(Math.random() * 100000)}" alt="QR Code" style="display: block; width: 200px; height: 200px;">
            </div>
            <p style="color: #666; font-size: 0.8rem; font-weight: 600;">Booking ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
          <div style="padding: var(--spacing-xl); text-align: left; background: var(--bg-surface); border-top: 1px solid var(--glass-border);">
            <p class="font-heading" style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: var(--spacing-md); text-transform: uppercase; letter-spacing: 0.1em;">สรุปรายการจอง</p>
            <div class="confirmation-summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 1rem;">
              <div style="display: flex; align-items: center; gap: 10px; grid-column: span 2; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                <span style="font-size: 1.2rem;">📅</span>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">DATE / วันที่จอง</div>
                  <strong style="font-family: 'Outfit'; color: var(--accent-neon);">${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">📍</span>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">ZONE / โซน</div>
                  <strong style="font-family: 'Outfit';">${zone.name}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">🪑</span>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">TABLE / โต๊ะ</div>
                  <strong style="font-family: 'Outfit';">No. ${table ? table.number : 'N/A'}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">👥</span>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">GUESTS / จำนวนคน</div>
                  <strong style="font-family: 'Outfit';">${guestCount} ท่าน</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">🕒</span>
                <div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">ARRIVAL / เวลา</div>
                  <strong style="font-family: 'Outfit';">${customer.arrivalTime} น.</strong>
                </div>
              </div>
              <div style="grid-column: span 2; margin-top: 8px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border-left: 3px solid ${extraTable ? 'var(--accent-neon)' : 'var(--text-dim)'};">
                ${extraTable ? '<span style="color: var(--accent-neon); font-weight: 700;">✅ เสริมโต๊ะ (+1 Table Added)</span>' : '<span style="color: var(--text-dim); font-weight: 500;">❌ ไม่มีการเสริมโต๊ะ</span>'}
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
          <button class="btn btn-ghost" style="flex: 1; height: 56px; font-weight: 700;" onclick="if(window.app){ window.app.reservation = window.app.getDefaultReservation(); window.app.goToStep(1); } else { window.location.reload(); }">
            <span>🔄</span> เริ่มใหม่
          </button>
          <button class="btn btn-primary" style="flex: 1; height: 56px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary));" onclick="window.location.href='/'">
            <span>🏠</span> กลับหน้าแรก
          </button>
        </div>
      </div>
    `;
  }
}
