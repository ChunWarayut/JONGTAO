import client from '../api/client.js';
import { showAlert } from '../utils/dialog.js';

export default class BookingList {
  async render(container) {
    try {
      this.bookings = await client.get('/bookings');

      container.innerHTML = `
        <div class="admin-table-container animate-fade">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>โซน</th>
                <th>จำนวนคน</th>
                <th>เวลา</th>
                <th>สถานะ</th>
                <th>ชำระเงิน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${this.bookings.map(b => `
                <tr data-id="${b.id}">
                  <td>
                    <div style="font-weight: 600;">${b.customerName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${b.customerPhone}</div>
                  </td>
                  <td><span style="color: var(--accent-neon);">${b.zone.code}</span></td>
                  <td>${b.guestCount}${b.extraTable ? ' + โต๊ะเสริม' : ''}</td>
                  <td>${b.arrivalTime} น.</td>
                  <td>
                    <span class="status-badge status-${b.status}">${b.status}</span>
                  </td>
                  <td>
                    <div style="font-size: 0.8rem;">${b.paymentStatus}</div>
                    <div style="font-weight: 500;">฿${b.totalAmount.toLocaleString()}</div>
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <button class="btn-details" data-id="${b.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: white; cursor: pointer;">รายละเอียด</button>
                      <select class="status-update" data-id="${b.id}" style="padding: 4px; background: var(--bg-dark); color: white; border: 1px solid var(--glass-border); border-radius: 4px;">
                        <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                        <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>ยืนยันแล้ว</option>
                        <option value="checked-in" ${b.status === 'checked-in' ? 'selected' : ''}>เช็คอินแล้ว</option>
                        <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>เสร็จสิ้น</option>
                        <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option>
                      </select>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${this.bookings.length === 0 ? '<p style="padding: 40px; text-align: center; color: var(--text-muted);">ยังไม่มีรายการจอง</p>' : ''}
        </div>

        <!-- Booking Detail Modal -->
        <div id="booking-detail-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
          <div class="glass-card animate-fade" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative;">
            <button id="close-booking-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
            <h3 class="font-heading" style="margin-bottom: 24px; font-size: 1.5rem; color: var(--accent-neon); border-bottom: 1px solid var(--glass-border); padding-bottom: 12px;">รายละเอียดการจอง</h3>
            <div id="booking-detail-content" style="display: flex; flex-direction: column; gap: 16px; font-size: 0.95rem;">
              <!-- Detail fields will be injected here -->
            </div>
          </div>
        </div>
      `;

      this.attachEvents(container);
    } catch (error) {
      container.innerHTML = `<p class="error">โหลดข้อมูลผิดพลาด: ${error.message}</p>`;
    }
  }

  attachEvents(container) {
    container.querySelectorAll('.status-update').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.getAttribute('data-id');
        const status = e.target.value;
        try {
          await client.patch(`/bookings/${id}/status`, { status });
          // Refresh view or update badge locally
          this.render(container);
        } catch (err) {
          await showAlert('อัพเดทสถานะไม่สำเร็จ: ' + err.message);
        }
      });
    });

    // Detail Modal Events
    const modal = container.querySelector('#booking-detail-modal');
    const content = container.querySelector('#booking-detail-content');

    container.querySelector('#close-booking-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    container.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) return;

        content.innerHTML = `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
            <div style="color: var(--text-muted);">รหัสการจอง:</div>
            <div style="font-weight: 500;">#${booking.id} (${new Date(booking.createdAt).toLocaleString('th-TH')})</div>

            <div style="color: var(--text-muted);">ชื่อลูกค้า:</div>
            <div style="font-weight: 600;">${booking.customerName}</div>

            <div style="color: var(--text-muted);">เบอร์โทร:</div>
            <div>${booking.customerPhone || '-'}</div>

            <div style="color: var(--text-muted);">Line ID:</div>
            <div>${booking.lineId || '-'}</div>

            <hr style="grid-column: 1 / -1; border: 0; border-top: 1px solid var(--glass-border); margin: 8px 0;">

            <div style="color: var(--text-muted);">โซน / โต๊ะ:</div>
            <div><strong style="color: var(--accent-neon);">${booking.zone?.name || booking.zoneId}</strong> / โต๊ะ ${booking.table?.number || 'ยังไม่ระบุ'}</div>

            <div style="color: var(--text-muted);">จำนวณลูกค้า:</div>
            <div>${booking.guestCount} ท่าน ${booking.extraTable ? '<span style="color: var(--warning);">(รับโต๊ะเสริม)</span>' : ''}</div>

            <div style="color: var(--text-muted);">เวลาที่มาถึง:</div>
            <div>${booking.arrivalTime} น.</div>

            <div style="color: var(--text-muted);">โอกาสพิเศษ:</div>
            <div>${booking.occasion || '-'}</div>

            <div style="color: var(--text-muted);">หมายเหตุ:</div>
            <div>${booking.note || '-'}</div>

            <hr style="grid-column: 1 / -1; border: 0; border-top: 1px solid var(--glass-border); margin: 8px 0;">

            <div style="color: var(--text-muted);">ยอดรวม:</div>
            <div style="font-weight: 600;">฿${booking.totalAmount.toLocaleString()}</div>

            <div style="color: var(--text-muted);">ยอดมัดจำ:</div>
            <div style="color: var(--success);">฿${booking.depositAmount.toLocaleString()} (${booking.paymentStatus})</div>
          </div>
        `;
        modal.style.display = 'flex';
      });
    });
  }
}
