import client from './api/client.js';
import { showAlert } from './utils/dialog.js';
import Dashboard from './admin/Dashboard.js';
import BookingList from './admin/BookingList.js';
import ZoneManager from './admin/ZoneManager.js';
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
    }

    setupRealtimeFeed() {
        if (this.sseSource) this.sseSource.close();
        this.sseSource = new EventSource('http://localhost:3001/api/bookings/stream');

        this.sseSource.onmessage = async (e) => {
            if (e.data === 'update') {
                // Soft refresh the current view if it is bookings or dashboard
                if (this.currentViewId === 'dashboard' || this.currentViewId === 'bookings') {
                    if (this.currentViewInstance && typeof this.currentViewInstance.render === 'function') {
                        // Re-render without showing loader
                        await this.currentViewInstance.render(this.viewContent, false);
                    }
                }
            }
        };
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
            });
        });

        // Logout
        document.querySelector('#btn-logout').addEventListener('click', () => {
            this.showLogin();
        });
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
            case 'map':
                this.viewTitle.innerText = 'ออกแบบผังร้าน';
                this.currentViewInstance = new MapDesigner();
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
