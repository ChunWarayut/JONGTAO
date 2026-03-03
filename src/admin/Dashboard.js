import client from '../api/client.js';

export default class Dashboard {
  async render(container, isSoftRefresh = false) {
    try {
      const [stats, recentBookings] = await Promise.all([
        client.get('/stats/today'),
        client.get('/bookings') // Will truncate manually
      ]);

      const latestEntries = recentBookings.slice(0, 5); // Take top 5

      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <p class="stat-label">ยอดจองวันนี้รวม</p>
            <p class="stat-value">${stats.totalBookings}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">ยืนยันแล้ว</p>
            <p class="stat-value" style="color: var(--success);">${stats.confirmedBookings}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">รายรับโดยประมาณ (มัดจำ/เต็มจำนวน)</p>
            <p class="stat-value" style="color: var(--accent-neon);">฿${stats.todayRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div class="glass-card animate-fade" style="margin-top: var(--spacing-xl);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
            <h3 class="font-heading">กิจกรรมล่าสุด (Real-time Feed)</h3>
            <span style="display: flex; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--success); background: rgba(16,185,129,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(16,185,129,0.2);">
              <span style="display: inline-block; width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse-glow 2s infinite;"></span>
              LIVE
            </span>
          </div>
          
          ${latestEntries.length === 0 ? '<p style="color: var(--text-muted);">ยังไม่มีกิจกรรมในขณะนี้</p>' : `
            <div class="timeline">
              ${latestEntries.map((b, i) => `
                <div class="timeline-item ${isSoftRefresh && i === 0 ? 'new' : ''}">
                  <div class="timeline-marker"></div>
                  <div class="timeline-header">
                    <div>
                      <div class="timeline-time">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${new Date(b.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                      <div class="timeline-content">
                        <strong>${b.customerName}</strong> จองโต๊ะใน <strong>โซน ${b.zone?.code || b.zoneId}</strong>
                        <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 8px;">(จำนวน ${b.guestCount} ท่าน)</span>
                      </div>
                      <div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-dim);">
                        เวลามาถึง: <span style="color: var(--accent-neon);">${b.arrivalTime} น.</span>
                      </div>
                    </div>
                    <div>
                         <span class="status-badge status-${b.status}">${b.status}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<p class="error">โหลดข้อมูลผิดพลาด: ${error.message}</p>`;
    }
  }
}
