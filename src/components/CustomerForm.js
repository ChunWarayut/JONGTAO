export default class CustomerForm {
  constructor(reservation, onNext, onPrev) {
    this.reservation = reservation;
    this.onNext = onNext;
    this.onPrev = onPrev;
  }

  render(container) {
    container.innerHTML = `
      <div class="customer-form-container animate-fade">
        <button id="btn-back" class="btn btn-ghost" style="margin-bottom: var(--spacing-lg); padding: 10px 20px; font-weight: 700;">
          <span style="margin-right: 8px;">←</span> ย้อนกลับ
        </button>
        
        <div class="glass-card" style="max-width: 800px; margin: 0 auto; padding: var(--spacing-xl);">
          <h2 class="font-heading" style="margin-bottom: var(--spacing-xl); text-align: center; font-size: 2rem;">ข้อมูลผู้จอง</h2>
          
          <form id="booking-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-lg);">
            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="font-heading">ชื่อผู้จอง *</label>
              <input type="text" name="name" required placeholder="กรอกชื่อ-นามสกุล / Name-Surname" value="${this.reservation.customer.name || ''}" class="form-control-pro">
            </div>
            
            <div class="form-group">
              <label class="font-heading">เบอร์โทรศัพท์ *</label>
              <input type="tel" name="phone" required placeholder="08x-xxx-xxxx" value="${this.reservation.customer.phone || ''}" class="form-control-pro">
            </div>
            
            <div class="form-group">
              <label class="font-heading">อีเมล * <span style="font-size: 0.75rem; color: var(--text-dim); font-family: 'Work Sans'; opacity: 0.8;">(สำหรับยืนยันการชำระเงิน)</span></label>
              <input type="email" name="email" required placeholder="example@email.com" value="${this.reservation.customer.email || ''}" class="form-control-pro">
            </div>

            <div class="form-group">
              <label class="font-heading">Line ID <span style="font-size: 0.75rem; color: var(--success); font-family: 'Work Sans'; opacity: 0.8;">(แนะนำสำหรับการติดต่อ)</span></label>
              <input type="text" name="lineId" placeholder="@line_id" value="${this.reservation.customer.lineId || ''}" class="form-control-pro">
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="font-heading">โอกาสพิเศษ (Special Occasion)</label>
              <select name="occasion" class="form-control-pro">
                <option value="">ไม่มี</option>
                <option value="birthday" ${this.reservation.customer.occasion === 'birthday' ? 'selected' : ''}>วันเกิด (Birthday Party)</option>
                <option value="anniversary" ${this.reservation.customer.occasion === 'anniversary' ? 'selected' : ''}>โอกาสครอบรอบ (Anniversary)</option>
                <option value="other" ${this.reservation.customer.occasion === 'other' ? 'selected' : ''}>อื่นๆ (ระบุในหมายเหตุ)</option>
              </select>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="font-heading">หมายเหตุ / คำขอเพิ่มเติม</label>
              <textarea name="note" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติมที่ต้องการบอกทางร้าน..." class="form-control-pro">${this.reservation.customer.note || ''}</textarea>
            </div>

            ${this.reservation.guestCount === 2 ? `
            <div class="form-group" style="grid-column: 1 / -1; background: rgba(124, 58, 237, 0.1); padding: var(--spacing-md); border-radius: var(--radius-md); border: 1px solid rgba(124, 58, 237, 0.3); margin-top: var(--spacing-sm);">
              <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; margin: 0; color: var(--text-main);">
                <input type="checkbox" required style="width: 20px; height: 20px; margin-top: 2px; accent-color: var(--primary);">
                <span style="font-size: 0.9rem; font-weight: 500; line-height: 1.4;">ฉันยอมรับเงื่อนไขการนั่งร่วมโต๊ะกับลูกค้าท่านอื่น (Walk-in) ในกรณีที่มาใช้บริการเพียง 2 ท่าน เพื่อให้เป็นไปตามนโยบายของทางร้าน</span>
              </label>
            </div>
            ` : ''}

            <div style="grid-column: 1 / -1; margin-top: var(--spacing-xl);">
              <button type="submit" class="btn btn-primary" style="width: 100%; height: 60px; font-size: 1.25rem; font-weight: 800;">
                ดำเนินการต่อเพื่อชำระเงิน <span style="margin-left: 8px;">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>
        .form-group { display: flex; flex-direction: column; gap: 10px; }
        .form-group label { font-size: 0.95rem; font-weight: 700; color: var(--text-dim); letter-spacing: 0.02em; }
        .form-control-pro {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: var(--radius-md) !important;
          padding: 16px 20px !important;
          color: white !important;
          font-family: 'Work Sans', sans-serif !important;
          font-size: 1rem !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          width: 100%;
          box-sizing: border-box;
        }
        .form-control-pro:focus {
          outline: none !important;
          border-color: var(--primary) !important;
          background: rgba(255, 255, 255, 0.06) !important;
          box-shadow: 0 0 15px rgba(124, 58, 237, 0.3) !important;
          transform: translateY(-1px);
        }
        .form-control-pro::placeholder { color: rgba(255, 255, 255, 0.2); }
        select.form-control-pro { appearance: none; cursor: pointer; }
      </style>
    `;

    this.attachEvents(container);
  }

  attachEvents(container) {
    const form = container.querySelector('#booking-form');

    form.addEventListener('input', (e) => {
      const { name, value } = e.target;
      if (name) {
        this.reservation.customer[name] = value;
        if (window.app && window.app.saveToStorage) {
          window.app.saveToStorage();
        }
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      for (let [key, val] of formData.entries()) {
        this.reservation.customer[key] = val;
      }
      if (window.app && window.app.saveToStorage) {
        window.app.saveToStorage();
      }
      this.onNext();
    });

    container.querySelector('#btn-back').addEventListener('click', () => {
      this.onPrev();
    });
  }
}
