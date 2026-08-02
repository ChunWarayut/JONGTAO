import client from '../api/client.js';
import { getSessionId } from '../utils/session.js';
import { showAlert } from '../utils/dialog.js';

export default class AllZonesTableMap {
  constructor(reservation, onSelect) {
    this.reservation = reservation;
    this.onSelect = onSelect;
    this.zones = [];
    this.tables = [];
    this.fixtures = [];
    this.bookedTableIds = [];
    this.heldByOthersTableIds = [];
    // A booking can span several tables. Restored from the reservation so stepping
    // back from a later step shows the selection still in place (the holds survive too).
    this.selectedTableIds = [...(reservation.tableIds || [])];
    this.selectedZone = null;
    this.mobileScale = 1;
    this.userZoomScale = 1;
    this.selectedDate = this.reservation.bookingDate || this.getTodayDate();
    this.specialDate = null;
    this.sessionId = getSessionId();
  }

  getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatThaiDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  getPriceTypeLabel(priceType, depositAmount) {
    const labels = {
      free: '<span style="background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="gift" style="width: 14px; height: 14px;"></i> เข้าฟรี - ไม่ต้องจ่ายเงิน</span>',
      normal: '<span style="background: rgba(124, 58, 237, 0.2); color: var(--primary); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="banknote" style="width: 14px; height: 14px;"></i> ราคาปกติ - ตามโซน</span>',
      full: '<span style="background: rgba(239, 68, 68, 0.2); color: var(--danger); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="wallet" style="width: 14px; height: 14px;"></i> จ่ายเต็มจำนวน</span>',
      custom: `<span style="background: rgba(0, 255, 255, 0.15); color: var(--accent-neon); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> จ่าย ฿${depositAmount ? depositAmount.toLocaleString() : '0'}</span>`
    };
    return labels[priceType] || labels.normal;
  }

  async render(container) {
    try {
      this.zones = await client.get('/zones');
      this.tables = await client.get('/tables');
      this.fixtures = await client.get('/fixtures');
      await this.fetchBookingsForDate(this.selectedDate);
      await this.fetchSpecialDate(this.selectedDate);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }

    this.renderAllZonesMap(container);
  }

  async fetchSpecialDate(date) {
    try {
      this.specialDate = await client.get(`/special-dates/by-date?date=${date}`);
      this.reservation.specialDate = this.specialDate || null;
    } catch (error) {
      console.error('Failed to fetch special date:', error);
      this.specialDate = null;
      this.reservation.specialDate = null;
    }
  }

  async fetchBookingsForDate(date) {
    try {
      const bookings = await client.get(`/bookings/public-status?date=${date}`);
      // A booking occupies every table in its set, not just the primary one.
      this.bookedTableIds = bookings
        .filter(b => b.status !== 'cancelled')
        .flatMap(b => (b.tableIds && b.tableIds.length ? b.tableIds : [b.tableId]))
        .filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      this.bookedTableIds = [];
    }
    await this.fetchHoldsForDate(date);
  }

  async fetchHoldsForDate(date) {
    try {
      const holds = await client.get(`/holds/public?date=${date}`);
      // Tables another customer is currently holding — unavailable for selection.
      // Our own hold (same sessionId) stays selectable so we can revisit it.
      this.heldByOthersTableIds = holds
        .filter(h => h.sessionId !== this.sessionId)
        .map(h => h.tableId);
    } catch (error) {
      console.error('Failed to fetch holds:', error);
      this.heldByOthersTableIds = [];
    }
  }

