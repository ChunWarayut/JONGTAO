import client from '../api/client.js';
import { showAlert } from '../utils/dialog.js';

export default class BookingList {
  async render(container) {
    try {
      this.bookings = await client.get('/bookings');
      this.container = container;

      container.innerHTML = `
        <!-- Desktop Table -->
        <div class="admin-table-container animate-fade booking-desktop-table">
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
              ${this.bookings.map(b => this._tableRow(b)).join('')}
            </tbody>
          </table>
          ${this.bookings.length === 0 ? '<p style="padding: 40px; text-align: center; color: var(--text-muted);">ยังไม่มีรายการจอง</p>' : ''}
        </div>

        <!-- Mobile Cards -->
        <div class="booking-mobile-cards animate-fade">
          ${this.bookings.length === 0
            ? '<p style="padding: 40px; text-align: center; color: var(--text-muted);">ยังไม่มีรายการจอง</p>'
            : this.bookings.map(b => this._mobileCard(b)).join('')}
        </div>

        <style>
          .booking-mobile-cards { display: none; flex-direction: column; gap: 12px; }
          @media (max-width: 768px) {
            .booking-desktop-table { display: none; }
            .booking-mobile-cards { display: flex; }
          }
          .booking-card {
            background: rgba(12,3,3,0.9);
            border: 1px solid rgba(212,32,32,0.2);
            border-radius: 14px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .booking-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
          }
          .booking-card-footer {
            display: flex;
            gap: 8px;
            align-items: center;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.06);
          }
          .booking-card-footer select {
            flex: 1;
            padding: 8px 10px;
            background: rgba(255,255,255,0.05);
            color: white;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            font-size: 0.85rem;
            font-family: inherit;
          }
          .booking-card-footer .btn-details {
            padding: 8px 14px;
            font-size: 0.82rem;
            border-radius: 8px;
            border: 1px solid rgba(212,32,32,0.4);
            background: rgba(212,32,32,0.1);
            color: white;
            cursor: pointer;
            white-space: nowrap;
            font-family: inherit;
          }
          .booking-info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
          }
          .booking-info-row .lbl { color: rgba(255,255,255,0.4); }
          .booking-info-row .val { font-weight: 600; color: white; }
        </style>

        <!-- Booking Detail Modal -->
        <div id="booking-detail-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
          <div class="glass-card animate-fade" style="width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative;">
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

  _paymentLabel(b) {
    const isFree = (b.totalAmount || 0) === 0 && (b.depositAmount || 0) === 0;
    const amt = `฿${(b.depositAmount || b.totalAmount || 0).toLocaleString()}`;
    if (isFree) return { text: '🎉 จองฟรี', color: 'var(--success)' };
    if (b.paymentStatus === 'paid') return { text: `✓ ชำระแล้ว`, sub: amt, color: 'var(--success)' };
    if (b.paymentStatus === 'pending_verification') return { text: `🧾 รอตรวจสลิป`, sub: amt, color: '#f59e0b' };
    if (b.paymentStatus === 'slip_rejected') return { text: `✕ ปฏิเสธสลิป`, sub: amt, color: '#ef4444' };
    return { text: '⏳ รอชำระ', sub: amt, color: '#fbbf24' };
  }

  _statusLabel(status) {
    const map = {
      pending: 'รอดำเนินการ', confirmed: 'ยืนยันแล้ว',
      'checked-in': 'เช็คอินแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก'
    };
    return map[status] || status;
  }

  _tableRow(b) {
    const pay = this._paymentLabel(b);
    return `
      <tr data-id="${b.id}">
        <td>
          <div style="font-weight: 600;">${b.customerName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${b.customerPhone}</div>
        </td>
        <td><span style="color: var(--accent-neon);">${b.zone.code}</span></td>
        <td>${b.guestCount}${b.extraTable ? ' + โต๊ะเสริม' : ''}</td>
        <td>${b.arrivalTime} น.</td>
        <td><span class="status-badge status-${b.status}">${this._statusLabel(b.status)}</span></td>
        <td>
          <div style="color:${pay.color}; font-size:0.8rem;">${pay.text}</div>
          ${pay.sub ? `<div style="font-weight:500;">${pay.sub}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
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
      </tr>`;
  }

  _mobileCard(b) {
    const pay = this._paymentLabel(b);
    const bookingDate = b.bookingDate
      ? new Date(b.bookingDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-';
    return `
      <div class="booking-card">
        <div class="booking-card-header">
          <div>
            <div style="font-weight: 700; font-size: 1rem; color: white;">${b.customerName}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 2px;">${b.customerPhone}</div>
          </div>
          <div style="text-align: right;">
            <span class="status-badge status-${b.status}" style="font-size: 0.72rem;">${this._statusLabel(b.status)}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div class="booking-info-row"><span class="lbl">โซน</span><span class="val" style="color: var(--accent-neon);">${b.zone.name}</span></div>
          <div class="booking-info-row"><span class="lbl">โต๊ะ</span><span class="val">${b.table?.number || '-'}</span></div>
          <div class="booking-info-row"><span class="lbl">จำนวนคน</span><span class="val">${b.guestCount} คน${b.extraTable ? ' +เสริม' : ''}</span></div>
          <div class="booking-info-row"><span class="lbl">เวลา</span><span class="val">${b.arrivalTime} น.</span></div>
          <div class="booking-info-row"><span class="lbl">วันที่</span><span class="val">${bookingDate}</span></div>
          <div class="booking-info-row">
            <span class="lbl">ชำระเงิน</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: ${pay.color};">${pay.text}${pay.sub ? ' ' + pay.sub : ''}</span>
          </div>
        </div>

        <div class="booking-card-footer">
          <button class="btn-details" data-id="${b.id}">รายละเอียด</button>
          <select class="status-update" data-id="${b.id}">
            <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>ยืนยันแล้ว</option>
            <option value="checked-in" ${b.status === 'checked-in' ? 'selected' : ''}>เช็คอินแล้ว</option>
            <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>เสร็จสิ้น</option>
            <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>ยกเลิก</option>
          </select>
        </div>
      </div>`;
  }

  attachEvents(container) {
    container.querySelectorAll('.status-update').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.getAttribute('data-id');
        const status = e.target.value;
        try {
          await client.patch(`/bookings/${id}/status`, { status });
          this.render(container);
        } catch (err) {
          await showAlert('อัพเดทสถานะไม่สำเร็จ: ' + err.message);
        }
      });
    });

    const modal = container.querySelector('#booking-detail-modal');
    const content = container.querySelector('#booking-detail-content');

    container.querySelector('#close-booking-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    container.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) return;

        const isFree = (booking.totalAmount || 0) === 0 && (booking.depositAmount || 0) === 0;
        const hasPendingSlip = booking.paymentStatus === 'pending_verification' && booking.slipImageUrl;
        const isPaid = booking.paymentStatus === 'paid';
        const isRejected = booking.paymentStatus === 'slip_rejected';

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
            <div style="font-weight: 600;">${isFree ? '🎉 ฟรี' : `฿${booking.totalAmount.toLocaleString()}`}</div>

            <div style="color: var(--text-muted);">ยอดมัดจำ:</div>
            <div style="color: ${isPaid ? 'var(--success)' : (hasPendingSlip ? '#f59e0b' : 'var(--text-main)')}; font-weight: 600;">
              ${isFree ? 'ฟรี' : `฿${booking.depositAmount.toLocaleString()}`}
              <span style="font-size: 0.8rem; margin-left: 6px;">(${booking.paymentStatus})</span>
            </div>
          </div>

          ${booking.slipImageUrl ? `
          <div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">สลิปการโอนเงิน</p>
            <div style="border: 1px solid var(--glass-border); border-radius: var(--radius-md); overflow: hidden;">
              <img src="${booking.slipImageUrl}" style="width: 100%; display: block;" alt="สลิปโอนเงิน">
            </div>
          </div>
          ` : (booking.paymentStatus === 'pending_verification' ? `
          <div style="padding: 12px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: var(--radius-md); color: #f59e0b; font-size: 0.85rem;">
            รอสลิปจากลูกค้า
          </div>
          ` : '')}

          ${hasPendingSlip ? `
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
            <button id="btn-confirm-payment" data-id="${booking.id}" style="width: 100%; padding: 14px; background: linear-gradient(135deg, var(--success), #28a745); color: white; border: none; border-radius: var(--radius-md); font-size: 1rem; font-weight: 800; cursor: pointer;">
              ✓ ยืนยันการชำระเงิน
            </button>
            <div style="border: 1px solid rgba(239,68,68,0.4); border-radius: var(--radius-md); overflow: hidden;">
              <input id="reject-reason-input" type="text" placeholder="เหตุผล เช่น สลิปปลอม / ยอดไม่ตรง / สลิปเก่า" style="width: 100%; padding: 10px 14px; background: rgba(239,68,68,0.05); border: none; color: white; font-size: 0.85rem; box-sizing: border-box; outline: none;">
              <button id="btn-reject-payment" data-id="${booking.id}" style="width: 100%; padding: 11px; background: rgba(239,68,68,0.15); color: #ef4444; border: none; border-top: 1px solid rgba(239,68,68,0.3); font-size: 0.9rem; font-weight: 700; cursor: pointer;">
                ✕ ปฏิเสธสลิป
              </button>
            </div>
          </div>
          ` : ''}

          ${isRejected ? `
          <div style="padding: 14px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-md); color: #ef4444; font-size: 0.85rem;">
            <div style="font-weight: 700; margin-bottom: 4px;">✕ ปฏิเสธสลิปแล้ว</div>
            <div style="color: var(--text-muted);">เหตุผล: ${booking.slipRejectReason || 'สลิปไม่ถูกต้อง'}</div>
          </div>
          ` : ''}

          ${isPaid ? `
          <div style="padding: 14px; background: rgba(50,215,75,0.1); border: 1px solid rgba(50,215,75,0.3); border-radius: var(--radius-md); color: var(--success); font-weight: 700; text-align: center;">
            ✓ ยืนยันการชำระเงินแล้ว
          </div>
          ` : ''}
        `;

        modal.style.display = 'flex';

        const token = localStorage.getItem('token');

        const btnConfirm = content.querySelector('#btn-confirm-payment');
        if (btnConfirm) {
          btnConfirm.addEventListener('click', async () => {
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'กำลังยืนยัน...';
            try {
              const response = await fetch(`/api/payments/confirm/${booking.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('ยืนยันไม่สำเร็จ');
              modal.style.display = 'none';
              await this.render(container);
            } catch (err) {
              await showAlert('เกิดข้อผิดพลาด: ' + err.message);
              btnConfirm.disabled = false;
              btnConfirm.textContent = '✓ ยืนยันการชำระเงิน';
            }
          });
        }

        const btnReject = content.querySelector('#btn-reject-payment');
        if (btnReject) {
          btnReject.addEventListener('click', async () => {
            const reason = content.querySelector('#reject-reason-input').value.trim() || 'สลิปไม่ถูกต้อง';
            btnReject.disabled = true;
            btnReject.textContent = 'กำลังปฏิเสธ...';
            try {
              const response = await fetch(`/api/payments/reject/${booking.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ reason })
              });
              if (!response.ok) throw new Error('ปฏิเสธไม่สำเร็จ');
              modal.style.display = 'none';
              await this.render(container);
            } catch (err) {
              await showAlert('เกิดข้อผิดพลาด: ' + err.message);
              btnReject.disabled = false;
              btnReject.textContent = '✕ ปฏิเสธสลิป';
            }
          });
        }
      });
    });
  }
}
