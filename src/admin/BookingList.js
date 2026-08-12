import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

const BKK = 'Asia/Bangkok';

// Bookings and special dates are both stored as BKK-midnight instants, so the
// Bangkok calendar day is the key that groups one night's bookings together.
const bkkDayKey = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: BKK });
};

const thaiDate = (dayKey) =>
  new Date(`${dayKey}T12:00:00+07:00`).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: BKK
  });

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  'checked-in': 'เช็คอินแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

// "ปัจจุบัน" = still needs the owner's attention on the night itself.
const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked-in'];

const STATUS_FILTERS = [
  { key: 'active', label: 'ปัจจุบัน', match: (b) => ACTIVE_STATUSES.includes(b.status) },
  { key: 'all', label: 'ทั้งหมด', match: () => true },
  ...Object.entries(STATUS_LABELS).map(([key, label]) => ({
    key, label, match: (b) => b.status === key
  })),
];

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const baht = (n) => `฿${Number(n || 0).toLocaleString()}`;

// A booking can cover several tables. `tables` is the full set; `table` is the first
// one, kept for bookings made before multi-table selection existed.
const tableNumbersOf = (b) => {
  const fromSet = (b.tables || []).map((bt) => bt.table?.number).filter(Boolean);
  if (fromSet.length) return fromSet;
  return b.table?.number ? [b.table.number] : [];
};

export default class BookingList {
  constructor() {
    this.filterDate = null;   // null = pick a sensible default on first render
    this.filterStatus = 'active';
    this.specialDateNames = new Map();
  }