  renderAllZonesMap(container) {
    this.container = container;
    const minDate = this.getTodayDate();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    container.innerHTML = `
      <div class="all-zones-map-container animate-fade">
        <h2 class="font-heading" style="margin-bottom: var(--spacing-md); font-size: 1.5rem; display: flex; align-items: center; gap: 12px;">
          <i data-lucide="map-pin" style="width: 20px; height: 20px; color: var(--accent-gold);"></i> เลือกโต๊ะที่ต้องการจอง
        </h2>

        <div class="date-picker-container glass-card" style="margin-bottom: var(--spacing-lg); padding: var(--spacing-lg); background: rgba(255, 255, 255, 0.02);">
          ${this.reservation.lockedDate ? `
          <div style="display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: rgba(212, 32, 32, 0.12); border: 2px solid var(--primary); border-radius: var(--radius-md);">
            <i data-lucide="calendar-check" style="width: 22px; height: 22px; color: var(--primary); flex-shrink: 0;"></i>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; margin-bottom: 2px;">วันที่จองที่กำหนดสำหรับ Event นี้</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: white;">${this.formatThaiDate(this.selectedDate)}</div>
            </div>
            <i data-lucide="lock" style="width: 16px; height: 16px; color: var(--text-muted); margin-left: auto; flex-shrink: 0;"></i>
          </div>
          ` : `
          <label for="booking-date" style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-weight: 600; color: var(--text-muted); font-size: 0.85rem;">
            <i data-lucide="calendar" style="width: 15px; height: 15px;"></i> เลือกวันที่จอง
          </label>
          <input
            type="date"
            id="booking-date"
            value="${this.selectedDate}"
            min="${minDate}"
            max="${maxDateStr}"
            style="width: 100%; box-sizing: border-box; padding: 13px 16px; background: var(--bg-surface); border: 2px solid var(--glass-border); border-radius: var(--radius-md); color: white; font-size: 1rem; font-family: inherit; cursor: pointer; transition: border-color 0.2s ease; -webkit-appearance: none; appearance: none;"
          />
          <div style="margin-top: 8px; color: var(--primary); font-weight: 600; font-size: 0.9rem; padding: 0 2px;">
            ${this.formatThaiDate(this.selectedDate)}
          </div>
          `}
          ${this.specialDate ? `
            <div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: rgba(239, 68, 68, 0.12); border: 2px solid var(--danger); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs);">
                <i data-lucide="party-popper" style="width: 20px; height: 20px; color: #f87171;"></i>
                <strong style="color: #f87171; font-size: 1.05rem;">${this.specialDate.name}</strong>
              </div>
              ${this.specialDate.description ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacing-sm);">${this.specialDate.description}</p>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
                ${this.getPriceTypeLabel(this.specialDate.priceType, this.specialDate.depositAmount)}
              </div>
            </div>
          ` : `
            <div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: rgba(16, 185, 129, 0.12); border: 1px solid var(--success); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <i data-lucide="gift" style="width: 16px; height: 16px; color: var(--success);"></i>
                <span style="color: var(--success); font-weight: 700; font-size: 0.95rem;">จองฟรี ไม่มีค่าใช้จ่าย</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; color: #fbbf24; font-size: 0.82rem; line-height: 1.5;">
                <i data-lucide="clock-alert" style="width: 14px; height: 14px; margin-top: 2px; flex-shrink: 0;"></i>
                <span>รับโต๊ะก่อน 21:00 น. — หลัง 21:00 น. ระบบจะยกเลิกโต๊ะโดยอัตโนมัติ</span>
              </div>
            </div>
          `}
        </div>

        <!-- Map View Only -->
          <div class="map-scale-outer">
            <div class="glass-card canvas-grid-bg table-map-card" style="position: relative; height: 650px; width: 800px; background: var(--bg-surface); overflow: visible; border: 1px solid var(--glass-border); box-shadow: inset 0 0 50px rgba(0,0,0,0.5);">
              <div id="map-fixtures-container" style="position: absolute; inset: 0; pointer-events: none; z-index: 1;">
              ${this.fixtures.map(f => {
                const isVertical = f.vertical;
                const styleClass = f.style === 'accent' ? 'map-el accent' : f.style === 'red' ? 'map-el red' : f.style === 'text' ? 'map-el-text' : 'map-el';
                let content = '';
                if (f.icon) content += `<div style="font-size: 1.5rem; margin-bottom: 2px;">${f.icon}</div>`;
                if (f.style === 'text') {
                  content += `<div ${isVertical ? 'class="v-text"' : ''} style="font-size: 0.8rem;">${f.label}</div>`;
                } else {
                  content += `<div ${isVertical ? 'class="v-text"' : ''} style="font-size: ${f.label.length <= 3 ? '1.4rem' : '0.9rem'}; letter-spacing: 0.1rem;">${f.label}</div>`;
                  if (f.sublabel) content += `<div style="font-size: 0.7rem; font-weight: 400;">${f.sublabel}</div>`;
                }
                return `<div class="${styleClass}" style="left: ${f.x}%; top: ${f.y}%; width: ${f.w}%; height: ${f.h}%;${f.rotation ? ` transform: rotate(${f.rotation}deg);` : ''}">${content}</div>`;
              }).join('')}
            </div>

            <div id="customer-tables-container" style="position: absolute; inset: 0; z-index: 10;">
              ${this.tables.map(table => {
                const isBooked = this.bookedTableIds.includes(table.id);
                const isHeld = this.heldByOthersTableIds.includes(table.id);
                const isSelected = this.selectedTableIds.includes(table.id);
                const isUnavailable = isBooked || isHeld;
                const tableZone = this.zones.find(z => z.id === table.zoneId);
                const isSelectable = !isUnavailable;

                // Distinct fill per state so "someone is choosing this right now" (amber)
                // reads differently from "already booked" (gray), "mine" (green) and
                // "available" (zone colour).
                let baseColor, opacity;
                if (isBooked) {
                  baseColor = '#4a4a5a'; opacity = '0.4';
                } else if (isHeld) {
                  baseColor = '#f59e0b'; opacity = '0.92';   // amber = being selected by someone
                } else if (isSelected) {
                  baseColor = '#10b981'; opacity = '1';      // green = in my selection
                } else {
                  baseColor = tableZone ? tableZone.color : '#4a4a5a'; opacity = '1';
                }
                const cursor = isSelectable ? 'pointer' : 'not-allowed';
                const boxShadow = isSelectable ? `0 4px 12px rgba(0,0,0,0.5), 0 0 5px ${baseColor}44` : 'none';

                return `
                  <div class="table-map-item ${isUnavailable ? 'booked' : ''} ${isHeld && !isBooked ? 'held' : ''} ${isSelected ? 'mine' : ''} ${isSelectable ? 'selectable' : ''}"
                       data-id="${table.id}"
                       data-zone-id="${table.zoneId}"
                       title="${isHeld && !isBooked ? 'กำลังถูกเลือกโดยลูกค้าท่านอื่น' : (isSelected ? 'แตะอีกครั้งเพื่อเอาออก' : '')}"
                       style="position: absolute; left: ${table.x}%; top: ${table.y}%; background-color: ${baseColor}; opacity: ${opacity}; cursor: ${cursor}; box-shadow: ${boxShadow};">
                    ${table.number}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="zoom-controls">
              <button class="zoom-btn" id="zoom-in">+</button>
              <button class="zoom-btn" id="zoom-reset">⟲</button>
              <button class="zoom-btn" id="zoom-out">−</button>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: var(--spacing-md); margin-top: var(--spacing-sm); background: rgba(6, 182, 212, 0.1); border: 1px solid var(--accent-neon); border-radius: var(--radius-md);">
          <p style="color: var(--accent-neon); font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;"><i data-lucide="lightbulb" style="width: 16px; height: 16px;"></i> คำแนะนำ</p>
          <p style="color: var(--text-dim); font-size: 0.75rem;">แตะโต๊ะที่ต้องการเพื่อเลือก — เลือกได้มากกว่า 1 โต๊ะ (ต้องอยู่โซนเดียวกัน) • แตะซ้ำเพื่อเอาออก • โต๊ะสีเขียวคือโต๊ะที่คุณเลือกไว้ • โต๊ะสีเทาถูกจองแล้ว • โต๊ะสีเหลืองกำลังถูกเลือกโดยลูกค้าท่านอื่น • ใช้ปุ่ม +/− เพื่อซูม</p>
        </div>
      </div>

