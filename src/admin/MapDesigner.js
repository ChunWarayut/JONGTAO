import client from '../api/client.js';
import { showAlert, showConfirm } from '../utils/dialog.js';

export default class MapDesigner {
    constructor() {
        this.zones = [];
        this.tables = [];
        this.fixtures = [];
        this.selectedZoneId = null;
        this.isDragging = false;
        this.draggedTable = null;
        this.offset = { x: 0, y: 0 };
    }

    async render(container) {
        try {
            this.zones = await client.get('/zones');
            this.tables = await client.get('/tables');
            this.fixtures = await client.get('/fixtures');
        } catch (error) {
            console.error('Fetch error:', error);
        }

        container.innerHTML = `
            <div class="map-designer animate-fade">
                <div class="designer-toolbar glass-card" style="margin-bottom: var(--spacing-lg); display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-md) var(--spacing-lg); flex-wrap: wrap;">
                    <div class="input-wrapper" style="display: flex; align-items: center; gap: var(--spacing-sm); flex-grow: 1;">
                        <select id="designer-zone-select" class="form-control" style="width: auto; height: 44px; min-width: 240px;">
                            <option value="">-- เลือกโซนเพื่อเพิ่มโต๊ะ --</option>
                            ${this.zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('')}
                        </select>
                        <button id="btn-add-table" class="btn btn-primary" style="height: 44px;">
                             เพิ่มโต๊ะ
                        </button>
                        <button id="btn-add-fixture" class="btn btn-ghost" style="height: 44px; border: 1px solid var(--accent-neon); color: var(--accent-neon);">
                             + เพิ่มสิ่งอำนวยความสะดวก
                        </button>
                    </div>
                    <button id="btn-save-map" class="btn btn-success" style="background: var(--success); height: 44px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                        บันทึกผังร้าน
                    </button>
                </div>

                <div id="designer-canvas-wrapper" class="canvas-grid-bg" style="position: relative; width: 100%; height: 650px; background: var(--bg-surface); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: inset 0 0 50px rgba(0,0,0,0.5);">
                    <div id="fixtures-container" style="position: absolute; inset: 0; z-index: 5;"></div>
                    <div id="tables-container" style="position: absolute; inset: 0; z-index: 10; pointer-events: none;"></div>
                </div>

                <div class="designer-help glass-card" style="margin-top: var(--spacing-md); color: var(--text-muted); font-size: 0.9rem; padding: var(--spacing-md); display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.2rem;">💡</span>
                    <span><strong>คำแนะนำ:</strong> ลากโต๊ะหรือสิ่งอำนวยความสะดวก (เวที, DJ, BAR ฯลฯ) เพื่อจัดวางตามต้องการ คลิก <strong>บันทึกผังร้าน</strong> ทุกครั้ง</span>
                </div>
                
                <!-- Custom Modal for Table Number -->
                <div id="table-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
                    <div class="glass-card" style="padding: 24px; min-width: 300px; text-align: center;">
                        <h3 id="modal-title" style="margin-bottom: 16px;">ระบุหมายเลขโต๊ะ</h3>
                        <input type="text" id="table-modal-input" class="form-control" placeholder="เช่น A1, B2" style="margin-bottom: 16px; width: 100%;" />
                        <div id="modal-extra-fields" style="display: none; margin-bottom: 16px;">
                            <select id="fixture-style-select" class="form-control" style="margin-bottom: 8px;">
                                <option value="">ปกติ (ขาว)</option>
                                <option value="accent">accent (ฟ้า/นีออน)</option>
                                <option value="red">แดง</option>
                            </select>
                        </div>
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
                    pointer-events: auto;
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
                
                .table-item .delete-btn,
                .fixture-item .delete-btn {
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
                    z-index: 50;
                }
                
                .table-item .delete-btn:hover,
                .fixture-item .delete-btn:hover {
                    transform: scale(1.2);
                    background: #ff5f5f;
                }
                
                .table-item:hover .delete-btn,
                .fixture-item:hover .delete-btn { display: flex; }

                .fixture-item {
                    position: absolute;
                    border: 2px solid rgba(255,255,255,0.15);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.6);
                    font-weight: 700;
                    font-family: 'Outfit', sans-serif;
                    background: rgba(255,255,255,0.02);
                    cursor: move;
                    user-select: none;
                    transition: box-shadow 0.2s;
                }
                .fixture-item:hover {
                    box-shadow: 0 0 15px rgba(255,255,255,0.15);
                    z-index: 20;
                }
                .fixture-item.dragging {
                    opacity: 0.7;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                    z-index: 100;
                }
                .fixture-item.accent { border-color: var(--accent-neon); color: var(--accent-neon); box-shadow: 0 0 15px rgba(0, 255, 255, 0.1), inset 0 0 10px rgba(0, 255, 255, 0.05); }
                .fixture-item.red { border-color: #ff3366; color: #ff3366; box-shadow: 0 0 15px rgba(255, 51, 102, 0.1), inset 0 0 10px rgba(255, 51, 102, 0.05); }
                .fixture-item.text-style { border: none; background: none; color: rgba(255,255,255,0.5); font-size: 0.8rem; }
                .v-text { writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0.15rem; }

                .resize-handle {
                    position: absolute;
                    bottom: -4px;
                    right: -4px;
                    width: 14px;
                    height: 14px;
                    background: rgba(255,255,255,0.4);
                    border: 2px solid rgba(255,255,255,0.6);
                    border-radius: 3px;
                    cursor: nwse-resize;
                    display: none;
                    z-index: 50;
                    transition: background 0.15s;
                }
                .resize-handle:hover { background: rgba(255,255,255,0.8); }
                .fixture-item:hover .resize-handle { display: block; }

                .rotate-btn {
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    width: 22px;
                    height: 22px;
                    background: #3b82f6;
                    color: white;
                    border-radius: 50%;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 13px;
                    border: 2px solid var(--bg-surface);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                    transition: transform 0.2s;
                    z-index: 50;
                }
                .rotate-btn:hover { transform: scale(1.2); background: #60a5fa; }
                .fixture-item:hover .rotate-btn { display: flex; }
            </style>
        `;

        this.attachEvents(container);
        this.renderTables(container);
        this.renderFixtures(container);
    }

