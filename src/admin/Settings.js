import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class Settings {
  async render(container) {
    try {
      const config = await client.get('/config');

      container.innerHTML = `
        <div class="glass-card animate-fade" style="margin-bottom: var(--spacing-lg);">
          <h2 class="font-heading" style="margin-bottom: var(--spacing-md);">ตั้งค่าระบบ ⚙️</h2>
          <p style="color: var(--text-muted); margin-bottom: var(--spacing-xl);">จัดการเวลาทำการและสถานะการรับจอง</p>

          <form id="settings-form" style="display: grid; gap: var(--spacing-lg);">
            
            <div class="form-group" style="padding: var(--spacing-md); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <span style="font-weight: 700; font-size: 1.1rem;">เปิดรับจองโต๊ะสำหรับวันนี้</span>
                  <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">หากปิดกั้น ลูกค้าจะไม่สามารถทำการจองใหม่ได้</div>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="isBookingOpen" ${config.isBookingOpen ? 'checked' : ''}>
                  <span class="slider"></span>
                </div>
              </label>
            </div>

            <div class="form-group" style="padding: var(--spacing-md); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div>
                  <span style="font-weight: 700; font-size: 1.1rem;">ต้องชำระค่ามัดจำจองโต๊ะ</span>
                  <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">หากปิดกั้น การจองจะฟรีและข้ามขั้นตอนการชำระเงิน</div>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="isBookingFeeRequired" ${config.isBookingFeeRequired ? 'checked' : ''}>
                  <span class="slider"></span>
                </div>
              </label>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
              <div class="form-group">
                <label>เวลาเปิดรับจอง</label>
                <input type="time" id="openTime" value="${config.openTime}" class="form-control-pro" style="margin-top: 8px;">
              </div>
              <div class="form-group">
                <label>เวลาปิดรับจอง</label>
                <input type="time" id="closeTime" value="${config.closeTime}" class="form-control-pro" style="margin-top: 8px;">
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="padding: 12px; font-size: 1rem; margin-top: var(--spacing-md);">บันทึกการตั้งค่า</button>
          </form>
        </div>

        <style>
          .toggle-switch { position: relative; display: inline-block; width: 60px; height: 34px; }
          .toggle-switch input { opacity: 0; width: 0; height: 0; }
          .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; }
          .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: var(--text-muted); transition: .4s; border-radius: 50%; }
          input:checked + .slider { background-color: var(--primary); }
          input:focus + .slider { box-shadow: 0 0 1px var(--primary); }
          input:checked + .slider:before { transform: translateX(26px); background-color: white; }
          .form-control-pro {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            color: white;
            width: 100%;
            box-sizing: border-box;
          }
        </style>
      `;

      this.attachEvents(container);
    } catch (error) {
      container.innerHTML = `<p class="error">Error loading settings: ${error.message}</p>`;
    }
  }

  attachEvents(container) {
    container.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        isBookingOpen: container.querySelector('#isBookingOpen').checked,
        isBookingFeeRequired: container.querySelector('#isBookingFeeRequired').checked,
        openTime: container.querySelector('#openTime').value,
        closeTime: container.querySelector('#closeTime').value
      };

      try {
        await client.patch('/config', payload);
        await showAlert('บันทึกการตั้งค่าสำเร็จ!');
      } catch (err) {
        await showAlert('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message);
      }
    });
  }
}
