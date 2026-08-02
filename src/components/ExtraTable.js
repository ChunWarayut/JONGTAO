export default class ExtraTable {
  constructor(reservation, onNext, onPrev) {
    this.reservation = reservation;
    this.onNext = onNext;
    this.onPrev = onPrev;
  }

  render(container) {
    const { zone } = this.reservation;
    // The booking's own minimum spend scales with how many tables were selected;
    // the extra table is a separate add-on charged once.
    const tableCount = this.reservation.tableCount || this.reservation.tableIds?.length || 1;
    const baseMinSpend = zone.minSpend * tableCount;
    const totalMinSpend = baseMinSpend + (this.reservation.extraTable ? zone.extraTableCost : 0);

    container.innerHTML = `
      <div class="extra-table-container animate-fade">
        <button id="btn-back" class="btn btn-ghost" style="margin-bottom: var(--spacing-lg); padding: 10px 20px; font-weight: 700;">
          <span style="margin-right: 8px;">←</span> ย้อนกลับ
        </button>
        
        <div class="resp-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-xl); align-items: start;">
          <div class="glass-card" style="padding: var(--spacing-xl);">
            <h2 class="font-heading" style="margin-bottom: var(--spacing-md); font-size: 1.75rem;">เสริมโต๊ะ (เพิ่มได้ 1 ตัว)</h2>
            <p style="color: var(--text-dim); margin-bottom: var(--spacing-xl); font-weight: 500;">คุณต้องการเพิ่มโต๊ะเสริม 1 ตัว (+2 ท่าน) หรือไม่?</p>
            
            <div class="extra-table-panel-inner" style="background: rgba(255, 255, 255, 0.03); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-xl); transition: border-color 0.3s;" id="extra-table-panel">
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 44px; height: 44px; background: rgba(124, 58, 237, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--accent-neon);">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </div>
                <div>
                  <h4 class="font-heading" style="color: var(--text-main); font-size: 1.1rem;">โต๊ะเสริม (+1 ตัว)</h4>
                  <p style="font-size: 0.85rem; color: var(--text-dim); font-weight: 500;">ขยายพื้นที่เพื่อความสบาย</p>
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <p style="font-weight: 800; font-size: 1.25rem; font-family: 'Outfit'; color: var(--accent-neon);">฿${zone.extraTableCost.toLocaleString()}</p>
                <label class="switch">
                  <input type="checkbox" id="extra-table-toggle" ${this.reservation.extraTable ? 'checked' : ''}>
                  <span class="slider round"></span>
                </label>
              </div>
            </div>

            <div style="padding: var(--spacing-lg); background: rgba(0,0,0,0.2); border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-dim);">
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
                <li style="display: flex; gap: 10px;"><span>📌</span> <strong>เพิ่มได้สูงสุด 1 ตัวเท่านั้น</strong> ต่อการจอง 1 ครั้ง</li>
                <li style="display: flex; gap: 10px;"><span>⚡</span> โต๊ะเสริมจะถูกวางติดกับโต๊ะหลักในโซนที่คุณเลือก</li>
                <li style="display: flex; gap: 10px;"><span>⚡</span> การยกเลิกต้องทำก่อนเวลาเข้าร้านอย่างน้อย 2 ชม.</li>
              </ul>
            </div>
          </div>

          <!-- Price Summary -->
          <div class="glass-card" style="border-color: var(--primary); box-shadow: 0 12px 40px rgba(124, 58, 237, 0.15); padding: var(--spacing-xl);">
            <h3 class="font-heading" style="margin-bottom: var(--spacing-xl); font-size: 1.5rem; color: var(--text-main);">สรุปรายการจอง</h3>
            <div style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-bottom: var(--spacing-xl);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-dim); font-weight: 500;">โซน ${zone.name} (${zone.code})${tableCount > 1 ? ` × ${tableCount} โต๊ะ` : ''}</span>
                <span style="font-weight: 700;">฿${baseMinSpend.toLocaleString()}</span>
              </div>
              <div id="summary-extra" style="display: ${this.reservation.extraTable ? 'flex' : 'none'}; justify-content: space-between; align-items: center; color: var(--accent-neon);">
                <span style="font-weight: 500;">เพิ่มโต๊ะเสริม (1 ตัว)</span>
                <span style="font-weight: 700;">+ ฿${zone.extraTableCost.toLocaleString()}</span>
              </div>
              <div style="border-top: 1px solid var(--glass-border); margin-top: 8px; padding-top: var(--spacing-lg); display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">ยอดสั่งซื้อขั้นต่ำรวมโต๊ะเสริม</div>
                  <div style="font-size: 0.7rem; color: var(--text-dim);">(สำหรับสั่งอาหารและเครื่องดื่ม)</div>
                </div>
                <span id="total-price-display" style="font-size: 2rem; font-weight: 800; font-family: 'Outfit'; color: var(--accent-neon);">฿${totalMinSpend.toLocaleString()}</span>
              </div>
            </div>
            <button id="btn-next" class="btn btn-primary" style="width: 100%; height: 60px; font-size: 1.25rem; font-weight: 800;">ดำเนินการต่อ <span style="margin-left: 8px;">→</span></button>
          </div>
        </div>
      </div>

      <style>
        .switch { position: relative; display: inline-block; width: 52px; height: 28px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--glass-border); transition: .4s; border-radius: 34px; border: 1px solid rgba(255,255,255,0.05); }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(24px); }
      </style>
    `;

    this.attachEvents(container);
  }

  attachEvents(container) {
    const toggle = container.querySelector('#extra-table-toggle');
    const summaryExtra = container.querySelector('#summary-extra');
    const totalPriceDisplay = container.querySelector('#total-price-display');
    const { zone } = this.reservation;

    const tableCount = this.reservation.tableCount || this.reservation.tableIds?.length || 1;

    toggle.addEventListener('change', (e) => {
      this.reservation.extraTable = e.target.checked;
      const total = zone.minSpend * tableCount + (this.reservation.extraTable ? zone.extraTableCost : 0);

      summaryExtra.style.display = this.reservation.extraTable ? 'flex' : 'none';
      totalPriceDisplay.textContent = `฿${total.toLocaleString()}`;

      if (window.app && window.app.saveToStorage) {
        window.app.saveToStorage();
      }
    });

    container.querySelector('#btn-back').addEventListener('click', () => {
      this.onPrev();
    });

    container.querySelector('#btn-next').addEventListener('click', () => {
      this.onNext();
    });
  }
}
