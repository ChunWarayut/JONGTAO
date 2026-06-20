import client from './api/client.js';
import { showAlert } from './utils/dialog.js';
import notifications from './utils/notifications.js';
import Dashboard from './admin/Dashboard.js';
import BookingList from './admin/BookingList.js';
import ZoneManager from './admin/ZoneManager.js';
import SpecialDatesManager from './admin/SpecialDatesManager.js';
import MapDesigner from './admin/MapDesigner.js';
import Settings from './admin/Settings.js';

class AdminApp {
    constructor() {
        this.loginScreen = document.querySelector('#login-screen');
        this.dashboardLayout = document.querySelector('#dashboard-layout');
        this.viewContent = document.querySelector('#admin-view-content');
        this.viewTitle = document.querySelector('#view-title');
        this.navItems = document.querySelectorAll('.nav-item');
        this.ownerName = document.querySelector('#owner-name');
        this.currentViewId = 'dashboard';
        this.currentViewInstance = null;
        this.sseSource = null;

        this.init();
    }

    async init() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const data = await client.get('/auth/check');
                this.showDashboard(data.user);
            } catch (e) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        this.attachGlobalEvents();
    }

    showLogin() {
        this.loginScreen.style.display = 'flex';
        this.dashboardLayout.style.display = 'none';
        localStorage.removeItem('token');
    }

    showDashboard(user) {
        this.loginScreen.style.display = 'none';
        this.dashboardLayout.style.display = 'flex';
        this.ownerName.innerText = user.name || user.username;
        this.renderView('dashboard');
        this.setupRealtimeFeed();

        // เช็คว่าเคย subscribe push แล้วหรือยัง
        this.ensurePushSubscription();
    }

    async ensurePushSubscription() {
        // ถ้า browser ไม่รองรับ ข้ามไป
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
            return;
        }

        // ถ้าเคย grant แล้ว ลง subscribe เลย
        if (Notification.permission === 'granted') {
            await notifications.registerPushSubscription();
            return;
        }

        // ถ้าถูก deny ไปแล้ว ไม่สามารถถามซ้ำได้
        if (Notification.permission === 'denied') {
            this.showPushDeniedModal();
            return;
        }

        // permission === 'default' -> แสดง modal บังคับให้กดอนุญาต
        this.showPushPermissionModal();
    }

    showPushPermissionModal() {
        const overlay = document.createElement('div');
        overlay.id = 'push-permission-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99998;
            background: rgba(0,0,0,0.9);
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(8px);
            animation: alertFadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <div style="
                background: #1e1e2e;
                border: 2px solid #7c3aed;
                border-radius: 20px;
                padding: 40px 32px;
                max-width: 440px;
                width: 90%;
                text-align: center;
                color: #fff;
                font-family: inherit;
                box-shadow: 0 0 60px rgba(124,58,237,0.3), 0 20px 60px rgba(0,0,0,0.5);
                animation: alertPulseIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
                <div style="font-size: 4rem; margin-bottom: 16px;">🔔</div>
                <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0 0 12px 0; color: #fff;">
                    เปิดการแจ้งเตือน
                </h2>
                <p style="font-size: 0.95rem; color: #a0a0b0; margin: 0 0 8px 0; line-height: 1.6;">
                    ระบบต้องการสิทธิ์ในการส่งการแจ้งเตือน<br>
                    เพื่อให้คุณไม่พลาดทุกการจองใหม่
                </p>
                <p style="font-size: 0.85rem; color: #666; margin: 0 0 28px 0;">
                    แจ้งเตือนแม้ปิดหน้าเว็บไปแล้ว
                </p>
                <button id="btn-allow-push" style="
                    background: #7c3aed;
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 14px 40px;
                    font-size: 1.1rem;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(124,58,237,0.4);
                    font-family: inherit;
                    width: 100%;
                    transition: transform 0.15s;
                ">อนุญาตการแจ้งเตือน</button>
                <p style="margin-top: 16px; font-size: 0.75rem; color: #555;">
                    * กด "Allow" / "อนุญาต" บนป๊อปอัพที่ขึ้นมา
                </p>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#btn-allow-push').addEventListener('click', async () => {
            const permission = await notifications.requestBrowserPermission();
            if (permission === 'granted') {
                overlay.remove();
                await notifications.registerPushSubscription();
                notifications.showToast({
                    title: 'เปิดการแจ้งเตือนสำเร็จ',
                    message: 'คุณจะได้รับแจ้งเตือนทุกการจองใหม่',
                    type: 'info',
                    duration: 4000
                });
            } else if (permission === 'denied') {
                overlay.remove();
                this.showPushDeniedModal();
            }
            // ถ้า 'default' (ผู้ใช้ปิด popup โดยไม่กด) -> modal ยังอยู่
        });
    }

    showPushDeniedModal() {
        const overlay = document.createElement('div');
        overlay.id = 'push-denied-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99998;
            background: rgba(0,0,0,0.85);
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(6px);
        `;

        overlay.innerHTML = `
            <div style="
                background: #1e1e2e;
                border: 2px solid #ef4444;
                border-radius: 20px;
                padding: 40px 32px;
                max-width: 440px;
                width: 90%;
                text-align: center;
                color: #fff;
                font-family: inherit;
                box-shadow: 0 0 40px rgba(239,68,68,0.2);
            ">
                <div style="font-size: 3rem; margin-bottom: 16px;">🔕</div>
                <h2 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 12px 0;">
                    การแจ้งเตือนถูกบล็อก
                </h2>
                <p style="font-size: 0.9rem; color: #a0a0b0; margin: 0 0 20px 0; line-height: 1.6;">
                    กรุณาเปิดการแจ้งเตือนในการตั้งค่า Browser<br>
                    เพื่อไม่ให้พลาดการจองใหม่
                </p>
                <div style="
                    background: #2a2a3e;
                    border-radius: 10px;
                    padding: 14px;
                    text-align: left;
                    font-size: 0.8rem;
                    color: #888;
                    line-height: 1.8;
                    margin-bottom: 24px;
                ">
                    <strong style="color: #ccc;">วิธีเปิด:</strong><br>
                    1. คลิกไอคอน 🔒 ข้างแถบ URL<br>
                    2. หา "Notifications" → เปลี่ยนเป็น "Allow"<br>
                    3. Refresh หน้าเว็บ
                </div>
                <button id="btn-dismiss-denied" style="
                    background: #333;
                    color: #aaa;
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 10px 30px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    font-family: inherit;
                ">รับทราบ</button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelector('#btn-dismiss-denied').addEventListener('click', () => {
            overlay.remove();
        });
    }

    setupRealtimeFeed() {
        if (this.sseSource) this.sseSource.close();
        this.sseSource = new EventSource('/api/bookings/stream');

        this.sseSource.onmessage = async (e) => {
            let event;
            try {
                event = JSON.parse(e.data);
            } catch {
                event = { type: 'generic_update' };
            }

            switch (event.type) {
                case 'connected':
                    this.updateConnectionStatus(true);
                    return;

                case 'new_booking':
                    notifications.showAlert({
                        title: 'การจองใหม่เข้ามา!',
                        message: `${event.booking.customerName} - ${event.booking.guestCount} ท่าน`,
                        type: 'booking',
                    });
                    notifications.showBrowserNotification({
                        title: '🔔 การจองใหม่เข้ามา!',
                        message: `${event.booking.customerName} - ${event.booking.guestCount} ท่าน`,
                        type: 'booking',
                        tag: `booking-${event.booking.id || Date.now()}`,
                    });
                    break;

                case 'slip_uploaded':
                    notifications.showAlert({
                        title: 'สลิปโอนเงินเข้ามา!',
                        message: `${event.customerName} ส่งสลิปมาแล้ว - รอตรวจสอบ`,
                        type: 'slip',
                    });
                    notifications.showBrowserNotification({
                        title: '🧾 สลิปโอนเงินเข้ามา!',
                        message: `${event.customerName} ส่งสลิปมาแล้ว - รอตรวจสอบ`,
                        type: 'slip',
                        tag: `slip-${event.bookingId || Date.now()}`,
                    });
                    break;
            }

            // Soft refresh the current view if it is bookings or dashboard
            if (this.currentViewId === 'dashboard' || this.currentViewId === 'bookings') {
                if (this.currentViewInstance && typeof this.currentViewInstance.render === 'function') {
                    await this.currentViewInstance.render(this.viewContent, false);
                }
            }
        };

        this.sseSource.onerror = () => {
            this.updateConnectionStatus(false);
        };

        this.sseSource.onopen = () => {
            this.updateConnectionStatus(true);
        };
    }

    updateConnectionStatus(connected) {
        const indicator = document.querySelector('#connection-status');
        if (indicator) {
            indicator.style.background = connected ? '#10b981' : '#f59e0b';
            indicator.title = connected ? 'เชื่อมต่อ Real-time อยู่' : 'กำลังเชื่อมต่อใหม่...';
        }
    }

    attachGlobalEvents() {
        // Login form
        const loginForm = document.querySelector('#login-form');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            try {
                const data = await client.post('/auth/login', Object.fromEntries(formData));
                localStorage.setItem('token', data.token);
                this.showDashboard(data.user);
            } catch (err) {
                await showAlert('Login failed: ' + err.message);
            }
        });

        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.renderView(item.getAttribute('data-view'));
                // Close mobile menu when item is clicked
                this.closeMobileMenu();
            });
        });

        // Logout
        document.querySelector('#btn-logout').addEventListener('click', () => {
            this.showLogin();
        });

        // Sound toggle
        const soundBtn = document.querySelector('#btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = notifications.toggleSound();
                soundBtn.innerHTML = `<i data-lucide="${enabled ? 'bell' : 'bell-off'}" style="width: 18px; height: 18px;"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                notifications.showToast({
                    title: enabled ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน',
                    message: enabled ? 'จะมีเสียงเมื่อมีการจองใหม่' : 'ปิดเสียงแจ้งเตือนแล้ว',
                    type: 'info',
                    duration: 3000
                });
            });
        }

        // Mobile menu toggle
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        // Create mobile menu toggle button
        const menuToggle = document.createElement('button');
        menuToggle.className = 'mobile-menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.style.display = 'none'; // Hidden by default, shown by CSS media query

        // Create sidebar overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';

        // Add to dashboard layout
        const dashboardLayout = this.dashboardLayout;
        if (dashboardLayout) {
            dashboardLayout.appendChild(menuToggle);
            dashboardLayout.appendChild(overlay);
        }

        // Toggle menu on button click
        menuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close menu on overlay click
        overlay.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Show toggle button on mobile
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleMediaChange = (e) => {
            menuToggle.style.display = e.matches ? 'flex' : 'none';
            if (!e.matches) {
                this.closeMobileMenu();
            }
        };
        mediaQuery.addListener(handleMediaChange);
        handleMediaChange(mediaQuery);
    }

    toggleMobileMenu() {
        const sidebar = this.dashboardLayout.querySelector('.sidebar');
        const overlay = this.dashboardLayout.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('mobile-active');
            overlay.classList.toggle('active');
        }
    }

    closeMobileMenu() {
        const sidebar = this.dashboardLayout.querySelector('.sidebar');
        const overlay = this.dashboardLayout.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
        }
    }

    renderView(view) {
        this.currentViewId = view;
        this.viewContent.innerHTML = '<div class="loader"></div>';

        switch (view) {
            case 'dashboard':
                this.viewTitle.innerText = 'ภาพรวมแดชบอร์ด';
                this.currentViewInstance = new Dashboard();
                break;
            case 'bookings':
                this.viewTitle.innerText = 'รายการจองทั้งหมด';
                this.currentViewInstance = new BookingList();
                break;
            case 'zones':
                this.viewTitle.innerText = 'จัดการโซนและราคา';
                this.currentViewInstance = new ZoneManager();
                break;
            case 'special-dates':
                this.viewTitle.innerText = 'วันพิเศษและอีเวนท์';
                this.currentViewInstance = new SpecialDatesManager();
                break;
            case 'map':
                this.viewTitle.innerText = 'ออกแบบผังร้าน';
                this.currentViewInstance = new MapDesigner();
                break;
            case 'revenue':
                this.viewTitle.innerText = 'สรุปรายได้';
                this.currentViewInstance = new Dashboard();
                this.currentViewInstance.period = 'month';
                break;
            case 'settings':
                this.viewTitle.innerText = 'ตั้งค่าระบบ';
                this.currentViewInstance = new Settings();
                break;
        }

        if (this.currentViewInstance) {
            this.currentViewInstance.render(this.viewContent, true);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
