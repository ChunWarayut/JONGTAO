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

        // Request browser notification permission after login, then register push
        // IMPORTANT: ต้องรอ permission ก่อน เพราะ pushManager.subscribe() ต้องการ 'granted'
        notifications.requestBrowserPermission().then(permission => {
            if (permission === 'denied') {
                console.info('Browser notifications denied — OS-level alerts will not appear.')
                return
            }
            // ลงทะเบียน Service Worker + Web Push สำหรับ notification แม้ปิดเบราว์เซอร์
            notifications.registerPushSubscription()
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
