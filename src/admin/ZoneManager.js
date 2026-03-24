import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class ZoneManager {
  async render(container) {
    try {
      const zones = await client.get('/zones');

      container.innerHTML = `
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(12,3,3,0.8); border: 1px solid rgba(212,32,32,0.2); border-radius: 14px;">
          <p style="color: rgba(255,255,255,0.45); font-size: 0.85rem; margin: 0;">ตั้งค่าผังร้าน ราคาขั้นต่ำ และความจุของโต๊ะ</p>
          <button id="btn-add-zone" class="btn btn-primary" style="padding: 10px 16px; font-size: 0.85rem; white-space: nowrap; flex-shrink: 0;">+ เพิ่มโซน</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${zones.map(zone => `
            <div style="background: rgba(12,3,3,0.85); border: 1px solid rgba(212,32,32,0.2); border-top: 3px solid ${zone.color}; border-radius: 14px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <span style="font-weight: 700; font-size: 1rem; color: white;">${zone.code}</span>
                  <span style="font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-left: 6px;">${zone.name}</span>
                </div>
                <span style="font-size: 0.72rem; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); padding: 3px 10px; border-radius: 6px;">ID: ${zone.id}</span>
              </div>

              <div style="display: grid; gap: 10px; margin-bottom: 14px;">
                <!-- Color row -->
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 6px;">สีโซน</label>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="color" value="${zone.color}" class="zone-input" data-id="${zone.id}" data-field="color"
                      style="width: 44px; height: 36px; padding: 2px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: transparent; cursor: pointer; flex-shrink: 0;">
                    <input type="text" value="${zone.color}" class="zone-color-hex zone-input-hex" data-id="${zone.id}"
                      style="flex:1; background:#1c0a0a; border:1px solid rgba(212,32,32,0.25); border-radius:10px; padding:8px 12px; color:white; font-size:0.9rem; font-family:monospace; -webkit-appearance:none;">
                  </div>
                </div>

                <!-- 2-col grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <label style="display:block; font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:5px;">ยอดขั้นต่ำ (฿)</label>
                    <input type="number" value="${zone.minSpend}" class="zone-input" data-id="${zone.id}" data-field="minSpend"
                      style="width:100%; background:#1c0a0a; border:1px solid rgba(212,32,32,0.25); border-radius:10px; padding:9px 12px; color:white; font-size:0.9rem; box-sizing:border-box; -webkit-appearance:none;">
                  </div>
                  <div>
                    <label style="display:block; font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:5px;">จำนวนโต๊ะ</label>
                    <input type="number" value="${zone.totalTables}" class="zone-input" data-id="${zone.id}" data-field="totalTables"
                      style="width:100%; background:#1c0a0a; border:1px solid rgba(212,32,32,0.25); border-radius:10px; padding:9px 12px; color:white; font-size:0.9rem; box-sizing:border-box; -webkit-appearance:none;">
                  </div>
                  <div>
                    <label style="display:block; font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:5px;">ค่าโต๊ะเสริม (฿)</label>
                    <input type="number" value="${zone.extraTableCost}" class="zone-input" data-id="${zone.id}" data-field="extraTableCost"
                      style="width:100%; background:#1c0a0a; border:1px solid rgba(212,32,32,0.25); border-radius:10px; padding:9px 12px; color:white; font-size:0.9rem; box-sizing:border-box; -webkit-appearance:none;">
                  </div>
                  <div>
                    <label style="display:block; font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.4); margin-bottom:5px;">ที่นั่ง/โต๊ะ</label>
                    <input type="number" value="${zone.seatsPerTable}" class="zone-input" data-id="${zone.id}" data-field="seatsPerTable"
                      style="width:100%; background:#1c0a0a; border:1px solid rgba(212,32,32,0.25); border-radius:10px; padding:9px 12px; color:white; font-size:0.9rem; box-sizing:border-box; -webkit-appearance:none;">
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary btn-save-zone" data-id="${zone.id}" style="flex: 1; height: 42px; font-size: 0.9rem; font-weight: 700;">บันทึกข้อมูล</button>
                <button class="btn-delete-zone" data-id="${zone.id}" style="height: 42px; padding: 0 16px; font-size: 0.85rem; border-radius: 10px; border: 1px solid rgba(212,32,32,0.4); background: rgba(212,32,32,0.08); color: #f87171; cursor: pointer; font-family: inherit; font-weight: 600;">ลบโซน</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      this.attachEvents(container);
    } catch (error) {
      container.innerHTML = `<p class="error">Error loading zones: ${error.message}</p>`;
    }
  }

  attachEvents(container) {
    // Sync color picker ↔ hex input
    container.querySelectorAll('.zone-input[data-field="color"]').forEach(picker => {
      const id = picker.getAttribute('data-id');
      const hexInput = container.querySelector(`.zone-color-hex[data-id="${id}"]`);
      if (!hexInput) return;
      picker.addEventListener('input', () => { hexInput.value = picker.value; });
      hexInput.addEventListener('change', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) picker.value = hexInput.value;
      });
    });

    // Save
    container.querySelectorAll('.btn-save-zone').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const inputs = container.querySelectorAll(`.zone-input[data-id="${id}"]`);
        const hexInput = container.querySelector(`.zone-color-hex[data-id="${id}"]`);
        const data = {};
        inputs.forEach(input => {
          const field = input.getAttribute('data-field');
          if (field === 'color') {
            data[field] = hexInput?.value || input.value;
          } else {
            data[field] = parseFloat(input.value);
          }
        });

        try {
          await client.put(`/zones/${id}`, data);
          await showAlert('บันทึกข้อมูลโซนสำเร็จ');
        } catch (err) {
          await showAlert('อัพเดทไม่สำเร็จ: ' + err.message);
        }
      });
    });

    // Delete
    container.querySelectorAll('.btn-delete-zone').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!(await showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบโซนนี้?'))) return;
        const id = btn.getAttribute('data-id');
        try {
          await client.delete(`/zones/${id}`);
          this.render(container);
        } catch (err) {
          await showAlert('ลบไม่สำเร็จ: ' + err.message);
        }
      });
    });

    // Add zone
    container.querySelector('#btn-add-zone')?.addEventListener('click', async () => {
      // Build a modal for adding a zone
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div class="glass-card" style="padding: 24px; min-width: 380px; max-width: 90vw;">
          <h3 style="margin-bottom: 16px; text-align: center;">เพิ่มโซนใหม่</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label style="font-size: 0.75rem;">รหัสโซน (Code)</label>
              <input type="text" id="nz-code" class="form-control" placeholder="เช่น D, E, F" />
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">ชื่อโซน</label>
              <input type="text" id="nz-name" class="form-control" placeholder="เช่น Zone D - Outdoor" />
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">สีโซน</label>
              <input type="color" id="nz-color" value="#a855f7" style="width:100%;height:40px;border-radius:4px;border:1px solid var(--glass-border);background:transparent;cursor:pointer;" />
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">ยอดขั้นต่ำ (Min Spend)</label>
              <input type="number" id="nz-minspend" class="form-control" value="2000" />
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">จำนวนโต๊ะ</label>
              <input type="number" id="nz-tables" class="form-control" value="10" />
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">ที่นั่ง/โต๊ะ</label>
              <input type="number" id="nz-seats" class="form-control" value="4" />
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label style="font-size: 0.75rem;">ค่าพื้นที่โต๊ะเสริม</label>
              <input type="number" id="nz-extra" class="form-control" value="500" />
            </div>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
            <button id="nz-cancel" class="btn btn-ghost">ยกเลิก</button>
            <button id="nz-confirm" class="btn btn-primary">สร้างโซน</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#nz-cancel').addEventListener('click', () => overlay.remove());

      overlay.querySelector('#nz-confirm').addEventListener('click', async () => {
        const code = overlay.querySelector('#nz-code').value.trim();
        const name = overlay.querySelector('#nz-name').value.trim();
        if (!code || !name) return await showAlert('กรุณากรอกรหัสและชื่อโซน');

        try {
          await client.post('/zones', {
            code,
            name,
            color: overlay.querySelector('#nz-color').value,
            minSpend: parseFloat(overlay.querySelector('#nz-minspend').value) || 0,
            totalTables: parseInt(overlay.querySelector('#nz-tables').value) || 0,
            seatsPerTable: parseInt(overlay.querySelector('#nz-seats').value) || 4,
            extraTableCost: parseFloat(overlay.querySelector('#nz-extra').value) || 0
          });
          overlay.remove();
          await showAlert('สร้างโซนสำเร็จ!');
          this.render(container);
        } catch (err) {
          await showAlert('สร้างโซนไม่สำเร็จ: ' + err.message);
        }
      });
    });
  }
}
