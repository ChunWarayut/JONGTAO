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

            <!-- Bank Account Info -->
            <div style="padding: var(--spacing-md); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
              <h3 style="font-weight: 700; font-size: 1rem; margin-bottom: var(--spacing-sm);">ข้อมูลบัญชีธนาคาร / ช่องทางรับชำระเงิน</h3>
              <p style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: var(--spacing-md);">ข้อมูลนี้จะแสดงให้ลูกค้าเห็นในขั้นตอนชำระเงิน</p>
              <div style="display: grid; gap: var(--spacing-md);">
                <div class="form-group">
                  <label style="font-size: 0.9rem; color: var(--text-dim);">ชื่อธนาคาร</label>
                  <input type="text" id="bankName" value="${config.bankName || ''}" placeholder="เช่น ธนาคารกสิกรไทย" class="form-control-pro" style="margin-top: 6px;">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.9rem; color: var(--text-dim);">เลขบัญชี</label>
                  <input type="text" id="bankAccountNumber" value="${config.bankAccountNumber || ''}" placeholder="เช่น 123-4-56789-0" class="form-control-pro" style="margin-top: 6px;">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.9rem; color: var(--text-dim);">ชื่อบัญชี</label>
                  <input type="text" id="bankAccountName" value="${config.bankAccountName || ''}" placeholder="เช่น นาย สมชาย ใจดี" class="form-control-pro" style="margin-top: 6px;">
                </div>
                <div class="form-group">
                  <label style="font-size: 0.9rem; color: var(--text-dim);">เบอร์ / เลขบัตรประชาชน PromptPay</label>
                  <input type="text" id="promptPayNumber" value="${config.promptPayNumber || ''}" placeholder="เช่น 0812345678" class="form-control-pro" style="margin-top: 6px;">
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="padding: 12px; font-size: 1rem; margin-top: var(--spacing-md);">บันทึกการตั้งค่า</button>
          </form>
        </div>

        <!-- Link Generator Card -->
        <div class="glass-card animate-fade" style="margin-bottom: var(--spacing-lg); padding: var(--spacing-lg);">
          <h3 class="font-heading" style="margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: 10px;">
            <i data-lucide="link" style="width: 20px; height: 20px; color: var(--primary);"></i> สร้างลิ้งจองสำหรับ Event
          </h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacing-md);">สร้างลิ้งที่กำหนดวันที่ไว้ล่วงหน้า ลูกค้าคลิกแล้วจองได้เลยโดยไม่ต้องเลือกวันเอง</p>
          <div style="display: flex; gap: var(--spacing-md); align-items: flex-end; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 200px;">
              <label style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 6px; display: block;">เลือกวันที่ Event</label>
              <input type="date" id="event-date-picker" class="form-control-pro" style="margin-top: 0;">
            </div>
            <button type="button" id="btn-generate-link" class="btn btn-primary" style="padding: 12px 20px; white-space: nowrap;">
              <i data-lucide="link-2" style="width: 16px; height: 16px; display: inline; vertical-align: middle; margin-right: 6px;"></i>สร้างลิ้ง
            </button>
          </div>
          <div id="generated-link-box" style="display: none; margin-top: var(--spacing-md); padding: var(--spacing-md); background: rgba(212, 32, 32, 0.08); border: 1px solid var(--primary); border-radius: var(--radius-md);">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">ลิ้งสำหรับแชร์ให้ลูกค้า</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <code id="generated-link-text" style="flex: 1; font-size: 0.85rem; color: var(--primary); word-break: break-all; font-family: monospace;"></code>
              <button type="button" id="btn-copy-link" class="btn btn-ghost" style="padding: 8px 14px; font-size: 0.8rem; white-space: nowrap; flex-shrink: 0;">
                <i data-lucide="copy" style="width: 14px; height: 14px; display: inline; vertical-align: middle;"></i> คัดลอก
              </button>
            </div>
          </div>
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
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      container.innerHTML = `<p class="error">Error loading settings: ${error.message}</p>`;
    }
  }

  attachEvents(container) {
    // Link generator
    container.querySelector('#btn-generate-link').addEventListener('click', () => {
      const dateVal = container.querySelector('#event-date-picker').value;
      if (!dateVal) {
        return;
      }
      const origin = window.location.origin;
      const link = `${origin}/?date=${dateVal}`;
      container.querySelector('#generated-link-text').textContent = link;
      container.querySelector('#generated-link-box').style.display = 'block';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    container.querySelector('#btn-copy-link').addEventListener('click', async () => {
      const text = container.querySelector('#generated-link-text').textContent;
      await navigator.clipboard.writeText(text);
      const btn = container.querySelector('#btn-copy-link');
      btn.textContent = 'คัดลอกแล้ว!';
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px; display: inline; vertical-align: middle;"></i> คัดลอก';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }, 2000);
    });

    container.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        isBookingOpen: container.querySelector('#isBookingOpen').checked,
        isBookingFeeRequired: container.querySelector('#isBookingFeeRequired').checked,
        openTime: container.querySelector('#openTime').value,
        closeTime: container.querySelector('#closeTime').value,
        bankName: container.querySelector('#bankName').value,
        bankAccountNumber: container.querySelector('#bankAccountNumber').value,
        bankAccountName: container.querySelector('#bankAccountName').value,
        promptPayNumber: container.querySelector('#promptPayNumber').value
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