    renderFixtures(container) {
        const wrapper = container.querySelector('#fixtures-container');
        wrapper.innerHTML = '';

        this.fixtures.forEach(fixture => {
            const el = document.createElement('div');
            el.className = 'fixture-item' + (fixture.style === 'accent' ? ' accent' : fixture.style === 'red' ? ' red' : fixture.style === 'text' ? ' text-style' : '');
            el.dataset.fixtureId = fixture.id;
            el.style.left = `${fixture.x}%`;
            el.style.top = `${fixture.y}%`;
            el.style.width = `${fixture.w}%`;
            el.style.height = `${fixture.h}%`;
            if (fixture.rotation) {
                el.style.transform = `rotate(${fixture.rotation}deg)`;
            }

            const isVertical = fixture.vertical;
            let content = '';
            if (fixture.icon) {
                content += `<div style="font-size: 1.5rem; margin-bottom: 2px;">${fixture.icon}</div>`;
            }
            if (fixture.style === 'text') {
                content += `<div ${isVertical ? 'class="v-text"' : ''} style="font-size: 0.8rem;">${fixture.label}</div>`;
            } else {
                content += `<div ${isVertical ? 'class="v-text"' : ''} style="font-size: ${fixture.label.length <= 3 ? '1.4rem' : '0.9rem'}; letter-spacing: 0.1rem;">${fixture.label}</div>`;
                if (fixture.sublabel) {
                    content += `<div style="font-size: 0.7rem; font-weight: 400;">${fixture.sublabel}</div>`;
                }
            }

            el.innerHTML = `
                ${content}
                <div class="delete-btn" data-fixture-id="${fixture.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <div class="rotate-btn">↻</div>
                <div class="resize-handle"></div>
            `;

            // Drag (but not from resize handle, delete btn, or rotate btn)
            el.addEventListener('mousedown', (e) => {
                if (e.target.closest('.delete-btn') || e.target.closest('.resize-handle') || e.target.closest('.rotate-btn')) return;
                this.startFixtureDrag(e, fixture, el, container);
            });

            // Rotate
            el.querySelector('.rotate-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                fixture.rotation = ((fixture.rotation || 0) + 90) % 360;
                el.style.transform = `rotate(${fixture.rotation}deg)`;
            });

            // Resize
            el.querySelector('.resize-handle').addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startFixtureResize(e, fixture, el, container);
            });