  async render(container) {
    try {
      const [bookings, specialDates] = await Promise.all([
        client.get('/bookings'),
        client.get('/special-dates').catch(() => []),
      ]);

      // SSE-triggered refreshes swap the whole list out from under the admin; put
      // the viewport back where it was so live updates don't yank them to the top.
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      this.bookings = bookings;
      this.container = container;
      this.specialDateNames = new Map(
        (specialDates || [])
          .filter((s) => s.isActive !== false)
          .map((s) => [bkkDayKey(s.date), s.name])
      );

      this._buildDateOptions();
      const visible = this._visibleBookings();

      container.innerHTML = `
        ${this._filterBar(visible)}
        ${this._summaryBar(visible)}

        <!-- Desktop Table -->
        <div class="admin-table-container animate-fade booking-desktop-table">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>โต๊ะ</th>
                <th>วันที่</th>
                <th>จำนวนคน</th>
                <th>เวลา</th>
                <th>สถานะ</th>
                <th>ชำระเงิน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${visible.map((b) => this._tableRow(b)).join('')}
            </tbody>
          </table>
          ${visible.length === 0 ? `<p style="padding: 40px; text-align: center; color: var(--text-muted);">${this._emptyMessage()}</p>` : ''}
        </div>

        <!-- Mobile Cards -->
        <div class="booking-mobile-cards animate-fade">
          ${visible.length === 0
            ? `<p style="padding: 40px; text-align: center; color: var(--text-muted);">${this._emptyMessage()}</p>`
            : visible.map((b) => this._mobileCard(b)).join('')}
        </div>

        <style>
          .booking-filter-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
          }
          .booking-filter-bar .filter-group {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .booking-filter-bar .filter-label {
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.45);
          }
          .booking-filter-bar select {
            padding: 9px 12px;
            background: rgba(12,3,3,0.9);
            color: white;
            border: 1px solid rgba(212,32,32,0.35);
            border-radius: 10px;
            font-size: 0.9rem;
            font-family: inherit;
            font-weight: 600;
            min-width: 220px;
          }
          .status-chips { display: flex; flex-wrap: wrap; gap: 8px; }
          .status-chip {
            padding: 7px 14px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            color: rgba(255,255,255,0.6);
            font-size: 0.82rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
          }
          .status-chip:hover { border-color: rgba(212,32,32,0.5); color: white; }
          .status-chip.active {
            background: rgba(212,32,32,0.18);
            border-color: rgba(212,32,32,0.7);
            color: white;
          }
          .status-chip .chip-count {
            opacity: 0.65;
            font-size: 0.76rem;
            margin-left: 4px;
          }
          .booking-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
            margin-bottom: 18px;
          }
          .booking-summary .sum-tile {
            background: rgba(12,3,3,0.9);
            border: 1px solid rgba(212,32,32,0.2);
            border-radius: 12px;
            padding: 12px 14px;
          }
          .booking-summary .sum-label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(255,255,255,0.4);
            margin-bottom: 4px;
          }
          .booking-summary .sum-value {
            font-size: 1.25rem;
            font-weight: 800;
            font-family: 'Outfit', sans-serif;
            color: white;
          }
          .table-number {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 8px;
            background: rgba(212,32,32,0.15);
            border: 1px solid rgba(212,32,32,0.35);
            color: var(--accent-neon);
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 800;
            letter-spacing: 0.03em;
          }
          .table-number.unassigned {
            background: rgba(255,255,255,0.04);
            border-color: rgba(255,255,255,0.12);
            color: rgba(255,255,255,0.35);
            font-size: 0.85rem;
            font-weight: 600;
          }
          .btn-delete-booking {
            padding: 4px 8px;
            font-size: 0.75rem;
            border-radius: 4px;
            border: 1px solid rgba(239,68,68,0.4);
            background: rgba(239,68,68,0.1);
            color: #ef4444;
            cursor: pointer;
            font-family: inherit;
          }
          .btn-delete-booking:hover { background: rgba(239,68,68,0.22); }
          tr.row-cancelled td { opacity: 0.5; }

          .booking-mobile-cards { display: none; flex-direction: column; gap: 12px; }
          @media (max-width: 768px) {
            .booking-desktop-table { display: none; }
            .booking-mobile-cards { display: flex; }
            .booking-filter-bar select { min-width: 0; width: 100%; }
            .booking-filter-bar .filter-group { width: 100%; }
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
          .booking-card.card-cancelled { opacity: 0.55; }
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
          .booking-card-footer .btn-delete-booking {
            padding: 8px 12px;
            font-size: 0.82rem;
            border-radius: 8px;
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
      window.scrollTo(scrollX, scrollY);
    } catch (error) {
      container.innerHTML = `<p class="error">โหลดข้อมูลผิดพลาด: ${esc(error.message)}</p>`;
    }
  }

  // ---------- filtering ----------

  // Distinct booking nights, newest first, so the dropdown reads as an event list.
  _buildDateOptions() {
    const counts = new Map();
    this.bookings.forEach((b) => {
      const key = bkkDayKey(b.bookingDate);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    this.dateOptions = [...counts.entries()]
      .map(([key, count]) => ({ key, count, name: this.specialDateNames.get(key) || null }))
      .sort((a, b) => b.key.localeCompare(a.key));

    const known = this.dateOptions.map((o) => o.key);
    if (this.filterDate === 'all') return;
    if (!this.filterDate || !known.includes(this.filterDate)) {
      this.filterDate = this._defaultDate(known);
    }
  }

  // Default to the night that is "now": today if it has bookings, otherwise the
  // next upcoming night, otherwise the most recent past one.
  _defaultDate(keys) {
    if (keys.length === 0) return 'all';
    const today = bkkDayKey(new Date());
    if (keys.includes(today)) return today;
    const upcoming = keys.filter((k) => k > today).sort();
    if (upcoming.length) return upcoming[0];
    return keys.filter((k) => k < today).sort().pop() || 'all';
  }

  _dateMatches(b) {
    return this.filterDate === 'all' || bkkDayKey(b.bookingDate) === this.filterDate;
  }

  // Bookings for the selected night, before the status filter — the chip counts
  // describe this set so the owner can see what each status would reveal.
  _dateScoped() {
    return this.bookings.filter((b) => this._dateMatches(b));
  }

  _visibleBookings() {
    const filter = STATUS_FILTERS.find((f) => f.key === this.filterStatus) || STATUS_FILTERS[1];
    return this._dateScoped().filter((b) => filter.match(b));
  }

  _emptyMessage() {
    if (this.bookings.length === 0) return 'ยังไม่มีรายการจอง';
    return 'ไม่มีรายการจองที่ตรงกับตัวกรอง';
  }

  _dateOptionLabel(opt) {
    const name = opt.name ? ` · ${opt.name}` : '';
    return `${thaiDate(opt.key)}${name} (${opt.count})`;
  }

  _filterBar(visible) {
    const scoped = this._dateScoped();
    const chips = STATUS_FILTERS.map((f) => {
      const count = scoped.filter((b) => f.match(b)).length;
      return `<button class="status-chip ${this.filterStatus === f.key ? 'active' : ''}" data-status="${f.key}">
        ${f.label}<span class="chip-count">${count}</span>
      </button>`;
    }).join('');

    return `
      <div class="booking-filter-bar animate-fade">
        <div class="filter-group">
          <span class="filter-label">งาน / วันที่</span>
          <select id="booking-date-filter">
            ${this.dateOptions.map((opt) => `
              <option value="${opt.key}" ${this.filterDate === opt.key ? 'selected' : ''}>${esc(this._dateOptionLabel(opt))}</option>
            `).join('')}
            <option value="all" ${this.filterDate === 'all' ? 'selected' : ''}>ทุกวัน (${this.bookings.length})</option>
          </select>
        </div>
        <div class="status-chips">${chips}</div>
        <div style="margin-left: auto; font-size: 0.85rem; color: rgba(255,255,255,0.45);">
          แสดง <strong style="color: white;">${visible.length}</strong> รายการ
        </div>
      </div>`;
  }

  _summaryBar(visible) {
    const counted = visible.filter((b) => b.status !== 'cancelled');
    const guests = counted.reduce((sum, b) => sum + (b.guestCount || 0), 0);
    const tables = counted.reduce((sum, b) => sum + tableNumbersOf(b).length + (b.extraTable ? 1 : 0), 0);
    const paid = counted
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + (b.depositAmount || 0), 0);
    const minSpend = counted.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return `
      <div class="booking-summary animate-fade">
        <div class="sum-tile"><div class="sum-label">โต๊ะที่จอง</div><div class="sum-value">${tables}</div></div>
        <div class="sum-tile"><div class="sum-label">จำนวนแขก</div><div class="sum-value">${guests}</div></div>
        <div class="sum-tile"><div class="sum-label">ยอดขั้นต่ำรวม</div><div class="sum-value">${baht(minSpend)}</div></div>
        <div class="sum-tile"><div class="sum-label">มัดจำที่ชำระแล้ว</div><div class="sum-value" style="color: var(--success);">${baht(paid)}</div></div>
      </div>`;
  }

  // ---------- row rendering ----------

  _paymentLabel(b) {
    const isFree = (b.totalAmount || 0) === 0 && (b.depositAmount || 0) === 0;
    const amt = baht(b.depositAmount || b.totalAmount || 0);
    if (isFree) return { text: '🎉 จองฟรี', color: 'var(--success)' };
    if (b.paymentStatus === 'paid') return { text: `✓ ชำระแล้ว`, sub: amt, color: 'var(--success)' };
    if (b.paymentStatus === 'pending_verification') return { text: `🧾 รอตรวจสลิป`, sub: amt, color: '#f59e0b' };
    if (b.paymentStatus === 'slip_rejected') return { text: `✕ ปฏิเสธสลิป`, sub: amt, color: '#ef4444' };
    return { text: '⏳ รอชำระ', sub: amt, color: '#fbbf24' };
  }

  _statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  _tableCell(b) {
    const numbers = tableNumbersOf(b);
    if (!numbers.length) {
      return `<span class="table-number unassigned">ยังไม่ระบุโต๊ะ</span>`;
    }
    return `
      <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
        ${numbers.map((n) => `<span class="table-number">${esc(n)}</span>`).join('')}
        ${b.extraTable ? '<span style="font-size:0.72rem; color: var(--warning);">+เสริม</span>' : ''}
      </div>
      <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
        ${esc(b.zone?.name || b.zone?.code || '')}${numbers.length > 1 ? ` · ${numbers.length} โต๊ะ` : ''}
      </div>`;
  }

  _statusSelect(b) {
    return `
      <select class="status-update" data-id="${b.id}" style="padding: 4px; background: var(--bg-dark); color: white; border: 1px solid var(--glass-border); border-radius: 4px;">
        ${Object.entries(STATUS_LABELS).map(([key, label]) =>
          `<option value="${key}" ${b.status === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select>`;
  }

  _tableRow(b) {
    const pay = this._paymentLabel(b);
    const dayKey = bkkDayKey(b.bookingDate);
    const eventName = dayKey ? this.specialDateNames.get(dayKey) : null;
    return `
      <tr data-id="${b.id}" class="${b.status === 'cancelled' ? 'row-cancelled' : ''}">
        <td>
          <div style="font-weight: 600;">${esc(b.customerName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${esc(b.customerPhone)}</div>
        </td>
        <td>${this._tableCell(b)}</td>
        <td>
          <div>${dayKey ? thaiDate(dayKey) : '-'}</div>
          ${eventName ? `<div style="font-size: 0.72rem; color: var(--accent-neon);">${esc(eventName)}</div>` : ''}
        </td>
        <td>${b.guestCount}</td>
        <td>${esc(b.arrivalTime || '-')} น.</td>
        <td><span class="status-badge status-${b.status}">${this._statusLabel(b.status)}</span></td>
        <td>
          <div style="color:${pay.color}; font-size:0.8rem;">${pay.text}</div>
          ${pay.sub ? `<div style="font-weight:500;">${pay.sub}</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button class="btn-details" data-id="${b.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: white; cursor: pointer;">รายละเอียด</button>
            ${this._statusSelect(b)}
            <button class="btn-delete-booking" data-id="${b.id}" title="ลบรายการนี้ถาวร">ลบ</button>
          </div>
        </td>
      </tr>`;
  }

  _mobileCard(b) {
    const pay = this._paymentLabel(b);
    const dayKey = bkkDayKey(b.bookingDate);
    const eventName = dayKey ? this.specialDateNames.get(dayKey) : null;
    return `
      <div class="booking-card ${b.status === 'cancelled' ? 'card-cancelled' : ''}">
        <div class="booking-card-header">
          <div>
            <div style="font-weight: 700; font-size: 1rem; color: white;">${esc(b.customerName)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 2px;">${esc(b.customerPhone)}</div>
          </div>
          <div style="text-align: right;">
            <span class="status-badge status-${b.status}" style="font-size: 0.72rem;">${this._statusLabel(b.status)}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          ${tableNumbersOf(b).length
            ? tableNumbersOf(b).map((n) => `<span class="table-number">${esc(n)}</span>`).join('')
            : '<span class="table-number unassigned">ยังไม่ระบุโต๊ะ</span>'}
          <span style="font-size: 0.8rem; color: rgba(255,255,255,0.45);">${esc(b.zone?.name || '')}</span>
          ${b.extraTable ? '<span style="font-size:0.75rem; color: var(--warning);">+โต๊ะเสริม</span>' : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div class="booking-info-row"><span class="lbl">จำนวนคน</span><span class="val">${b.guestCount} คน</span></div>
          <div class="booking-info-row"><span class="lbl">เวลา</span><span class="val">${esc(b.arrivalTime || '-')} น.</span></div>
          <div class="booking-info-row"><span class="lbl">วันที่</span><span class="val">${dayKey ? thaiDate(dayKey) : '-'}</span></div>
          <div class="booking-info-row">
            <span class="lbl">ชำระเงิน</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: ${pay.color};">${pay.text}${pay.sub ? ' ' + pay.sub : ''}</span>
          </div>
          ${eventName ? `<div class="booking-info-row" style="grid-column: 1 / -1;"><span class="lbl">งาน</span><span class="val" style="color: var(--accent-neon);">${esc(eventName)}</span></div>` : ''}
        </div>

        <div class="booking-card-footer">
          <button class="btn-details" data-id="${b.id}">รายละเอียด</button>
          ${this._statusSelect(b)}
          <button class="btn-delete-booking" data-id="${b.id}" title="ลบรายการนี้ถาวร">ลบ</button>
        </div>
      </div>`;
  }

  // ---------- events ----------

  attachEvents(container) {
    const dateFilter = container.querySelector('#booking-date-filter');
    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        this.filterDate = e.target.value;
        this.render(container);
      });
    }

    container.querySelectorAll('.status-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.filterStatus = chip.getAttribute('data-status');
        this.render(container);
      });
    });

    container.querySelectorAll('.status-update').forEach((select) => {
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

    container.querySelectorAll('.btn-delete-booking').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const booking = this.bookings.find((b) => b.id === id);
        if (!booking) return;

        const numbers = tableNumbersOf(booking);
        const where = numbers.length ? `โต๊ะ ${numbers.join(', ')}` : 'ยังไม่ระบุโต๊ะ';
        const ok = await showConfirm(
          `ลบรายการจองนี้ถาวร?\n\n${booking.customerName} · ${where}\n${bkkDayKey(booking.bookingDate) ? thaiDate(bkkDayKey(booking.bookingDate)) : ''}\n\nรายการจะหายออกจากระบบและโต๊ะจะถูกปล่อยคืน — กู้คืนไม่ได้`
        );
        if (!ok) return;

        try {
          await client.delete(`/bookings/${id}/permanent`);
          await this.render(container);
        } catch (err) {
          await showAlert('ลบรายการไม่สำเร็จ: ' + err.message);
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
        const dayKey = bkkDayKey(booking.bookingDate);
        const eventName = dayKey ? this.specialDateNames.get(dayKey) : null;
        const detailTables = tableNumbersOf(booking);

        content.innerHTML = `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
            <div style="color: var(--text-muted);">รหัสการจอง:</div>
            <div style="font-weight: 500;">#${booking.id} (${new Date(booking.createdAt).toLocaleString('th-TH')})</div>

            <div style="color: var(--text-muted);">ชื่อลูกค้า:</div>
            <div style="font-weight: 600;">${esc(booking.customerName)}</div>

            <div style="color: var(--text-muted);">เบอร์โทร:</div>
            <div>${esc(booking.customerPhone || '-')}</div>

            <div style="color: var(--text-muted);">Line ID:</div>
            <div>${esc(booking.lineId || '-')}</div>

            <hr style="grid-column: 1 / -1; border: 0; border-top: 1px solid var(--glass-border); margin: 8px 0;">

            <div style="color: var(--text-muted);">โต๊ะ:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
              ${detailTables.length
                ? detailTables.map((n) => `<span class="table-number">${esc(n)}</span>`).join('')
                : '<span class="table-number unassigned">ยังไม่ระบุ</span>'}
              <span style="color: var(--text-muted); font-size: 0.85rem;">${esc(booking.zone?.name || booking.zoneId)}${detailTables.length > 1 ? ` · ${detailTables.length} โต๊ะ` : ''}</span>
            </div>

            <div style="color: var(--text-muted);">วันที่จอง:</div>
            <div>${dayKey ? thaiDate(dayKey) : '-'}${eventName ? ` <span style="color: var(--accent-neon);">· ${esc(eventName)}</span>` : ''}</div>

            <div style="color: var(--text-muted);">จำนวณลูกค้า:</div>
            <div>${booking.guestCount} ท่าน ${booking.extraTable ? '<span style="color: var(--warning);">(รับโต๊ะเสริม)</span>' : ''}</div>

            <div style="color: var(--text-muted);">เวลาที่มาถึง:</div>
            <div>${esc(booking.arrivalTime || '-')} น.</div>

            <div style="color: var(--text-muted);">โอกาสพิเศษ:</div>
            <div>${esc(booking.occasion || '-')}</div>

            <div style="color: var(--text-muted);">หมายเหตุ:</div>
            <div>${esc(booking.note || '-')}</div>

            <hr style="grid-column: 1 / -1; border: 0; border-top: 1px solid var(--glass-border); margin: 8px 0;">

            <div style="color: var(--text-muted);">ยอดรวม:</div>
            <div style="font-weight: 600;">${isFree ? '🎉 ฟรี' : baht(booking.totalAmount)}</div>

            <div style="color: var(--text-muted);">ยอดมัดจำ:</div>
            <div style="color: ${isPaid ? 'var(--success)' : (hasPendingSlip ? '#f59e0b' : 'var(--text-main)')}; font-weight: 600;">
              ${isFree ? 'ฟรี' : baht(booking.depositAmount)}
              <span style="font-size: 0.8rem; margin-left: 6px;">(${esc(booking.paymentStatus)})</span>
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
            <div style="color: var(--text-muted);">เหตุผล: ${esc(booking.slipRejectReason || 'สลิปไม่ถูกต้อง')}</div>
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
