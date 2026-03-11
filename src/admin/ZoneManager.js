import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class ZoneManager {
  async render(container) {
    try {
      const zones = await client.get('/zones');

      container.innerHTML = `
        <div class="glass-card" style="margin-bottom: var(--spacing-lg); display: flex; justify-content: space-between; align-items: center;">
          <p style="color: var(--text-muted);">ตั้งค่าผังร้าน ราคาขั้นต่ำ และความจุของโต๊ะ</p>
          <button id="btn-add-zone" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.8rem;">+ เพิ่มโซนใหม่</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg);">
          ${zones.map(zone => `
            <div class="glass-card animate-fade" style="border-top: 4px solid ${zone.color};">
              <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-md);">
                <h3 style="color: ${zone.color};">${zone.code} - ${zone.name}</h3>
                <span style="font-size: 0.75rem; background: var(--bg-surface); padding: 2px 8px; border-radius: 4px;">ID: ${zone.id}</span>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                <div class="form-group" style="grid-column: 1 / -1;">
                  <label style="font-size: 0.75rem;">สีของโซน (Zone Color)</label>
                  <input type="color" value="${zone.color}" class="zone-input" data-id="${zone.id}" data-field="color" style="width: 100%; height: 40px; padding: 2px; border-radius: 4px; border: 1px solid var(--glass-border); background: transparent; cursor: pointer;">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.75rem;">ยอดขั้นต่ำ (Min Spend)</label>
                  <input type="number" value="${zone.minSpend}" class="zone-input" data-id="${zone.id}" data-field="minSpend">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.75rem;">จำนวนโต๊ะรวม</label>
                  <input type="number" value="${zone.totalTables}" class="zone-input" data-id="${zone.id}" data-field="totalTables">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.75rem;">ค่าพื้นที่โต๊ะเสริม</label>
                  <input type="number" value="${zone.extraTableCost}" class="zone-input" data-id="${zone.id}" data-field="extraTableCost">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.75rem;">ที่นั่ง/โต๊ะ</label>
                  <input type="number" value="${zone.seatsPerTable}" class="zone-input" data-id="${zone.id}" data-field="seatsPerTable">
                </div>
              </div>

              <div style="display: flex; gap: var(--spacing-sm);">
                <button class="btn btn-primary btn-save-zone" data-id="${zone.id}" style="flex: 1; padding: 8px; font-size: 0.8rem;">บันทึกข้อมูล</button>
                <button class="btn btn-ghost btn-delete-zone" data-id="${zone.id}" style="padding: 8px; font-size: 0.8rem; border-color: var(--danger); color: var(--danger);">ลบโซน</button>
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
    // Save
    container.querySelectorAll('.btn-save-zone').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const inputs = container.querySelectorAll(`.zone-input[data-id="${id}"]`);
        const data = {};
        inputs.forEach(input => {
          const field = input.getAttribute('data-field');
          data[field] = field === 'color' ? input.value : parseFloat(input.value);
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
