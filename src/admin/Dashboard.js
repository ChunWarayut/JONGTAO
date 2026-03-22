import client from '../api/client.js';

const PERIOD_LABELS = { today: 'วันนี้', week: '7 วันล่าสุด', month: 'เดือนนี้', all: 'ทั้งหมด' };
const METHOD_LABELS = { stripe: 'Stripe', transfer: 'โอนเงิน', cash: 'เงินสด', other: 'อื่นๆ' };
const METHOD_ICONS = { stripe: '💳', transfer: '🏦', cash: '💵', other: '📦' };

export default class Dashboard {
  constructor() {
    this.period = 'month';
    this.revenueData = null;
    this.todayStats = null;
  }

  async render(container, isSoftRefresh = false) {
    if (!isSoftRefresh) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-dim);">
          <div style="text-align:center;">
            <div style="font-size:2rem;margin-bottom:8px;animation:spin 1s linear infinite;">⟳</div>
            <div>กำลังโหลดข้อมูล...</div>
          </div>
        </div>
        <style>@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>
      `;
    }
    await this.fetchAndRender(container);
  }

  async fetchAndRender(container) {
    try {
      const [revenue, todayStats, recentBookings] = await Promise.all([
        client.get(`/stats/revenue?period=${this.period}`),
        client.get('/stats/today'),
        client.get('/bookings')
      ]);
      this.revenueData = revenue;
      this.todayStats = todayStats;
      this.renderDashboard(container, revenue, todayStats, recentBookings.slice(0, 5));
    } catch (error) {
      container.innerHTML = `<p class="error">โหลดข้อมูลผิดพลาด: ${error.message}</p>`;
    }
  }

  renderDashboard(container, rev, today, recent) {
    const fmt = (n) => (n || 0).toLocaleString('th-TH');
    const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    container.innerHTML = `
      <div class="revenue-dashboard animate-fade">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-xl);flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="font-heading" style="font-size:1.75rem;margin-bottom:4px;display:flex;align-items:center;gap:10px;">
              <span style="color:var(--accent-gold);">💰</span> สรุปรายได้
            </h2>
            <p style="color:var(--text-dim);font-size:0.85rem;">อัปเดต: ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
          </div>
          <!-- Period tabs -->
          <div style="display:flex;gap:6px;background:var(--bg-surface);padding:4px;border-radius:var(--radius-full);border:1px solid var(--glass-border);">
            ${Object.entries(PERIOD_LABELS).map(([key, label]) => `
              <button class="period-btn ${this.period === key ? 'active' : ''}" data-period="${key}"
                style="padding:8px 16px;border-radius:var(--radius-full);border:none;cursor:pointer;font-size:0.85rem;font-weight:600;font-family:inherit;transition:all 0.2s;
                ${this.period === key
                  ? 'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(124,58,237,0.4);'
                  : 'background:transparent;color:var(--text-dim);'}">
                ${label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Revenue Cards -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-md);margin-bottom:var(--spacing-lg);">
          <!-- Gross -->
          <div class="glass-card" style="padding:var(--spacing-xl);border-color:rgba(124,58,237,0.3);position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;font-size:5rem;opacity:0.05;">💰</div>
            <div style="color:var(--text-muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">รายรับรวม (Gross)</div>
            <div style="font-size:2rem;font-weight:800;font-family:'Outfit';color:white;margin-bottom:4px;">฿${fmt(rev.grossRevenue)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${rev.paidCount} รายการที่ชำระแล้ว</div>
          </div>
          <!-- Gateway Fee -->
          <div class="glass-card" style="padding:var(--spacing-xl);border-color:rgba(239,68,68,0.3);position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;font-size:5rem;opacity:0.05;">🏦</div>
            <div style="color:var(--text-muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">ค่า Gateway (3%)</div>
            <div style="font-size:2rem;font-weight:800;font-family:'Outfit';color:#f87171;margin-bottom:4px;">−฿${fmt(rev.gatewayFee)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${(rev.gatewayFeeRate * 100).toFixed(0)}% ของรายรับรวม</div>
          </div>
          <!-- Net -->
          <div class="glass-card" style="padding:var(--spacing-xl);border-color:rgba(16,185,129,0.4);position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;font-size:5rem;opacity:0.05;">✅</div>
            <div style="color:var(--text-muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">รายรับสุทธิ (Net)</div>
            <div style="font-size:2rem;font-weight:800;font-family:'Outfit';color:var(--success);margin-bottom:4px;">฿${fmt(rev.netRevenue)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">หลังหักค่า Gateway แล้ว</div>
          </div>
        </div>

        <!-- Secondary Cards Row -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--spacing-md);margin-bottom:var(--spacing-xl);">
          <div class="glass-card" style="padding:var(--spacing-lg);text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">💳</div>
            <div style="font-size:1.5rem;font-weight:800;font-family:'Outfit';color:white;">${rev.paidCount}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">ชำระเงินแล้ว</div>
          </div>
          <div class="glass-card" style="padding:var(--spacing-lg);text-align:center;border-color:rgba(16,185,129,0.3);">
            <div style="font-size:1.5rem;margin-bottom:4px;">🎉</div>
            <div style="font-size:1.5rem;font-weight:800;font-family:'Outfit';color:var(--success);">${rev.freeCount}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">จองฟรี (ไม่เสียค่า gateway)</div>
          </div>
          <div class="glass-card" style="padding:var(--spacing-lg);text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">⏳</div>
            <div style="font-size:1.5rem;font-weight:800;font-family:'Outfit';color:#fbbf24;">${rev.pendingCount}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">รอชำระเงิน</div>
          </div>
          <div class="glass-card" style="padding:var(--spacing-lg);text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">💵</div>
            <div style="font-size:1.3rem;font-weight:800;font-family:'Outfit';color:#fbbf24;">฿${fmt(rev.pendingRevenue)}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">มูลค่ารอชำระ</div>
          </div>
          <div class="glass-card" style="padding:var(--spacing-lg);text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:4px;">📅</div>
            <div style="font-size:1.5rem;font-weight:800;font-family:'Outfit';color:var(--accent-neon);">${today.totalBookings}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">จองวันนี้รวม</div>
          </div>
        </div>

        <!-- Tables Row -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-lg);margin-bottom:var(--spacing-xl);">

          <!-- Daily breakdown -->
          <div class="glass-card" style="padding:var(--spacing-lg);">
            <h3 class="font-heading" style="font-size:1.1rem;margin-bottom:var(--spacing-md);display:flex;align-items:center;gap:8px;">
              <span>📊</span> รายได้รายวัน
            </h3>
            ${rev.dailyStats.length === 0 ? `
              <div style="text-align:center;padding:var(--spacing-xl);color:var(--text-dim);">
                <div style="font-size:2rem;margin-bottom:8px;">📭</div>
                ไม่มีข้อมูลในช่วงนี้
              </div>
            ` : `
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                  <thead>
                    <tr style="color:var(--text-muted);border-bottom:1px solid var(--glass-border);">
                      <th style="text-align:left;padding:8px 6px;font-weight:600;">วันที่</th>
                      <th style="text-align:center;padding:8px 6px;font-weight:600;">จอง</th>
                      <th style="text-align:right;padding:8px 6px;font-weight:600;">รับเข้า</th>
                      <th style="text-align:right;padding:8px 6px;font-weight:600;color:#f87171;">ค่า 3%</th>
                      <th style="text-align:right;padding:8px 6px;font-weight:600;color:var(--success);">สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rev.dailyStats.map(d => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
                        <td style="padding:10px 6px;color:var(--text-primary);">${fmtDate(d.date)}</td>
                        <td style="padding:10px 6px;text-align:center;">
                          <span style="background:rgba(124,58,237,0.2);color:var(--primary-light);padding:2px 8px;border-radius:12px;font-weight:700;">${d.count}</span>
                        </td>
                        <td style="padding:10px 6px;text-align:right;font-family:'Outfit';font-weight:700;">฿${fmt(d.gross)}</td>
                        <td style="padding:10px 6px;text-align:right;font-family:'Outfit';color:#f87171;">−฿${fmt(d.fee)}</td>
                        <td style="padding:10px 6px;text-align:right;font-family:'Outfit';font-weight:700;color:var(--success);">฿${fmt(d.net)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="border-top:2px solid var(--glass-border);font-weight:700;">
                      <td style="padding:10px 6px;color:var(--text-muted);">รวม</td>
                      <td style="padding:10px 6px;text-align:center;color:var(--accent-neon);">${rev.paidCount}</td>
                      <td style="padding:10px 6px;text-align:right;font-family:'Outfit';">฿${fmt(rev.grossRevenue)}</td>
                      <td style="padding:10px 6px;text-align:right;font-family:'Outfit';color:#f87171;">−฿${fmt(rev.gatewayFee)}</td>
                      <td style="padding:10px 6px;text-align:right;font-family:'Outfit';color:var(--success);">฿${fmt(rev.netRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            `}
          </div>

          <!-- Right column: payment method + recent -->
          <div style="display:flex;flex-direction:column;gap:var(--spacing-lg);">

            <!-- Payment method breakdown -->
            <div class="glass-card" style="padding:var(--spacing-lg);">
              <h3 class="font-heading" style="font-size:1.1rem;margin-bottom:var(--spacing-md);display:flex;align-items:center;gap:8px;">
                <span>💳</span> แบ่งตามช่องทางชำระ
              </h3>
              ${rev.methodStats.length === 0 ? `
                <div style="text-align:center;padding:var(--spacing-lg);color:var(--text-dim);font-size:0.85rem;">ยังไม่มีข้อมูล</div>
              ` : rev.methodStats.map(m => {
                const pct = rev.grossRevenue > 0 ? Math.round(m.gross / rev.grossRevenue * 100) : 0;
                return `
                  <div style="margin-bottom:var(--spacing-md);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <span style="font-weight:600;display:flex;align-items:center;gap:6px;">
                        ${METHOD_ICONS[m.method] || '💳'} ${METHOD_LABELS[m.method] || m.method}
                      </span>
                      <span style="font-family:'Outfit';font-weight:700;color:var(--accent-neon);">฿${fmt(m.net)} <span style="font-size:0.75rem;color:var(--text-dim);">สุทธิ</span></span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:3px;transition:width 0.6s ease;"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.75rem;color:var(--text-dim);">
                      <span>${m.count} รายการ · ${pct}%</span>
                      <span style="color:#f87171;">ค่า gateway −฿${fmt(m.fee)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Recent activity -->
            <div class="glass-card" style="padding:var(--spacing-lg);flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-md);">
                <h3 class="font-heading" style="font-size:1.1rem;display:flex;align-items:center;gap:8px;"><span>🔔</span> กิจกรรมล่าสุด</h3>
                <span style="font-size:0.75rem;color:var(--success);background:rgba(16,185,129,0.1);padding:3px 10px;border-radius:12px;border:1px solid rgba(16,185,129,0.2);display:flex;align-items:center;gap:5px;">
                  <span style="width:6px;height:6px;background:var(--success);border-radius:50%;display:inline-block;animation:pulse-glow 2s infinite;"></span> LIVE
                </span>
              </div>
              ${recent.length === 0 ? `<p style="color:var(--text-muted);font-size:0.85rem;">ยังไม่มีกิจกรรม</p>` : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${recent.map(b => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(255,255,255,0.02);border-radius:var(--radius-md);border:1px solid var(--glass-border);">
                      <div>
                        <div style="font-weight:600;font-size:0.9rem;">${b.customerName}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">
                          โซน ${b.zone?.code || b.zoneId} · ${b.guestCount} ท่าน · ${new Date(b.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                      </div>
                      <div style="text-align:right;">
                        <span class="status-badge status-${b.status}">${b.status}</span>
                        ${b.paymentStatus !== 'unpaid' ? `<div style="font-size:0.75rem;color:var(--success);margin-top:4px;">฿${fmt(b.paymentStatus === 'deposit' ? b.depositAmount : b.totalAmount)}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>
        </div>

      </div>

      <style>
        .revenue-dashboard .glass-card { transition: box-shadow 0.2s; }
        .revenue-dashboard .glass-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        @media (max-width: 900px) {
          .revenue-dashboard > div:nth-child(2) { grid-template-columns: 1fr !important; }
          .revenue-dashboard > div:nth-child(3) { grid-template-columns: repeat(3, 1fr) !important; }
          .revenue-dashboard > div:nth-child(4) { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .revenue-dashboard > div:nth-child(3) { grid-template-columns: repeat(2, 1fr) !important; }
        }
      </style>
    `;

    // Period button events
    container.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.period = btn.dataset.period;
        this.fetchAndRender(container);
      });
    });
  }
}
