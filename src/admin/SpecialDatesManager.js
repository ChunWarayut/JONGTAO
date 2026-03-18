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
        <div class="glass-card" style="margin-bottom: var(--spacing-xl); padding: var(--spacing-lg);">
          <h3 class="font-heading" style="font-size: 1.25rem; margin-bottom: var(--spacing-lg);" id="form-title">
            ➕ เพิ่มวันพิเศษใหม่
          </h3>

          <form id="special-date-form">
            <div class="form-grid" style="display: grid; gap: var(--spacing-md);">
              <!-- Date -->
              <div class="form-group">
                <label for="date-input">📆 วันที่</label>
                <input type="date" id="date-input" required style="width: 100%;">
              </div>

              <!-- Name -->
              <div class="form-group">
                <label for="name-input">🎉 ชื่ออีเวนท์</label>
                <input type="text" id="name-input" placeholder="เช่น คอนเสิร์ต XXX, วันหยุดพิเศษ" required>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label for="description-input">📝 รายละเอียด (ไม่บังคับ)</label>
                <textarea id="description-input" rows="3" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
              </div>

              <!-- Price Type -->
              <div class="form-group">
                <label for="price-type-select">💰 ประเภทราคา</label>
                <select id="price-type-select" required>
                  <option value="free">ฟรี - ไม่ต้องจ่ายเงิน</option>
                  <option value="normal">ปกติ - ตามราคาโซน</option>
                  <option value="full">เต็มจำนวน - จ่ายเต็มตามโซน</option>
                  <option value="custom">กำหนดเอง - ระบุจำนวนเงิน</option>
                </select>
              </div>

              <!-- Custom Deposit Amount (shown only for custom type) -->
              <div class="form-group" id="custom-deposit-group" style="display: none;">
                <label for="deposit-amount-input">💵 จำนวนเงินมัดจำ (บาท)</label>
                <input type="number" id="deposit-amount-input" min="0" step="0.01" placeholder="0.00">
              </div>

              <!-- Deposit Required -->
              <div class="form-group">
                <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                  <input type="checkbox" id="deposit-required-checkbox" checked>
                  <span>✅ จำเป็นต้องจ่ายเงินมัดจำ</span>
                </label>
              </div>

              <!-- Buttons -->
              <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-md);">
                <button type="submit" class="btn btn-primary" style="flex: 1;">
                  <span id="btn-submit-text">เพิ่มวันพิเศษ</span>
                </button>
                <button type="button" id="btn-cancel" class="btn btn-ghost" style="display: none;">
                  ยกเลิก
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Special Dates List -->
        <div class="glass-card" style="padding: var(--spacing-lg);">
          <h3 class="font-heading" style="font-size: 1.25rem; margin-bottom: var(--spacing-lg);">
            📋 วันพิเศษทั้งหมด
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
        <div class="special-date-item" data-id="${sd.id}" style="padding: var(--spacing-lg); background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: var(--spacing-md);">
          <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: var(--spacing-md);">
            <div style="flex: 1; min-width: 200px;">
              <h4 class="font-heading" style="color: var(--accent-neon); font-size: 1.1rem; margin-bottom: var(--spacing-xs);">
                ${sd.name}
              </h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacing-sm);">
                📅 ${formattedDate}
              </p>
              ${sd.description ? `<p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: var(--spacing-sm);">${sd.description}</p>` : ''}

              <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
                <span class="badge" style="background: rgba(124, 58, 237, 0.2); color: var(--primary); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                  ${priceTypeLabels[sd.priceType]}
                </span>
                ${sd.priceType === 'custom' && sd.depositAmount ? `
                  <span class="badge" style="background: rgba(0, 255, 255, 0.1); color: var(--accent-neon); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                    ฿${sd.depositAmount.toLocaleString()}
                  </span>
                ` : ''}
                ${sd.depositRequired ? `
                  <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                    ✅ ต้องมัดจำ
                  </span>
                ` : `
                  <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                    ❌ ไม่ต้องมัดจำ
                  </span>
                `}
                ${!sd.isActive ? `
                  <span class="badge" style="background: rgba(100, 116, 139, 0.2); color: var(--text-dim); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                    🚫 ปิดใช้งาน
                  </span>
                ` : ''}
              </div>
            </div>

            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
              <button class="btn-edit btn btn-ghost" data-id="${sd.id}" style="padding: 8px 16px; font-size: 0.85rem;">
                ✏️ แก้ไข
              </button>
              <button class="btn-toggle btn btn-ghost" data-id="${sd.id}" style="padding: 8px 16px; font-size: 0.85rem;">
                ${sd.isActive ? '🔒 ปิด' : '🔓 เปิด'}
              </button>
              <button class="btn-delete btn btn-ghost" data-id="${sd.id}" style="padding: 8px 16px; font-size: 0.85rem; color: var(--danger); border-color: var(--danger);">
                🗑️ ลบ
              </button>
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
