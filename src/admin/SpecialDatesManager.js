import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class SpecialDatesManager {
  constructor() {
    this.specialDates = [];
    this.editingId = null;
  }

  async render(container) {
    await this.fetchSpecialDates();

    container.innerHTML = `
      <div class="special-dates-manager animate-fade">
        <div class="admin-header" style="margin-bottom: var(--spacing-xl);">
          <h2 class="font-heading" style="font-size: 1.75rem; margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: 12px;">
            <span>📅</span> จัดการวันพิเศษและอีเวนท์
          </h2>
          <p style="color: var(--text-dim); font-size: 0.9rem;">กำหนดราคา และเงื่อนไขสำหรับวันพิเศษ</p>
        </div>

        <!-- Add/Edit Form -->
        <div style="background: rgba(12,3,3,0.8); border: 1px solid rgba(212,32,32,0.2); border-radius: 16px; margin-bottom: var(--spacing-xl); padding: 20px;">
          <h3 class="font-heading" style="font-size: 1rem; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; color: white;" id="form-title">
            <span style="width: 28px; height: 28px; background: rgba(212,32,32,0.2); border-radius: 8px; display:inline-flex; align-items:center; justify-content:center; font-size:0.9rem;">➕</span>
            เพิ่มวันพิเศษใหม่
          </h3>

          <form id="special-date-form">
            <div style="display: grid; gap: 14px;">

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label for="date-input">วันที่</label>
                  <input type="date" id="date-input" required>
                </div>
                <div class="form-group">
                  <label for="price-type-select">ประเภทราคา</label>
                  <select id="price-type-select" required>
                    <option value="free">ฟรี</option>
                    <option value="normal">ปกติ - ตามโซน</option>
                    <option value="full">เต็มจำนวน</option>
                    <option value="custom">กำหนดเอง</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="name-input">ชื่ออีเวนท์</label>
                <input type="text" id="name-input" placeholder="เช่น คอนเสิร์ต Mirrr, วันหยุดพิเศษ" required>
              </div>

              <div class="form-group">
                <label for="description-input">รายละเอียด (ไม่บังคับ)</label>
                <textarea id="description-input" rows="2" placeholder="รายละเอียดเพิ่มเติม..." style="resize: none;"></textarea>
              </div>

              <div class="form-group" id="custom-deposit-group" style="display: none;">
                <label for="deposit-amount-input">จำนวนเงินมัดจำ (บาท)</label>
                <input type="number" id="deposit-amount-input" min="0" step="1" placeholder="เช่น 500">
              </div>

              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.88rem; color: rgba(255,255,255,0.6);">
                <input type="checkbox" id="deposit-required-checkbox" checked style="width: auto; accent-color: var(--primary);">
                จำเป็นต้องจ่ายเงินมัดจำ
              </label>

              <div style="display: flex; gap: 10px; padding-top: 4px;">
                <button type="submit" class="btn btn-primary" style="flex: 1; height: 44px; font-size: 0.95rem;">
                  <span id="btn-submit-text">เพิ่มวันพิเศษ</span>
                </button>
                <button type="button" id="btn-cancel" class="btn btn-ghost" style="display: none; height: 44px; padding: 0 18px; font-size: 0.9rem;">
                  ยกเลิก
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Special Dates List -->
        <div style="background: rgba(12,3,3,0.8); border: 1px solid rgba(212,32,32,0.2); border-radius: 16px; padding: 20px;">
          <h3 class="font-heading" style="font-size: 1rem; font-weight: 700; margin-bottom: 16px; color: white;">
            วันพิเศษทั้งหมด
          </h3>

          <div id="special-dates-list">
            ${this.renderSpecialDatesList()}
          </div>
        </div>
      </div>
    `;

    this.attachEvents(container);
  }

  renderSpecialDatesList() {
    if (this.specialDates.length === 0) {
      return `
        <div style="text-align: center; padding: var(--spacing-xl); color: var(--text-dim);">
          <div style="font-size: 3rem; margin-bottom: var(--spacing-md); opacity: 0.3;">📅</div>
          <p>ยังไม่มีวันพิเศษ</p>
        </div>
      `;
    }

    return this.specialDates.map(sd => {
      const date = new Date(sd.date);
      const formattedDate = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });

      const priceTypeLabels = {
        free: '🎁 ฟรี',
        normal: '💵 ปกติ',
        full: '💰 เต็มจำนวน',
        custom: '💳 กำหนดเอง'
      };

      return `
        <div class="special-date-item" data-id="${sd.id}" style="padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(212,32,32,0.15); border-radius: 12px; margin-bottom: 10px; ${!sd.isActive ? 'opacity: 0.5;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 0.95rem; color: white; margin-bottom: 3px;">${sd.name}</div>
              <div style="font-size: 0.78rem; color: rgba(255,255,255,0.4); margin-bottom: 8px;">${formattedDate}</div>
              ${sd.description ? `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.35); margin-bottom: 8px;">${sd.description}</div>` : ''}
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <span style="background: rgba(212,32,32,0.15); color: #ff7070; padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 600;">${priceTypeLabels[sd.priceType]}</span>
                ${sd.priceType === 'custom' && sd.depositAmount ? `<span style="background: rgba(255,255,255,0.08); color: white; padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 600;">฿${sd.depositAmount.toLocaleString()}</span>` : ''}
                ${sd.depositRequired ? `<span style="background: rgba(16,185,129,0.12); color: #34d399; padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 600;">ต้องมัดจำ</span>` : `<span style="background: rgba(239,68,68,0.1); color: #f87171; padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 600;">ไม่ต้องมัดจำ</span>`}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
              <button class="btn-edit" data-id="${sd.id}" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-family: inherit;">แก้ไข</button>
              <button class="btn-toggle" data-id="${sd.id}" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); cursor: pointer; font-family: inherit;">${sd.isActive ? 'ปิด' : 'เปิด'}</button>
              <button class="btn-delete" data-id="${sd.id}" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; border: 1px solid rgba(212,32,32,0.3); background: rgba(212,32,32,0.08); color: #f87171; cursor: pointer; font-family: inherit;">ลบ</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async fetchSpecialDates() {
    try {
      this.specialDates = await client.get('/special-dates');
    } catch (error) {
      console.error('Failed to fetch special dates:', error);
      this.specialDates = [];
    }
  }

  attachEvents(container) {
    const form = container.querySelector('#special-date-form');
    const priceTypeSelect = container.querySelector('#price-type-select');
    const customDepositGroup = container.querySelector('#custom-deposit-group');
    const btnCancel = container.querySelector('#btn-cancel');

    // Show/hide custom deposit amount based on price type
    priceTypeSelect.addEventListener('change', () => {
      if (priceTypeSelect.value === 'custom') {
        customDepositGroup.style.display = 'block';
      } else {
        customDepositGroup.style.display = 'none';
      }
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(container);
    });

    // Cancel edit
    btnCancel.addEventListener('click', () => {
      this.resetForm(container);
    });

    // Edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        this.editSpecialDate(id, container);
      });
    });

    // Toggle active buttons
    container.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        await this.toggleActive(id, container);
      });
    });

    // Delete buttons
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        await this.deleteSpecialDate(id, container);
      });
    });
  }

  async handleSubmit(container) {
    const date = container.querySelector('#date-input').value;
    const name = container.querySelector('#name-input').value;
    const description = container.querySelector('#description-input').value;
    const priceType = container.querySelector('#price-type-select').value;
    const depositRequired = container.querySelector('#deposit-required-checkbox').checked;
    const depositAmount = container.querySelector('#deposit-amount-input').value;

    const data = {
      date,
      name,
      description: description || null,
      priceType,
      depositRequired,
      depositAmount: priceType === 'custom' && depositAmount ? parseFloat(depositAmount) : null
    };

    try {
      if (this.editingId) {
        await client.patch(`/special-dates/${this.editingId}`, data);
        await showAlert('แก้ไขวันพิเศษสำเร็จ');
      } else {
        await client.post('/special-dates', data);
        await showAlert('เพิ่มวันพิเศษสำเร็จ');
      }

      this.resetForm(container);
      await this.render(container);
    } catch (error) {
      console.error('Submit error:', error);
      await showAlert('เกิดข้อผิดพลาด: ' + error.message);
    }
  }

  editSpecialDate(id, container) {
    const sd = this.specialDates.find(s => s.id === id);
    if (!sd) return;

    this.editingId = id;

    const date = new Date(sd.date);
    const dateStr = date.toISOString().split('T')[0];

    container.querySelector('#form-title').textContent = '✏️ แก้ไขวันพิเศษ';
    container.querySelector('#date-input').value = dateStr;
    container.querySelector('#name-input').value = sd.name;
    container.querySelector('#description-input').value = sd.description || '';
    container.querySelector('#price-type-select').value = sd.priceType;
    container.querySelector('#deposit-required-checkbox').checked = sd.depositRequired;
    container.querySelector('#deposit-amount-input').value = sd.depositAmount || '';
    container.querySelector('#btn-submit-text').textContent = 'บันทึกการแก้ไข';
    container.querySelector('#btn-cancel').style.display = 'block';

    if (sd.priceType === 'custom') {
      container.querySelector('#custom-deposit-group').style.display = 'block';
    }

    // Scroll to form
    container.querySelector('#special-date-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetForm(container) {
    this.editingId = null;
    container.querySelector('#form-title').textContent = '➕ เพิ่มวันพิเศษใหม่';
    container.querySelector('#special-date-form').reset();
    container.querySelector('#btn-submit-text').textContent = 'เพิ่มวันพิเศษ';
    container.querySelector('#btn-cancel').style.display = 'none';
    container.querySelector('#custom-deposit-group').style.display = 'none';
  }

  async toggleActive(id, container) {
    const sd = this.specialDates.find(s => s.id === id);
    if (!sd) return;

    try {
      await client.patch(`/special-dates/${id}`, {
        isActive: !sd.isActive
      });
      await this.render(container);
    } catch (error) {
      console.error('Toggle error:', error);
      await showAlert('เกิดข้อผิดพลาด');
    }
  }

  async deleteSpecialDate(id, container) {
    const confirmed = await showConfirm('คุณต้องการลบวันพิเศษนี้ใช่หรือไม่?');
    if (!confirmed) return;

    try {
      await client.delete(`/special-dates/${id}`);
      await showAlert('ลบวันพิเศษสำเร็จ');
      await this.render(container);
    } catch (error) {
      console.error('Delete error:', error);
      await showAlert('เกิดข้อผิดพลาด');
    }
  }
}
