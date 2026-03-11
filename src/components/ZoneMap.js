import client from '../api/client.js';

export default class ZoneMap {
  constructor(reservation, onSelect) {
    this.reservation = reservation;
    this.onSelect = onSelect;
    this.zones = [];
    this.tables = [];
    this.fixtures = [];
    this.bookedTableIds = [];
    this.selectedZone = null;
    this.selectedTable = null;
    this.viewMode = 'zones'; // 'zones' or 'tables'
    this.currentScale = 1; // Persist zoom across re-renders
  }

  async render(container) {
    try {
      this.zones = await client.get('/zones');
      this.tables = await client.get('/tables');
      this.fixtures = await client.get('/fixtures');
      // Fetch public bookings status without authentication
      const bookings = await client.get('/bookings/public-status');
      this.bookedTableIds = bookings
        .filter(b => b.status !== 'cancelled' && b.tableId)
        .map(b => b.tableId);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }

    this.renderView(container);
  }

  renderView(container) {
    if (this.viewMode === 'zones') {
      this.renderZonesView(container);
    } else {
      this.renderTablesView(container);
    }
  }

  renderZonesView(container) {
    container.innerHTML = `
      <div class="zone-map-container animate-fade">
        <h2 class="font-heading" style="margin-bottom: var(--spacing-lg); font-size: 1.5rem; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.25rem;">📍</span> สำหรับจองวันที่: <span id="current-date" style="color: var(--accent-neon);">${new Date().toLocaleDateString('th-TH')}</span>
        </h2>
        
        <div class="zone-grid resp-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-xl); align-items: start;">
          <div class="glass-card canvas-grid-bg" style="padding: var(--spacing-xl); text-align: center; background: var(--bg-surface); border: 1px solid var(--glass-border); position: relative; overflow: hidden;">
            <div id="zone-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
              ${this.zones.map(zone => `
                <div class="zone-card-btn" data-zone-code="${zone.code}" style="
                  background: ${zone.color}22;
                  border: 2px solid ${zone.color};
                  border-radius: 12px;
                  padding: 20px 12px;
                  cursor: pointer;
                  transition: all 0.3s ease;
                  text-align: center;
                ">
                  <div style="font-size: 1.1rem; font-weight: 800; color: white; font-family: 'Outfit', sans-serif; margin-bottom: 4px;">${zone.code}</div>
                  <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7);">${zone.name}</div>
                  <div style="font-size: 0.7rem; color: ${zone.color}; margin-top: 8px; font-weight: 700; font-family: 'Outfit';">฿${zone.minSpend.toLocaleString()}</div>
                  <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 2px;">${zone.availableTables}/${zone.totalTables} โต๊ะว่าง</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div id="zone-detail-panel" style="min-height: 240px;">
            <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; border-style: dashed; border-color: var(--glass-border); gap: 16px;">
              <div style="font-size: 2.5rem; opacity: 0.3;">📍</div>
              <p style="text-align: center; color: var(--text-dim); font-weight: 500;">กรุณาเลือกโซนที่ต้องการจองบนแผนที่</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .canvas-grid-bg {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .zone-card-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.4);
          filter: brightness(1.2);
        }
      </style>
    `;

    this.attachZoneEvents(container);
  }

  renderTablesView(container) {
    if (!this.selectedZone) return;

    container.innerHTML = `
      <div class="animate-fade">
        <div class="table-view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); gap: 20px;">
          <button id="btn-back-to-zones" class="btn btn-ghost" style="padding: 10px 18px; font-size: 0.9rem;">
            <span style="margin-right: 8px;">←</span> เลือกโซนใหม่
          </button>
          <h2 class="font-heading" style="text-align: center; flex-grow: 1; font-size: 1.75rem;">
            โหมดเลือกโต๊ะ: <span style="color: ${this.selectedZone.color}">${this.selectedZone.name}</span>
          </h2>
          <div class="spacer-div" style="width: 140px;"></div> <!-- Spacer for centering -->
        </div>

        <div class="table-view-grid" style="display: grid; grid-template-columns: 1fr 380px; gap: var(--spacing-xl); align-items: start;">
          <div class="glass-card canvas-grid-bg table-map-card" style="position: relative; height: 650px; background: var(--bg-surface); overflow: hidden; border: 1px solid var(--glass-border); box-shadow: inset 0 0 50px rgba(0,0,0,0.5);">
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
      const isCurrentZone = table.zoneId === this.selectedZone.id;
      const isBooked = this.bookedTableIds.includes(table.id);
      const isActive = this.selectedTable?.id === table.id;
      const isSelectable = isCurrentZone && !isBooked;

      const baseColor = isSelectable ? (this.selectedZone.color || 'var(--primary)') : '#4a4a5a';
      const opacity = isSelectable ? '1' : '0.5';
      const cursor = isSelectable ? 'pointer' : 'not-allowed';
      const boxShadow = isSelectable ? `0 4px 12px rgba(0,0,0,0.5), 0 0 ${isActive ? '15px' : '5px'} ${baseColor}44` : 'none';

      return `
                  <div class="table-select ${isBooked ? 'booked' : ''} ${!isCurrentZone ? 'other-zone' : ''} ${isActive ? 'active' : ''}" 
                       data-id="${table.id}"
                       style="position: absolute; left: ${table.x}%; top: ${table.y}%; background-color: ${baseColor}; opacity: ${opacity}; cursor: ${cursor}; box-shadow: ${boxShadow};">
                    ${table.number}
                  </div>
                `;
    }).join('')}
            </div>
          </div>
          <p class="swipe-hint" style="display: none; text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 8px 0; opacity: 0.7;">👆 ใช้ปุ่ม +/− หรือบีบนิ้วเพื่อซูม</p>

          <div id="table-confirm-panel">
            <div class="glass-card" style="padding: var(--spacing-xl); border-color: ${this.selectedTable ? 'var(--primary)' : 'var(--glass-border)'}; transition: all 0.3s ease;">
              ${this.selectedTable ? `
                <div class="animate-fade">
                  <h3 class="font-heading" style="color: var(--accent-neon); margin-bottom: 8px; font-size: 1.5rem;">จองโต๊ะ ${this.selectedTable.number}</h3>
                  <p style="color: var(--text-dim); margin-bottom: var(--spacing-lg); font-size: 0.95rem;">คุณกำลังเลือกโต๊ะที่ดีที่สุดใน <strong style="color: white;">${this.selectedZone.name}</strong></p>
                  
                  <div style="padding: var(--spacing-lg); background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-xl);">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                          <span style="color: var(--text-dim); font-weight: 500;">ราคาจองขั้นต่ำ</span>
                          <span style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit';">฿${this.selectedZone.minSpend.toLocaleString()}</span>
                      </div>
                      <div style="font-size: 0.8rem; color: var(--text-dim); text-align: right;">* ยอดล่วงหน้านี้สามารถสั่งอาหาร/เครื่องดื่มในร้านได้เต็มจำนวน</div>
                  </div>
                  
                  <button id="btn-confirm-table" class="btn btn-primary" style="width: 100%; height: 56px; font-size: 1.1rem; font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: var(--radius-md);">
                      ดำเนินการต่อ <span style="margin-left: 8px;">→</span>
                  </button>
                </div>
              ` : `
                <div style="text-align: center; padding: 40px 0;">
                  <div style="font-size: 2rem; margin-bottom: 20px; opacity: 0.3;">🪑</div>
                  <p style="color: var(--text-dim); font-weight: 500; line-height: 1.5;">กรุณาคลิกเลือกเลขโต๊ะ<br>ที่คุณต้องการจองบนแผนที่</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      <style>
        .map-el { position: absolute; border: 2px solid rgba(255,255,255,0.15); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); font-weight: 700; font-family: 'Outfit', sans-serif; background: rgba(255,255,255,0.02); }
        .map-el.accent { border-color: var(--accent-neon); color: var(--accent-neon); box-shadow: 0 0 15px rgba(0, 255, 255, 0.1), inset 0 0 10px rgba(0, 255, 255, 0.05); }
        .map-el.red { border-color: #ff3366; color: #ff3366; box-shadow: 0 0 15px rgba(255, 51, 102, 0.1), inset 0 0 10px rgba(255, 51, 102, 0.05); }
        .map-el-text { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); font-weight: 700; font-family: 'Outfit', sans-serif; border: none; background: none; }
        .v-text { writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0.15rem; }

        .table-select {
          width: 48px;
          height: 48px;
          border-radius: 50%;
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
        .table-select:hover:not(.booked):not(.other-zone) { 
          transform: scale(1.15); 
          box-shadow: 0 0 20px rgba(255,255,255,0.2), 0 8px 15px rgba(0,0,0,0.5) !important; 
          z-index: 10;
          border-color: rgba(255,255,255,0.3);
        }
        .table-select.active { 
          border: 3px solid white; 
          transform: scale(1.2); 
          box-shadow: 0 0 25px var(--accent-neon) !important; 
          z-index: 20;
          opacity: 1 !important;
        }

        .zoom-controls {
          position: absolute;
          bottom: 12px;
          right: 12px;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          padding: 8px;
          border-radius: 24px;
        }
        .zoom-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: var(--bg-surface);
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .zoom-btn:active {
          transform: scale(0.9);
        }
      </style>
    `;

    this.attachTableEvents(container);
    this.initZoom(container);
  }

  initZoom(container) {
    const mapCard = container.querySelector('.table-map-card');
    if (!mapCard) return;

    const tablesContainer = mapCard.querySelector('#customer-tables-container');
    if (!tablesContainer) return;

    let scale = this.currentScale;
    const minScale = 0.8;
    const maxScale = 2;

    // Add zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
      <button class="zoom-btn zoom-in-btn">+</button>
      <span class="zoom-level" style="font-size: 0.7rem; color: var(--text-dim); font-family: 'Outfit'; min-width: 40px; text-align: center;">${Math.round(scale * 100)}%</span>
      <button class="zoom-btn zoom-out-btn">−</button>
    `;
    mapCard.appendChild(zoomControls);

    const zoomLabel = zoomControls.querySelector('.zoom-level');

    const applyZoom = () => {
      tablesContainer.style.transform = `scale(${scale})`;
      tablesContainer.style.transformOrigin = 'center center';
      zoomLabel.textContent = `${Math.round(scale * 100)}%`;
      this.currentScale = scale; // Persist across re-renders
    };

    // Apply saved zoom immediately
    if (scale !== 1) applyZoom();

    zoomControls.querySelector('.zoom-in-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      scale = Math.min(maxScale, scale + 0.2);
      applyZoom();
    });

    zoomControls.querySelector('.zoom-out-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      scale = Math.max(minScale, scale - 0.2);
      applyZoom();
    });

    // Pinch-to-zoom
    let initialDistance = 0;
    let initialScale = 1;

    mapCard.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
      }
    }, { passive: false });

    mapCard.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        scale = Math.min(maxScale, Math.max(minScale, initialScale * (dist / initialDistance)));
        applyZoom();
      }
    }, { passive: false });
  }

  attachZoneEvents(container) {
    container.querySelectorAll('.zone-card-btn').forEach(card => {
      card.addEventListener('click', () => {
        const code = card.getAttribute('data-zone-code');
        this.selectedZone = this.zones.find(z => z.code === code);
        this.renderDetailPanel(this.selectedZone, container);
      });
    });
  }

  renderDetailPanel(zone, container) {
    const panel = container.querySelector('#zone-detail-panel');
    if (!panel || !zone) return;

    panel.innerHTML = `
      <div class="glass-card animate-fade" style="padding: var(--spacing-lg); border-color: ${zone.color || 'var(--primary)'};">
        <h3 class="font-heading" style="color: ${zone.color || 'white'}; margin-bottom: var(--spacing-sm); font-size: 1.5rem;">${zone.name}</h3>
        <p style="font-size: 1.25rem; color: var(--accent-neon); font-weight: 800; font-family: 'Outfit'; margin-bottom: var(--spacing-lg);">Min. Spend ฿${zone.minSpend.toLocaleString()}</p>
        <button id="btn-go-to-tables" class="btn btn-primary" style="width: 100%; height: 50px; font-weight: 700;">ตกลง และเลือกโต๊ะ</button>
      </div>
    `;

    panel.querySelector('#btn-go-to-tables').addEventListener('click', () => {
      this.viewMode = 'tables';
      this.renderView(container);
    });
  }

  attachTableEvents(container) {
    container.querySelector('#btn-back-to-zones')?.addEventListener('click', () => {
      this.viewMode = 'zones';
      this.selectedTable = null;
      this.renderView(container);
    });

    container.querySelectorAll('.table-select:not(.booked):not(.other-zone)').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.getAttribute('data-id'));
        this.selectedTable = this.tables.find(t => t.id === id);
        this.renderTablesView(container);
      });
    });

    container.querySelector('#btn-confirm-table')?.addEventListener('click', () => {
      if (!this.selectedZone || !this.selectedTable) return;

      this.reservation.zone = { ...this.selectedZone, seats: this.selectedZone.seatsPerTable };
      this.reservation.table = this.selectedTable;
      this.reservation.tableId = this.selectedTable.id;
      this.onSelect(this.reservation.zone);
    });
  }
}
