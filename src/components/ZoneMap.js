import client from '../api/client.js';

export default class ZoneMap {
  constructor(reservation, onSelect) {
    this.reservation = reservation;
    this.onSelect = onSelect;
    this.zones = [];
    this.tables = [];
    this.bookedTableIds = [];
    this.selectedZone = null;
    this.selectedTable = null;
    this.viewMode = 'zones'; // 'zones' or 'tables'
  }

  async render(container) {
    try {
      this.zones = await client.get('/zones');
      this.tables = await client.get('/tables');
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
            <div id="svg-map-wrapper">
              <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">
                <rect x="250" y="20" width="300" height="60" rx="12" fill="rgba(0, 255, 255, 0.05)" stroke="var(--accent-neon)" stroke-width="2" style="filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.2));" />
                <text x="400" y="58" text-anchor="middle" fill="var(--accent-neon)" font-weight="800" font-family="'Outfit', sans-serif" style="font-size: 1.25rem; letter-spacing: 0.1em;">STAGE / เวที</text>
                
                <g class="zone-group" data-zone-code="A" style="cursor: pointer;">
                  <rect x="150" y="120" width="500" height="100" rx="16" fill="#FF2D55" fill-opacity="0.15" stroke="#FF2D55" stroke-width="2" class="zone-rect" />
                  <text x="400" y="178" text-anchor="middle" fill="white" font-weight="700" font-family="'Outfit', sans-serif">Zone A - หน้าเวที</text>
                </g>

                <g class="zone-group" data-zone-code="B" style="cursor: pointer;">
                  <rect x="150" y="240" width="500" height="100" rx="16" fill="#32D74B" fill-opacity="0.15" stroke="#32D74B" stroke-width="2" class="zone-rect" />
                  <text x="400" y="298" text-anchor="middle" fill="white" font-weight="700" font-family="'Outfit', sans-serif">Zone B - กลางร้าน</text>
                </g>

                <g class="zone-group" data-zone-code="C" style="cursor: pointer;">
                  <rect x="150" y="360" width="340" height="100" rx="16" fill="#FFD60A" fill-opacity="0.15" stroke="#FFD60A" stroke-width="2" class="zone-rect" />
                  <text x="320" y="418" text-anchor="middle" fill="white" font-weight="700" font-family="'Outfit', sans-serif">Zone C - ด้านหลัง</text>
                </g>

                <g class="zone-group" data-zone-code="VIP" style="cursor: pointer;">
                  <rect x="510" y="360" width="140" height="100" rx="16" fill="#007AFF" fill-opacity="0.15" stroke="#007AFF" stroke-width="2" class="zone-rect" />
                  <text x="580" y="418" text-anchor="middle" fill="white" font-weight="700" font-family="'Outfit', sans-serif">VIP</text>
                </g>
              </svg>
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
        .zone-group:hover .zone-rect {
          fill-opacity: 0.3;
          stroke-width: 3;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));
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
            <div style="position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: 50%; max-width: 400px; height: 80px; background: rgba(0, 255, 255, 0.05); border: 2px solid var(--accent-neon); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--accent-neon); font-weight: 800; font-family: 'Outfit', sans-serif; box-shadow: 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 15px rgba(0, 255, 255, 0.1); letter-spacing: 0.2rem;">
              <div style="font-size: 1.2rem;">STAGE</div>
              <div style="font-size: 0.8rem; opacity: 0.7; font-weight: 500;">เวทีการแสดง</div>
            </div>
            
            <div id="customer-tables-container" style="position: absolute; inset: 0;">
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

    let scale = 1;
    const minScale = 0.8;
    const maxScale = 2;

    // Add zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
      <button class="zoom-btn" id="zoom-in" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--glass-border); background: var(--bg-surface); color: white; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
      <span class="zoom-level" style="font-size: 0.7rem; color: var(--text-dim); font-family: 'Outfit'; min-width: 40px; text-align: center;">100%</span>
      <button class="zoom-btn" id="zoom-out" style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--glass-border); background: var(--bg-surface); color: white; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
    `;
    zoomControls.style.cssText = 'position: absolute; bottom: 12px; right: 12px; z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 4px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); padding: 8px; border-radius: 24px;';
    mapCard.appendChild(zoomControls);

    const zoomLabel = zoomControls.querySelector('.zoom-level');

    const applyZoom = () => {
      tablesContainer.style.transform = `scale(${scale})`;
      tablesContainer.style.transformOrigin = 'center center';
      zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    };

    zoomControls.querySelector('#zoom-in').addEventListener('click', (e) => {
      e.stopPropagation();
      scale = Math.min(maxScale, scale + 0.2);
      applyZoom();
    });

    zoomControls.querySelector('#zoom-out').addEventListener('click', (e) => {
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
    container.querySelectorAll('.zone-group').forEach(group => {
      group.addEventListener('click', () => {
        const code = group.getAttribute('data-zone-code');
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