      <style>
        /* Map Scale Wrapper */
        .map-scale-outer {
          width: 100%;
          overflow: hidden;
          border-radius: var(--radius-md);
        }

        /* Map View Styles */
        .canvas-grid-bg {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .map-el {
          position: absolute;
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.6);
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          background: rgba(255,255,255,0.02);
        }
        .map-el.accent {
          border-color: var(--accent-neon);
          color: var(--accent-neon);
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.1), inset 0 0 10px rgba(0, 255, 255, 0.05);
        }
        .map-el.red {
          border-color: #ff3366;
          color: #ff3366;
          box-shadow: 0 0 15px rgba(255, 51, 102, 0.1), inset 0 0 10px rgba(255, 51, 102, 0.05);
        }
        .map-el-text {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          border: none;
          background: none;
        }
        .v-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          letter-spacing: 0.15rem;
        }

        .table-map-item {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 0.85rem;
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 2px solid rgba(255,255,255,0.1);
          user-select: none;
        }
        .table-map-item.selectable:hover {
          transform: scale(1.15);
          box-shadow: 0 0 20px rgba(255,255,255,0.3), 0 8px 15px rgba(0,0,0,0.5) !important;
          z-index: 15;
          border-color: rgba(255,255,255,0.4);
        }
        /* Table another customer is currently holding (not yet booked) — amber fill + pulse */
        .table-map-item.held {
          border-color: rgba(255, 255, 255, 0.85) !important;
          color: #1a1a1a;
          animation: heldPulse 1.2s ease-in-out infinite;
        }
        @keyframes heldPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.95); }
        }
        /* A table in my own selection */
        .table-map-item.mine {
          border-color: #ffffff !important;
          border-width: 3px;
          transform: scale(1.08);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.8) !important;
        }
        .table-map-item.mine::after {
          content: '✓';
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          color: #10b981;
          font-size: 0.7rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        }
        .table-map-item { position: absolute; }

        /* Selection cart styles live in <head> — see ensureCartStyles() — because the
           cart itself is mounted on <body>, outside this container. */

        /* Mobile responsive - scale to fit like desktop */
        @media (max-width: 820px) {
          .table-map-card {
            transform-origin: top left;
          }
        }

        .zoom-controls {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          gap: 8px;
          z-index: 20;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          padding: 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--glass-border);
        }

        .zoom-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: var(--bg-surface);
          color: white;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          user-select: none;
        }

        .zoom-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
          transform: scale(1.1);
        }

        .zoom-btn:active {
          transform: scale(0.95);
        }
      </style>
    `;

    this.initZoom(container);
    this.attachTableEvents(container);
    this.attachDatePickerEvent(container);
    this.renderSelectionBar();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Apply mobile scale after render
    this.applyMapScale(container);
    this._resizeHandler = () => this.applyMapScale(container);
    window.addEventListener('resize', this._resizeHandler);
  }

  applyMapScale(container) {
    const outer = container.querySelector('.map-scale-outer');
    const mapCard = container.querySelector('.table-map-card');
    if (!outer || !mapCard) return;

    const mapWidth = 800;
    const mapHeight = 650;
    const availableWidth = outer.offsetWidth || outer.parentElement?.offsetWidth || window.innerWidth;

    this.mobileScale = availableWidth < mapWidth ? availableWidth / mapWidth : 1;
    this._applyTransform(mapCard, outer, mapWidth, mapHeight);
  }

  _applyTransform(mapCard, outer, mapWidth = 800, mapHeight = 650) {
    const combined = this.mobileScale * this.userZoomScale;
    mapCard.style.width = `${mapWidth}px`;
    mapCard.style.transform = `scale(${combined})`;
    mapCard.style.transformOrigin = 'top left';
    outer.style.height = `${mapHeight * combined}px`;
    // Allow scroll when user zooms in beyond mobile fit
    outer.style.overflow = this.userZoomScale > 1 ? 'auto' : 'hidden';
  }

  attachDatePickerEvent(container) {
    const datePicker = container.querySelector('#booking-date');
    if (!datePicker) return;

    datePicker.addEventListener('change', async (e) => {
      this.selectedDate = e.target.value;
      this.reservation.bookingDate = this.selectedDate;

      // Show loading state
      const mapCard = container.querySelector('.table-map-card');
      if (mapCard) {
        mapCard.style.opacity = '0.5';
        mapCard.style.pointerEvents = 'none';
      }

      // Fetch bookings and special date for the new date
      await this.fetchBookingsForDate(this.selectedDate);
      await this.fetchSpecialDate(this.selectedDate);

      // Re-render the entire view
      await this.render(container);
    });

    // Hover effect for date input
    datePicker.addEventListener('focus', () => {
      datePicker.style.borderColor = 'var(--primary)';
      datePicker.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
    });

    datePicker.addEventListener('blur', () => {
      datePicker.style.borderColor = 'var(--glass-border)';
      datePicker.style.boxShadow = 'none';
    });
  }

  initZoom(container) {
    const mapCard = container.querySelector('.table-map-card');
    const outer = container.querySelector('.map-scale-outer');
    if (!mapCard || !outer) return;

    const btnZoomIn = container.querySelector('#zoom-in');
    const btnZoomReset = container.querySelector('#zoom-reset');
    const btnZoomOut = container.querySelector('#zoom-out');
    if (!btnZoomIn || !btnZoomOut || !btnZoomReset) return;

    const minUserZoom = 0.5;
    const maxUserZoom = 3;

    const applyZoom = () => this._applyTransform(mapCard, outer);

    btnZoomIn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.userZoomScale = Math.min(maxUserZoom, this.userZoomScale + 0.2);
      applyZoom();
    });

    btnZoomOut.addEventListener('click', (e) => {
      e.stopPropagation();
      this.userZoomScale = Math.max(minUserZoom, this.userZoomScale - 0.2);
      applyZoom();
    });

    btnZoomReset.addEventListener('click', (e) => {
      e.stopPropagation();
      this.userZoomScale = 1;
      applyZoom();
    });

    let initialDistance = 0;
    let initialUserZoom = 1;

    mapCard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialUserZoom = this.userZoomScale;
      }
    }, { passive: false });

    mapCard.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.userZoomScale = Math.min(maxUserZoom, Math.max(minUserZoom, initialUserZoom * (dist / initialDistance)));
        applyZoom();
      }
    }, { passive: false });
  }

  detectAndFixCollisions(container) {
    const tableElements = container.querySelectorAll('.table-select');
    const tables = Array.from(tableElements);
    const mapCard = container.querySelector('.table-map-card');
    const collisionAlert = container.querySelector('#collision-alert');

    if (!mapCard) return;

    const containerRect = mapCard.getBoundingClientRect();
    const tableSize = 44; // px
    const minDistance = tableSize * 1.2; // 20% buffer
    let collisionCount = 0;

    tables.forEach((el, i) => {
      const rect1 = el.getBoundingClientRect();
      const x1 = rect1.left + rect1.width / 2;
      const y1 = rect1.top + rect1.height / 2;

      tables.slice(i + 1).forEach(el2 => {
        const rect2 = el2.getBoundingClientRect();
        const x2 = rect2.left + rect2.width / 2;
        const y2 = rect2.top + rect2.height / 2;

        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        // If collision detected
        if (distance < minDistance) {
          collisionCount++;

          // Add warning visual
          el.classList.add('collision-warning');
          el2.classList.add('collision-warning');

          // Auto-adjust position slightly
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const offset = (minDistance - distance) / 2;

          const origX1 = parseFloat(el.getAttribute('data-x'));
          const origY1 = parseFloat(el.getAttribute('data-y'));
          const origX2 = parseFloat(el2.getAttribute('data-x'));
          const origY2 = parseFloat(el2.getAttribute('data-y'));

          // Calculate percentage offset
          const offsetX = (Math.cos(angle) * offset / containerRect.width) * 100;
          const offsetY = (Math.sin(angle) * offset / containerRect.height) * 100;

          // Apply micro-adjustment
          el.style.left = `${origX1 - offsetX}%`;
          el.style.top = `${origY1 - offsetY}%`;
          el2.style.left = `${origX2 + offsetX}%`;
          el2.style.top = `${origY2 + offsetY}%`;
        }
      });
    });

    // Show alert if collisions found
    if (collisionCount > 0 && collisionAlert) {
      collisionAlert.style.display = 'block';
      console.warn(`⚠️ Found ${collisionCount} table collisions - auto-adjusted positions`);
    }
  }

  attachTableEvents(container) {
    // Map view tables only. Tapping toggles the table in/out of the selection —
    // a booking may cover several tables, so there is no per-table confirm popup;
    // the selection bar at the bottom carries the totals and the confirm button.
    container.querySelectorAll('.table-map-item.selectable').forEach(el => {
      el.addEventListener('click', () => {
        const tableId = parseInt(el.getAttribute('data-id'));
        const zoneId = parseInt(el.getAttribute('data-zone-id'));
        this.toggleTable(tableId, zoneId, el);
      });
    });
  }

  selectedTables() {
    return this.selectedTableIds
      .map(id => this.tables.find(t => t.id === id))
      .filter(Boolean);
  }

  // The zone the current selection belongs to. Tables must share a zone: pricing is
  // per-zone minimum spend and the rest of the flow carries a single zone.
  currentZone() {
    const first = this.selectedTables()[0];
    return first ? this.zones.find(z => z.id === first.zoneId) : null;
  }

  async toggleTable(tableId, zoneId, el) {
    const isSelected = this.selectedTableIds.includes(tableId);

    if (!isSelected) {
      const zone = this.currentZone();
      if (zone && zone.id !== zoneId) {
        const other = this.zones.find(z => z.id === zoneId);
        await showAlert(
          `เลือกได้เฉพาะโต๊ะในโซนเดียวกันครับ\n\nตอนนี้เลือกโซน ${zone.name} ไว้อยู่ ` +
          `ถ้าต้องการโต๊ะในโซน ${other ? other.name : 'อื่น'} กรุณาเอาโต๊ะเดิมออกก่อน`
        );
        return;
      }
    }

    if (el) el.style.pointerEvents = 'none';

    try {
      if (isSelected) {
        await client.delete('/holds', {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, tableId })
        });
        this.selectedTableIds = this.selectedTableIds.filter(id => id !== tableId);
      } else {
        // Claim the table immediately so no one else can pick it. The server starts
        // the countdown and returns when the hold expires (must pay before then).
        const hold = await client.post('/holds', {
          tableId,
          bookingDate: this.selectedDate,
          sessionId: this.sessionId
        });
        this.selectedTableIds = [...this.selectedTableIds, tableId];
        this.holdExpiresAt = hold.expiresAt;
      }

      this.paintTable(tableId);
      this.renderSelectionBar();
    } catch (error) {
      // Someone grabbed it first (booked or held) — tell the user and refresh the map.
      await showAlert(error.message || 'ไม่สามารถเลือกโต๊ะนี้ได้ กรุณาเลือกโต๊ะอื่น');
      if (this.container) await this.render(this.container);
      return;
    } finally {
      if (el) el.style.pointerEvents = '';
    }
  }

  // Repaint one table in place rather than re-rendering the whole map, so the
  // customer's zoom and scroll position survive a tap.
  paintTable(tableId) {
    if (!this.container) return;
    const el = this.container.querySelector(`.table-map-item[data-id="${tableId}"]`);
    const table = this.tables.find(t => t.id === tableId);
    if (!el || !table) return;

    const isSelected = this.selectedTableIds.includes(tableId);
    const zone = this.zones.find(z => z.id === table.zoneId);
    el.classList.toggle('mine', isSelected);
    el.style.backgroundColor = isSelected ? '#10b981' : (zone ? zone.color : '#4a4a5a');
    el.title = isSelected ? 'แตะอีกครั้งเพื่อเอาออก' : '';
  }

  // Minimum spend for the whole selection. Mirrors Payment.js — one table's price
  // multiplied by the number of tables booked.
  selectionPricing() {
    const count = this.selectedTableIds.length;
    const zone = this.currentZone();
    if (!count || !zone) return { total: 0, free: true, perTable: 0 };

    const sd = this.specialDate;
    if (!sd || !sd.isActive || sd.priceType === 'free') {
      return { total: 0, free: true, perTable: 0 };
    }
    const perTable = sd.priceType === 'custom'
      ? (sd.depositAmount || 0)
      : zone.minSpend;
    return { total: perTable * count, free: false, perTable };
  }

  // The cart is mounted on <body>, not inside the step container: #step-content
  // keeps `transform: translateY(0)` from its entry animation (fill-mode forwards),
  // and any transform other than `none` makes that element the containing block for
  // `position: fixed` descendants — the bar would scroll away instead of floating.
  // Styles go in <head> for the same reason, so they outlive the container's markup.
  ensureCartStyles() {
    if (document.querySelector('#selection-cart-styles')) return;
    const style = document.createElement('style');
    style.id = 'selection-cart-styles';
    style.textContent = `
      .selection-cart {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 900;
        background: rgba(14, 10, 10, 0.96);
        backdrop-filter: blur(14px);
        border-top: 2px solid var(--success);
        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.7);
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        animation: cartSlideUp 0.28s cubic-bezier(0.17, 0.84, 0.44, 1);
      }
      @keyframes cartSlideUp {
        from { transform: translateY(110%); }
        to   { transform: translateY(0); }
      }
      .selection-cart .cart-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .selection-cart .cart-chips {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: thin;
      }
      .selection-cart .cart-chips::-webkit-scrollbar { height: 4px; }
      .selection-cart .cart-chips::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2); border-radius: 2px;
      }
      .selection-cart .cart-chip {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px 5px 12px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.55);
        color: #fff;
        font-family: 'Outfit', sans-serif;
        font-weight: 700;
        font-size: 0.9rem;
        white-space: nowrap;
      }
      .selection-cart .cart-chip button {
        background: rgba(255,255,255,0.16);
        border: none;
        color: #fff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.85rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        padding: 0;
      }
      .selection-cart .cart-chip button:hover { background: var(--danger); }
      .selection-cart .cart-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .selection-cart .cart-summary { flex: 1; min-width: 0; }
      .selection-cart .cart-meta {
        font-size: 0.78rem;
        color: rgba(255,255,255,0.55);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .selection-cart .cart-total {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 1.35rem;
        color: #fff;
        line-height: 1.2;
      }
      .selection-cart .cart-total.free { color: var(--success); font-size: 1.1rem; }
      .selection-cart .btn-cart-clear {
        flex: 0 0 auto;
        padding: 0 16px;
        height: 48px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.75);
        font-family: inherit;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .selection-cart .btn-cart-clear:hover { background: rgba(255,255,255,0.12); color: #fff; }
      .selection-cart .btn-cart-confirm {
        flex: 0 0 auto;
        min-width: 190px;
        height: 48px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, var(--success), #059669);
        color: #fff;
        font-family: inherit;
        font-size: 1.02rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
      }
      .selection-cart .btn-cart-confirm:active { transform: scale(0.985); }

      /* Keep the page's own content clear of the floating bar. */
      body.has-selection-cart { padding-bottom: 168px; }

      @media (max-width: 560px) {
        .selection-cart .btn-cart-confirm { min-width: 0; flex: 1; font-size: 0.95rem; }
        .selection-cart .cart-total { font-size: 1.2rem; }
        body.has-selection-cart { padding-bottom: 190px; }
      }
    `;
    document.head.appendChild(style);
  }

  removeSelectionCart() {
    document.querySelector('#selection-cart')?.remove();
    document.body.classList.remove('has-selection-cart');
  }

  renderSelectionBar() {
    this.ensureCartStyles();

    const tables = this.selectedTables();
    const zone = this.currentZone();

    // Nothing chosen yet — like a shopping cart, the bar simply isn't there.
    if (!tables.length || !zone) {
      this.removeSelectionCart();
      return;
    }

    const price = this.selectionPricing();
    const seats = zone.seatsPerTable * tables.length;

    let cart = document.querySelector('#selection-cart');
    if (!cart) {
      cart = document.createElement('div');
      cart.id = 'selection-cart';
      cart.className = 'selection-cart';
      document.body.appendChild(cart);
      document.body.classList.add('has-selection-cart');
    }

    cart.innerHTML = `
      <div class="cart-inner">
        <div class="cart-chips">
          ${tables.map(t => `
            <span class="cart-chip">
              ${t.number}
              <button type="button" data-remove="${t.id}" aria-label="เอาโต๊ะ ${t.number} ออก">&times;</button>
            </span>
          `).join('')}
        </div>
        <div class="cart-row">
          <div class="cart-summary">
            <div class="cart-meta">${tables.length} โต๊ะ · ${seats} ที่นั่ง · โซน ${zone.name}</div>
            <div class="cart-total ${price.free ? 'free' : ''}">
              ${price.free ? '🎉 จองฟรี' : `฿${price.total.toLocaleString()}`}
              ${price.free ? '' : `<span style="font-size:0.72rem; font-weight:500; color:rgba(255,255,255,0.5);">(฿${price.perTable.toLocaleString()} × ${tables.length})</span>`}
            </div>
          </div>
          <button type="button" class="btn-cart-clear" id="btn-clear-selection">ล้าง</button>
          <button type="button" class="btn-cart-confirm" id="btn-confirm-selection">
            ยืนยัน ${tables.length} โต๊ะ →
          </button>
        </div>
      </div>`;

    cart.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-remove'));
        const table = this.tables.find(t => t.id === id);
        this.toggleTable(id, table ? table.zoneId : null);
      });
    });

    cart.querySelector('#btn-clear-selection').addEventListener('click', async () => {
      for (const id of [...this.selectedTableIds]) {
        const table = this.tables.find(t => t.id === id);
        await this.toggleTable(id, table ? table.zoneId : null);
      }
    });

    cart.querySelector('#btn-confirm-selection').addEventListener('click', () => this.confirmSelection());
  }

  confirmSelection() {
    const tables = this.selectedTables();
    const zone = this.currentZone();
    if (!tables.length || !zone) return;

    // `seats` is the capacity of the whole booking — the guest-count step compares
    // against it to decide whether an extra table is needed.
    this.reservation.zone = { ...zone, seats: zone.seatsPerTable * tables.length };
    this.reservation.tables = tables;
    this.reservation.tableIds = tables.map(t => t.id);
    this.reservation.tableCount = tables.length;
    // First table mirrored into the legacy single-table fields.
    this.reservation.table = tables[0];
    this.reservation.tableId = tables[0].id;
    this.reservation.bookingDate = this.selectedDate;
    if (this.holdExpiresAt) this.reservation.holdExpiresAt = this.holdExpiresAt;

    this.onSelect(this.reservation.zone);
  }
}
