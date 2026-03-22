import client from '../api/client.js';

export default class AllZonesTableMap {
  constructor(reservation, onSelect) {
    this.reservation = reservation;
    this.onSelect = onSelect;
    this.zones = [];
    this.tables = [];
    this.fixtures = [];
    this.bookedTableIds = [];
    this.selectedTable = null;
    this.selectedZone = null;
    this.mobileScale = 1;
    this.userZoomScale = 1;
    this.selectedDate = this.reservation.bookingDate || this.getTodayDate();
    this.specialDate = null;
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
      if (this.specialDate) {
        this.reservation.specialDate = this.specialDate;
      }
    } catch (error) {
      console.error('Failed to fetch special date:', error);
      this.specialDate = null;
    }
  }

  async fetchBookingsForDate(date) {
    try {
      const bookings = await client.get(`/bookings/public-status?date=${date}`);
      this.bookedTableIds = bookings
        .filter(b => b.status !== 'cancelled' && b.tableId)
        .map(b => b.tableId);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      this.bookedTableIds = [];
    }
  }

  renderAllZonesMap(container) {
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
          <label for="booking-date" style="display: block; margin-bottom: var(--spacing-sm); font-weight: 600; color: var(--text-muted); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calendar" style="width: 16px; height: 16px;"></i> เลือกวันที่จอง
          </label>
          <div style="display: flex; gap: var(--spacing-md); align-items: center; flex-wrap: wrap;">
            <input
              type="date"
              id="booking-date"
              value="${this.selectedDate}"
              min="${minDate}"
              max="${maxDateStr}"
              style="flex: 1; min-width: 200px; padding: 14px; background: var(--bg-surface); border: 2px solid var(--glass-border); border-radius: var(--radius-md); color: white; font-size: 1rem; font-family: inherit; cursor: pointer; transition: all 0.2s ease;"
            />
            <div style="flex: 1; min-width: 200px; color: var(--accent-neon); font-weight: 600; font-size: 0.95rem;">
              ${this.formatThaiDate(this.selectedDate)}
            </div>
          </div>
          ${this.specialDate ? `
            <div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: rgba(124, 58, 237, 0.15); border: 2px solid var(--primary); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs);">
                <i data-lucide="party-popper" style="width: 20px; height: 20px; color: var(--accent-neon);"></i>
                <strong style="color: var(--accent-neon); font-size: 1.05rem;">${this.specialDate.name}</strong>
              </div>
              ${this.specialDate.description ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacing-sm);">${this.specialDate.description}</p>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm);">
                ${this.getPriceTypeLabel(this.specialDate.priceType, this.specialDate.depositAmount)}
              </div>
            </div>
          ` : ''}
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
                const tableZone = this.zones.find(z => z.id === table.zoneId);
                const isSelectable = !isBooked;

                const baseColor = isSelectable && tableZone ? tableZone.color : '#4a4a5a';
                const opacity = isSelectable ? '1' : '0.4';
                const cursor = isSelectable ? 'pointer' : 'not-allowed';
                const boxShadow = isSelectable ? `0 4px 12px rgba(0,0,0,0.5), 0 0 5px ${baseColor}44` : 'none';

                return `
                  <div class="table-map-item ${isBooked ? 'booked' : ''} ${isSelectable ? 'selectable' : ''}"
                       data-id="${table.id}"
                       data-zone-id="${table.zoneId}"
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
          <p style="color: var(--text-dim); font-size: 0.75rem;">โต๊ะที่มีไอคอน <i data-lucide="lock" style="width: 12px; height: 12px; display: inline;"></i> หรือสีเทาถูกจองแล้ว • คลิกโต๊ะที่ต้องการเพื่อดูรายละเอียดและจอง • ใช้ปุ่ม +/− เพื่อซูม</p>
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

      // Fetch bookings for the new date
      await this.fetchBookingsForDate(this.selectedDate);

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
    // Map view tables only
    container.querySelectorAll('.table-map-item.selectable').forEach(el => {
      el.addEventListener('click', () => {
        const tableId = parseInt(el.getAttribute('data-id'));
        const zoneId = parseInt(el.getAttribute('data-zone-id'));

        this.selectedTable = this.tables.find(t => t.id === tableId);
        this.selectedZone = this.zones.find(z => z.id === zoneId);

        if (this.selectedTable && this.selectedZone) {
          this.showTablePopup();
        }
      });
    });
  }

  showTablePopup() {
    const backdrop = document.createElement('div');
    backdrop.className = 'table-popup-backdrop';
    backdrop.innerHTML = `
      <div class="table-popup-modal">
        <div class="table-popup-content glass-card" style="border-color: ${this.selectedZone.color};">
          <button class="popup-close-btn" aria-label="Close">&times;</button>

          <div class="popup-header" style="text-align: center; margin-bottom: var(--spacing-lg);">
            <i data-lucide="armchair" style="width: 60px; height: 60px; margin-bottom: var(--spacing-sm); color: ${this.selectedZone.color};"></i>
            <h3 class="font-heading" style="color: ${this.selectedZone.color}; font-size: 2rem; margin-bottom: var(--spacing-xs);">
              โต๊ะ ${this.selectedTable.number}
            </h3>
            <p style="color: var(--text-dim); font-size: 0.95rem;">
              โซน <strong style="color: white;">${this.selectedZone.name}</strong>
            </p>
          </div>

          <div class="popup-body">
            <div style="padding: var(--spacing-lg); background: rgba(124, 58, 237, 0.1); border: 2px solid var(--primary); border-radius: var(--radius-md); margin-bottom: var(--spacing-lg); text-align: center;">
              <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;"><i data-lucide="calendar" style="width: 14px; height: 14px;"></i> วันที่จอง</div>
              <div style="color: white; font-weight: 700; font-size: 1rem;">${this.formatThaiDate(this.selectedDate)}</div>
            </div>

            <div style="padding: var(--spacing-lg); background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-xl);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span style="color: var(--text-dim); font-weight: 500;">ราคาจองขั้นต่ำ</span>
                <span style="font-weight: 800; font-size: 1.5rem; font-family: 'Outfit'; color: var(--accent-neon);">฿${this.selectedZone.minSpend.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid rgba(255,255,255,0.05);">
                <span style="color: var(--text-dim); font-weight: 500;">ความจุต่อโต๊ะ</span>
                <span style="font-weight: 700; font-size: 1.1rem; font-family: 'Outfit';">${this.selectedZone.seatsPerTable} ที่นั่ง</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: var(--spacing-md); line-height: 1.4;">
                * ยอดล่วงหน้าสามารถใช้สั่งอาหาร/เครื่องดื่มในร้านได้เต็มจำนวน
              </div>
            </div>

            <button id="btn-confirm-table-popup" class="btn btn-primary" style="width: 100%; height: 56px; font-size: 1.15rem; font-weight: 700; background: linear-gradient(135deg, ${this.selectedZone.color}, var(--primary)); border-radius: var(--radius-md);">
              ยืนยันเลือกโต๊ะนี้ <span style="margin-left: 8px;">→</span>
            </button>
          </div>
        </div>
      </div>

      <style>
        .table-popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .table-popup-modal {
          width: 100%;
          max-width: 480px;
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .table-popup-content {
          position: relative;
          padding: var(--spacing-xl);
          background: var(--bg-surface);
          border-radius: var(--radius-lg);
          border: 2px solid var(--glass-border);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          max-height: 90vh;
          overflow-y: auto;
        }

        .popup-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .popup-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        @media (max-width: 480px) {
          .table-popup-content {
            padding: var(--spacing-lg);
          }

          .popup-header h3 {
            font-size: 1.75rem !important;
          }
        }
      </style>
    `;

    document.body.appendChild(backdrop);

    const closePopup = () => {
      backdrop.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => backdrop.remove(), 200);
    };

    backdrop.querySelector('.popup-close-btn').addEventListener('click', closePopup);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closePopup();
    });

    backdrop.querySelector('#btn-confirm-table-popup').addEventListener('click', () => {
      this.reservation.zone = { ...this.selectedZone, seats: this.selectedZone.seatsPerTable };
      this.reservation.table = this.selectedTable;
      this.reservation.tableId = this.selectedTable.id;
      closePopup();
      this.onSelect(this.reservation.zone);
    });

    const fadeOutStyle = document.createElement('style');
    fadeOutStyle.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(fadeOutStyle);

    // Initialize Lucide icons for popup
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}
