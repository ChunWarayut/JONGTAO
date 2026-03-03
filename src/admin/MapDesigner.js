import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class MapDesigner {
    constructor() {
        this.zones = [];
        this.tables = [];
        this.selectedZoneId = null;
        this.isDragging = false;
        this.draggedTable = null;
        this.offset = { x: 0, y: 0 };
    }

    async render(container) {
        try {
            this.zones = await client.get('/zones');
            this.tables = await client.get('/tables');
        } catch (error) {
            console.error('Fetch error:', error);
        }

        container.innerHTML = `
            <div class="map-designer animate-fade">
                <div class="designer-toolbar glass-card" style="margin-bottom: var(--spacing-lg); display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-md) var(--spacing-lg);">
                    <div class="input-wrapper" style="display: flex; align-items: center; gap: var(--spacing-sm); flex-grow: 1;">
                        <select id="designer-zone-select" class="form-control" style="width: auto; height: 44px; min-width: 240px;">
                            <option value="">-- เลือกโซนเพื่อเพิ่มโต๊ะ --</option>
                            ${this.zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('')}
                        </select>
                        <button id="btn-add-table" class="btn btn-primary" style="height: 44px;">
                             เพิ่มโต๊ะ
                        </button>
                    </div>
                    <button id="btn-save-map" class="btn btn-success" style="background: var(--success); height: 44px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                        บันทึกผังร้าน
                    </button>
                </div>

                <div id="designer-canvas-wrapper" class="canvas-grid-bg" style="position: relative; width: 100%; height: 650px; background: var(--bg-surface); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: inset 0 0 50px rgba(0,0,0,0.5);">
                    <div id="stage-visual" style="position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: 400px; height: 80px; background: rgba(0, 255, 255, 0.05); border: 2px solid var(--accent-neon); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--accent-neon); font-weight: 800; font-family: 'Outfit', sans-serif; box-shadow: 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 15px rgba(0, 255, 255, 0.1); letter-spacing: 0.2rem;">
                        <div style="font-size: 1.2rem;">STAGE</div>
                        <div style="font-size: 0.8rem; opacity: 0.7; font-weight: 500;">เวทีการแสดง</div>
                    </div>
                    <div id="tables-container" style="position: absolute; inset: 0;"></div>
                </div>

                <div class="designer-help glass-card" style="margin-top: var(--spacing-md); color: var(--text-muted); font-size: 0.9rem; padding: var(--spacing-md); display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.2rem;">💡</span>
                    <span><strong>คำแนะนำ:</strong> เลือกโซนแล้วกด "เพิ่มโต๊ะ" สามารถลากโต๊ะเพื่อจัดวางตามพิกัดที่ต้องการ และสุดท้ายคลิก <strong>บันทึกผังร้าน</strong> ทุกครั้ง</span>
                </div>
                
                <!-- Custom Modal for Table Number -->
                <div id="table-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
                    <div class="glass-card" style="padding: 24px; min-width: 300px; text-align: center;">
                        <h3 style="margin-bottom: 16px;">ระบุหมายเลขโต๊ะ</h3>
                        <input type="text" id="table-modal-input" class="form-control" placeholder="เช่น A1, B2" style="margin-bottom: 16px; width: 100%;" />
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button id="table-modal-cancel" class="btn btn-ghost">ยกเลิก</button>
                            <button id="table-modal-confirm" class="btn btn-primary">ยืนยัน</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .canvas-grid-bg {
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                
                .table-item {
                    position: absolute;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: var(--primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    font-weight: 800;
                    cursor: move;
                    user-select: none;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
                    border: 2px solid rgba(255,255,255,0.1);
                    font-family: 'Outfit', sans-serif;
                }
                
                .table-item:hover { 
                    transform: scale(1.15); 
                    box-shadow: 0 0 20px rgba(255,255,255,0.2), 0 8px 15px rgba(0,0,0,0.5);
                    z-index: 10;
                }
                
                .table-item.dragging { 
                    opacity: 0.8; 
                    transform: scale(1.25); 
                    box-shadow: 0 15px 30px rgba(0,0,0,0.6);
                    z-index: 100;
                }
                
                .table-item .delete-table {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 22px;
                    height: 22px;
                    background: var(--danger);
                    color: white;
                    border-radius: 50%;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 14px;
                    border: 2px solid var(--bg-surface);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                    transition: transform 0.2s;
                }
                
                .table-item .delete-table:hover {
                    transform: scale(1.2);
                    background: #ff5f5f;
                }
                
                .table-item:hover .delete-table { display: flex; }
                
                #designer-canvas-wrapper::after {
                    content: '';
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    font-size: 0.75rem;
                    color: var(--text-dim);
                    font-weight: 600;
                    background: rgba(0,0,0,0.3);
                    padding: 4px 10px;
                    border-radius: var(--radius-sm);
                    pointer-events: none;
                }
            </style>
        `;

        this.attachEvents(container);
        this.renderTables(container);
    }

    renderTables(container) {
        const wrapper = container.querySelector('#tables-container');
        wrapper.innerHTML = '';

        this.tables.forEach(table => {
            const el = document.createElement('div');
            el.className = 'table-item';
            el.id = `table-${table.id || 'new-' + table.number}`;
            el.style.left = `${table.x}%`;
            el.style.top = `${table.y}%`;

            const baseColor = table.zone?.color || (this.zones.find(z => z.id === table.zoneId)?.color) || 'var(--primary)';
            el.style.backgroundColor = baseColor;
            el.style.boxShadow = `0 4px 15px rgba(0,0,0,0.4), 0 0 10px ${baseColor}44`;

            el.innerHTML = `
                ${table.number}
                <div class="delete-table" data-id="${table.id}" data-number="${table.number}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;

            el.addEventListener('mousedown', (e) => this.startDragging(e, table, el, container));
            el.querySelector('.delete-table').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTable(table, container);
            });

            wrapper.appendChild(el);
        });
    }

    startDragging(e, table, el, container) {
        this.isDragging = true;
        this.draggedTable = table;
        this.draggedEl = el;
        el.classList.add('dragging');

        const rect = container.querySelector('#designer-canvas-wrapper').getBoundingClientRect();

        const move = (moveEvent) => {
            if (!this.isDragging) return;

            let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

            // Bounds
            x = Math.max(2, Math.min(96, x));
            y = Math.max(2, Math.min(96, y));

            this.draggedTable.x = x;
            this.draggedTable.y = y;
            this.draggedEl.style.left = `${x}%`;
            this.draggedEl.style.top = `${y}%`;
        };

        const stop = () => {
            this.isDragging = false;
            el.classList.remove('dragging');
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
    }

    async removeTable(table, container) {
        if (table.id) {
            if (await showConfirm(`ต้องการลบโต๊ะ ${table.number} ใช่หรือไม่?`)) {
                try {
                    await client.delete(`/tables/${table.id}`);
                    this.tables = this.tables.filter(t => t.id !== table.id);
                    this.renderTables(container);
                } catch (err) {
                    await showAlert('ลบโต๊ะไม่สำเร็จ: ' + err.message);
                }
            }
        } else {
            this.tables = this.tables.filter(t => t.number !== table.number);
            this.renderTables(container);
        }
    }

    attachEvents(container) {
        container.querySelector('#btn-add-table').addEventListener('click', async () => {
            const zoneId = parseInt(container.querySelector('#designer-zone-select').value);
            if (!zoneId) return await showAlert('กรุณาเลือกโซนก่อนเพิ่มโต๊ะ');

            const zone = this.zones.find(z => z.id === zoneId);
            const modal = container.querySelector('#table-modal');
            const input = container.querySelector('#table-modal-input');

            input.value = '';
            modal.style.display = 'flex';
            input.focus();

            const handleConfirm = async () => {
                const tableNumber = input.value.trim();
                if (!tableNumber) return;

                if (this.tables.some(t => t.number === tableNumber)) {
                    await showAlert('หมายเลขโต๊ะนี้มีอยู่แล้ว');
                    return;
                }

                this.tables.push({
                    number: tableNumber,
                    x: 50,
                    y: 50,
                    zoneId,
                    zone,
                    status: 'active'
                });

                this.renderTables(container);
                cleanup();
            };

            const handleCancel = () => cleanup();

            const cleanup = () => {
                modal.style.display = 'none';
                container.querySelector('#table-modal-confirm').removeEventListener('click', handleConfirm);
                container.querySelector('#table-modal-cancel').removeEventListener('click', handleCancel);
            };

            container.querySelector('#table-modal-confirm').addEventListener('click', handleConfirm);
            container.querySelector('#table-modal-cancel').addEventListener('click', handleCancel);
        });

        container.querySelector('#btn-save-map').addEventListener('click', async () => {
            try {
                // Sanitize tables to prevent nested 'zone' objects from crashing Prisma backend
                const tablesToSave = this.tables.map(t => {
                    const tableData = {
                        number: t.number,
                        x: t.x,
                        y: t.y,
                        status: t.status,
                        zoneId: t.zoneId
                    };
                    if (t.id) tableData.id = t.id; // Only include id if it exists
                    return tableData;
                });

                await client.post('/tables/bulk', { tables: tablesToSave });
                await showAlert('บันทึกผังร้านสำเร็จ!');
                this.tables = await client.get('/tables');
                this.renderTables(container);
            } catch (error) {
                await showAlert('บันทึกผังร้านไม่สำเร็จ: ' + error.message);
            }
        });
    }
}