            // Delete
            el.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await showConfirm(`ต้องการลบ "${fixture.label}" ใช่หรือไม่?`)) {
                    this.fixtures = this.fixtures.filter(f => f.id !== fixture.id);
                    this.renderFixtures(container);
                }
            });

            wrapper.appendChild(el);
        });
    }

    startFixtureDrag(e, fixture, el, container) {
        this.isDragging = true;
        el.classList.add('dragging');

        const rect = container.querySelector('#designer-canvas-wrapper').getBoundingClientRect();

        const move = (moveEvent) => {
            if (!this.isDragging) return;
            let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100 - fixture.w, x));
            y = Math.max(0, Math.min(100 - fixture.h, y));
            fixture.x = x;
            fixture.y = y;
            el.style.left = `${x}%`;
            el.style.top = `${y}%`;
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

    startFixtureResize(e, fixture, el, container) {
        e.preventDefault();
        const rect = container.querySelector('#designer-canvas-wrapper').getBoundingClientRect();

        const move = (moveEvent) => {
            let mouseX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            let mouseY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

            let newW = mouseX - fixture.x;
            let newH = mouseY - fixture.y;

            // Min size 3%, max to edge
            newW = Math.max(3, Math.min(100 - fixture.x, newW));
            newH = Math.max(3, Math.min(100 - fixture.y, newH));

            fixture.w = newW;
            fixture.h = newH;
            el.style.width = `${newW}%`;
            el.style.height = `${newH}%`;
        };

        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
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
                <div class="delete-btn" data-id="${table.id}" data-number="${table.number}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;

            el.addEventListener('mousedown', (e) => {
                if (e.target.closest('.delete-btn')) return;
                this.startDragging(e, table, el, container);
            });
            el.querySelector('.delete-btn').addEventListener('click', (e) => {
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
        // Add table
        container.querySelector('#btn-add-table').addEventListener('click', async () => {
            const zoneId = parseInt(container.querySelector('#designer-zone-select').value);
            if (!zoneId) return await showAlert('กรุณาเลือกโซนก่อนเพิ่มโต๊ะ');

            const zone = this.zones.find(z => z.id === zoneId);
            const modal = container.querySelector('#table-modal');
            const input = container.querySelector('#table-modal-input');
            const extraFields = container.querySelector('#modal-extra-fields');
            const title = container.querySelector('#modal-title');

            title.textContent = 'ระบุหมายเลขโต๊ะ';
            input.placeholder = 'เช่น A1, B2';
            extraFields.style.display = 'none';
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

        // Add fixture
        container.querySelector('#btn-add-fixture').addEventListener('click', async () => {
            const modal = container.querySelector('#table-modal');
            const input = container.querySelector('#table-modal-input');
            const extraFields = container.querySelector('#modal-extra-fields');
            const title = container.querySelector('#modal-title');

            title.textContent = 'เพิ่มสิ่งอำนวยความสะดวก';
            input.placeholder = 'เช่น STAGE, DJ, BAR, TOILET';
            extraFields.style.display = 'block';
            input.value = '';
            modal.style.display = 'flex';
            input.focus();

            const handleConfirm = async () => {
                const label = input.value.trim();
                if (!label) return;

                const style = container.querySelector('#fixture-style-select').value;
                const id = 'fixture-' + Date.now();

                this.fixtures.push({
                    id,
                    label,
                    x: 40,
                    y: 40,
                    w: 12,
                    h: 10,
                    style: style || '',
                    vertical: false
                });

                this.renderFixtures(container);
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

        // Save map (tables + fixtures)
        container.querySelector('#btn-save-map').addEventListener('click', async () => {
            try {
                // Save tables
                const tablesToSave = this.tables.map(t => {
                    const tableData = {
                        number: t.number,
                        x: t.x,
                        y: t.y,
                        status: t.status,
                        zoneId: t.zoneId
                    };
                    if (t.id) tableData.id = t.id;
                    return tableData;
                });

                await client.post('/tables/bulk', { tables: tablesToSave });

                // Save fixtures
                await client.post('/fixtures', { fixtures: this.fixtures });

                await showAlert('บันทึกผังร้านสำเร็จ!');
                this.tables = await client.get('/tables');
                this.renderTables(container);
            } catch (error) {
                await showAlert('บันทึกผังร้านไม่สำเร็จ: ' + error.message);
            }
        });
    }
}
