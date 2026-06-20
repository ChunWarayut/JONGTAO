class NotificationManager {
    constructor() {
        this.container = null
        this.soundEnabled = localStorage.getItem('notif_sound') !== 'false'
        this.audioUnlocked = false
        this.audioCtx = null // Shared AudioContext, created on first user gesture

        // Alert system state
        this.alertQueue = []
        this.activeAlert = null
        this.ringingNodes = [] // active oscillators/gains for current ring
        this.ringingInterval = null

        // Browser Notification API permission state
        this.browserNotifPermission = typeof Notification !== 'undefined'
            ? Notification.permission
            : 'denied'

        // Push subscription state
        this.swRegistration = null
        this.pushSubscription = null

        this.init()
    }

    init() {
        // Toast container
        this.container = document.createElement('div')
        this.container.id = 'toast-container'
        this.container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none; max-width: 400px;
        `
        document.body.appendChild(this.container)

        // Alert overlay (persistent, hidden by default)
        this._createAlertOverlay()

        // Unlock AudioContext on first user interaction.
        // We MUST create/resume the AudioContext inside the user-gesture handler,
        // otherwise the browser's autoplay policy will block all future sound.
        const unlock = () => {
            if (!this.audioCtx) {
                try {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
                } catch (e) {
                    console.warn('Could not create AudioContext:', e)
                    return
                }
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume()
            }
            this.audioUnlocked = true
            document.removeEventListener('click', unlock)
            document.removeEventListener('touchstart', unlock)
            document.removeEventListener('keydown', unlock)
        }
        document.addEventListener('click', unlock)
        document.addEventListener('touchstart', unlock)
        document.addEventListener('keydown', unlock)
    }

    // ─── Browser Notification API (OS-level notifications) ──────────

    /**
     * Request permission for browser/OS-level notifications.
     * Call this after a user gesture (e.g. after login).
     * Returns the permission state: 'granted', 'denied', or 'default'.
     */
    async requestBrowserPermission() {
        if (typeof Notification === 'undefined') {
            console.warn('Browser Notification API not supported')
            return 'denied'
        }

        if (Notification.permission === 'granted') {
            this.browserNotifPermission = 'granted'
            return 'granted'
        }

        if (Notification.permission === 'denied') {
            this.browserNotifPermission = 'denied'
            return 'denied'
        }

        // permission === 'default' -> ask the user
        try {
            const result = await Notification.requestPermission()
            this.browserNotifPermission = result
            return result
        } catch (e) {
            console.warn('Notification permission request failed:', e)
            this.browserNotifPermission = 'denied'
            return 'denied'
        }
    }

    /**
     * Show an OS-level browser notification.
     * Works when the tab is minimized or in the background.
     * Clicking the notification focuses the admin tab.
     *
     * @param {Object} opts - { title, message, type, tag }
     *   - tag: optional dedup key; notifications with the same tag replace each other
     */
    showBrowserNotification({ title, message, type = 'booking', tag = undefined }) {
        if (typeof Notification === 'undefined') return
        if (this.browserNotifPermission !== 'granted') return

        // Don't show browser notification if tab is already focused —
        // the in-page alert is enough in that case.
        if (document.visibilityState === 'visible' && document.hasFocus()) return

        const typeConfig = {
            booking: { icon: '/favicon.ico', badge: '/favicon.ico' },
            slip:    { icon: '/favicon.ico', badge: '/favicon.ico' },
        }
        const config = typeConfig[type] || typeConfig.booking

        try {
            const notif = new Notification(title, {
                body: message,
                icon: config.icon,
                badge: config.badge,
                tag: tag || `jongtao-${type}-${Date.now()}`,
                requireInteraction: true, // stay visible until user acts
            })

            // Clicking the notification focuses the admin tab
            notif.onclick = () => {
                window.focus()
                notif.close()
            }

            // Auto-close after 30 seconds to avoid notification pile-up
            setTimeout(() => notif.close(), 30000)
        } catch (e) {
            console.warn('Browser notification failed:', e)
        }
    }

    // ─── Alert System (phone-call style) ────────────────────────────

    _createAlertOverlay() {
        this.overlay = document.createElement('div')
        this.overlay.id = 'alert-overlay'
        this.overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.85);
            display: none;
            align-items: center; justify-content: center;
            backdrop-filter: blur(6px);
            animation: alertFadeIn 0.3s ease;
        `

        this.alertContent = document.createElement('div')
        this.alertContent.id = 'alert-content'
        this.alertContent.style.cssText = `
            background: #1e1e2e;
            border: 2px solid #10b981;
            border-radius: 20px;
            padding: 40px 32px;
            max-width: 420px;
            width: 90%;
            text-align: center;
            color: #fff;
            font-family: inherit;
            box-shadow: 0 0 60px rgba(16,185,129,0.3), 0 20px 60px rgba(0,0,0,0.5);
            animation: alertPulseIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        `
        this.overlay.appendChild(this.alertContent)

        // Inject keyframe animations
        const style = document.createElement('style')
        style.textContent = `
            @keyframes alertFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes alertPulseIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes ringPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
            }
            @keyframes bellShake {
                0%, 100% { transform: rotate(0deg); }
                15% { transform: rotate(15deg); }
                30% { transform: rotate(-15deg); }
                45% { transform: rotate(10deg); }
                60% { transform: rotate(-10deg); }
                75% { transform: rotate(5deg); }
                90% { transform: rotate(-5deg); }
            }
            #alert-badge-count {
                position: absolute; top: -6px; right: -6px;
                background: #ef4444; color: #fff;
                border-radius: 50%; width: 24px; height: 24px;
                font-size: 13px; font-weight: 700;
                display: flex; align-items: center; justify-content: center;
            }
        `
        document.head.appendChild(style)
        document.body.appendChild(this.overlay)
    }

    /**
     * Show an urgent, phone-call-style alert that rings until acknowledged.
     * @param {Object} opts - { title, message, type, icon }
     */
    showAlert({ title, message, type = 'booking', icon = null }) {
        const alert = { title, message, type, icon, timestamp: Date.now() }
        this.alertQueue.push(alert)

        // If no active alert, show immediately
        if (!this.activeAlert) {
            this._presentNextAlert()
        } else {
            // Update badge count on active alert
            this._updateQueueBadge()
        }
    }

    _presentNextAlert() {
        if (this.alertQueue.length === 0) {
            this._hideOverlay()
            return
        }

        const alert = this.alertQueue[0]
        this.activeAlert = alert

        const typeConfig = {
            booking: { color: '#10b981', icon: '🔔', label: 'การจองใหม่' },
            slip:    { color: '#f59e0b', icon: '🧾', label: 'สลิปโอนเงิน' },
        }
        const config = typeConfig[alert.type] || typeConfig.booking
        const displayIcon = alert.icon || config.icon

        const queueCount = this.alertQueue.length
        const badgeHtml = queueCount > 1
            ? `<div id="alert-badge-count">${queueCount}</div>`
            : ''

        this.alertContent.style.borderColor = config.color
        this.alertContent.style.boxShadow = `0 0 60px ${config.color}44, 0 20px 60px rgba(0,0,0,0.5)`

        this.alertContent.innerHTML = `
            <div style="position: relative; display: inline-block; margin-bottom: 16px;">
                <div style="
                    font-size: 4rem;
                    animation: bellShake 0.6s ease-in-out infinite;
                ">${displayIcon}</div>
                ${badgeHtml}
            </div>
            <div style="
                display: inline-block;
                background: ${config.color}22;
                border: 1px solid ${config.color};
                border-radius: 20px;
                padding: 4px 16px;
                font-size: 0.8rem;
                color: ${config.color};
                font-weight: 600;
                margin-bottom: 12px;
                animation: ringPulse 1.5s ease-in-out infinite;
            ">${config.label}</div>
            <h2 style="
                font-size: 1.5rem;
                font-weight: 800;
                margin: 0 0 8px 0;
                color: #fff;
            ">${alert.title}</h2>
            <p style="
                font-size: 1rem;
                color: #a0a0b0;
                margin: 0 0 28px 0;
                line-height: 1.5;
            ">${alert.message}</p>
            <button id="alert-ack-btn" style="
                background: ${config.color};
                color: #fff;
                border: none;
                border-radius: 12px;
                padding: 14px 40px;
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.15s, box-shadow 0.15s;
                box-shadow: 0 4px 20px ${config.color}55;
                font-family: inherit;
            ">รับทราบ</button>
            ${queueCount > 1 ? `
                <p style="
                    margin-top: 14px;
                    font-size: 0.8rem;
                    color: #666;
                ">ยังเหลืออีก ${queueCount - 1} รายการ</p>
            ` : ''}
        `

        const ackBtn = this.alertContent.querySelector('#alert-ack-btn')
        ackBtn.addEventListener('mouseenter', () => {
            ackBtn.style.transform = 'scale(1.05)'
            ackBtn.style.boxShadow = `0 6px 30px ${config.color}77`
        })
        ackBtn.addEventListener('mouseleave', () => {
            ackBtn.style.transform = 'scale(1)'
            ackBtn.style.boxShadow = `0 4px 20px ${config.color}55`
        })
        ackBtn.addEventListener('click', () => this._acknowledgeAlert())

        this.overlay.style.display = 'flex'
        this._startRinging(alert.type)
    }

    _acknowledgeAlert() {
        this._stopRinging()
        this.alertQueue.shift()
        this.activeAlert = null

        if (this.alertQueue.length > 0) {
            // Small delay before showing next alert
            setTimeout(() => this._presentNextAlert(), 300)
        } else {
            this._hideOverlay()
        }
    }

    _hideOverlay() {
        this.overlay.style.display = 'none'
        this.activeAlert = null
    }

    _updateQueueBadge() {
        const badge = this.alertContent.querySelector('#alert-badge-count')
        const count = this.alertQueue.length
        if (badge) {
            badge.textContent = count
        } else if (count > 1) {
            // Re-present to update the badge
            this._stopRinging()
            this._presentNextAlert()
        }
    }

    // ─── Ringing Sound (phone-call pattern) ─────────────────────────

    _startRinging(type = 'booking') {
        if (!this.soundEnabled) return
        this._stopRinging()

        // Ensure we have a working AudioContext (created during user gesture)
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            } catch (e) {
                console.warn('Could not create AudioContext for ringing:', e)
                return
            }
        }

        // Resume if suspended (can happen after tab goes idle)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume()
        }

        // Ring immediately, then repeat every 1.5s (1s ring + 0.5s silence)
        this._playRingBurst(type)
        this.ringingInterval = setInterval(() => {
            this._playRingBurst(type)
        }, 1500)
    }

    _playRingBurst(type) {
        if (!this.audioCtx || this.audioCtx.state === 'closed') return

        try {
            const ctx = this.audioCtx
            const now = ctx.currentTime

            // Create two oscillators for a dual-tone ringing sound (like a real phone)
            const osc1 = ctx.createOscillator()
            const osc2 = ctx.createOscillator()
            const gainNode = ctx.createGain()

            osc1.connect(gainNode)
            osc2.connect(gainNode)
            gainNode.connect(ctx.destination)

            if (type === 'slip') {
                // Slightly different tone for slip: 520Hz + 580Hz
                osc1.frequency.setValueAtTime(520, now)
                osc2.frequency.setValueAtTime(580, now)
            } else {
                // Classic phone ring: 440Hz + 480Hz
                osc1.frequency.setValueAtTime(440, now)
                osc2.frequency.setValueAtTime(480, now)
            }

            // Pulsing pattern within the 1-second burst:
            //   ON 0.25s -> ramp down 0.03s -> ON 0.25s -> ramp down 0.03s -> ON 0.2s -> fade out
            // Using linearRampToValueAtTime for gaps avoids the exponential-from-zero problem.
            gainNode.gain.setValueAtTime(0.35, now)            // ON at 0s
            gainNode.gain.setValueAtTime(0.35, now + 0.22)     // hold until 0.22s
            gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25)  // ramp to ~silence by 0.25s
            gainNode.gain.setValueAtTime(0.001, now + 0.30)    // stay silent until 0.30s
            gainNode.gain.linearRampToValueAtTime(0.35, now + 0.32)   // ramp back up by 0.32s
            gainNode.gain.setValueAtTime(0.35, now + 0.52)     // hold until 0.52s
            gainNode.gain.linearRampToValueAtTime(0.001, now + 0.55)  // ramp to ~silence by 0.55s
            gainNode.gain.setValueAtTime(0.001, now + 0.60)    // stay silent until 0.60s
            gainNode.gain.linearRampToValueAtTime(0.35, now + 0.62)   // ramp back up by 0.62s
            gainNode.gain.setValueAtTime(0.35, now + 0.85)     // hold until 0.85s
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0) // fade out by 1.0s

            osc1.start(now)
            osc1.stop(now + 1.0)
            osc2.start(now)
            osc2.stop(now + 1.0)

            // Track nodes so _stopRinging can kill them immediately
            this.ringingNodes.push(osc1, osc2, gainNode)

            // Self-clean after burst completes
            const cleanup = () => {
                this.ringingNodes = this.ringingNodes.filter(n => n !== osc1 && n !== osc2 && n !== gainNode)
            }
            osc1.onended = cleanup
        } catch (e) {
            console.warn('Ring burst failed:', e)
        }
    }

    _stopRinging() {
        if (this.ringingInterval) {
            clearInterval(this.ringingInterval)
            this.ringingInterval = null
        }
        // Stop all active oscillators immediately (don't close the shared AudioContext)
        for (const node of this.ringingNodes) {
            try {
                if (node instanceof OscillatorNode) {
                    node.stop()
                }
                node.disconnect()
            } catch (_) {}
        }
        this.ringingNodes = []
    }

    // ─── Legacy Toast (kept for info-level notifications) ───────────

    playSound(type = 'new_booking') {
        // Legacy method -- now a no-op for alert types since ringing handles them.
        // Only play a quick beep for unknown types.
        if (!this.soundEnabled) return
        if (type === 'new_booking' || type === 'slip_uploaded') return // handled by showAlert

        try {
            if (!this.audioCtx) return
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume()

            const ctx = this.audioCtx
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            oscillator.frequency.setValueAtTime(523, ctx.currentTime)
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.3)
        } catch (e) {
            console.warn('Sound notification failed:', e)
        }
    }

    showToast({ title, message, type = 'info', duration = 6000 }) {
        const colors = {
            booking: { bg: 'rgba(16,185,129,0.95)', border: '#10b981', icon: '🔔' },
            slip:    { bg: 'rgba(245,158,11,0.95)', border: '#f59e0b', icon: '🧾' },
            info:    { bg: 'rgba(124,58,237,0.95)', border: '#7c3aed', icon: 'ℹ️' },
        }
        const c = colors[type] || colors.info

        const toast = document.createElement('div')
        toast.style.cssText = `
            pointer-events: auto;
            background: ${c.bg};
            border: 1px solid ${c.border};
            border-radius: 12px;
            padding: 14px 18px;
            color: white;
            font-family: inherit;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            transform: translateX(120%);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
            cursor: pointer;
            backdrop-filter: blur(10px);
        `
        toast.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <span style="font-size:1.5rem;">${c.icon}</span>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.95rem;margin-bottom:2px;">${title}</div>
                    <div style="font-size:0.85rem;opacity:0.9;">${message}</div>
                </div>
                <span style="cursor:pointer;opacity:0.6;font-size:1.2rem;" onclick="this.closest('[style]').click()">&times;</span>
            </div>
        `

        toast.addEventListener('click', () => this.removeToast(toast))
        this.container.appendChild(toast)

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)'
        })

        setTimeout(() => this.removeToast(toast), duration)
    }

    removeToast(toast) {
        if (!toast.parentNode) return
        toast.style.transform = 'translateX(120%)'
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 300)
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled
        localStorage.setItem('notif_sound', this.soundEnabled)
        return this.soundEnabled
    }

    // ─── Service Worker + Web Push ─────────────────────────────────

    /**
     * ลงทะเบียน Service Worker และ subscribe push notifications
     * เรียกหลัง admin login สำเร็จ
     */
    async registerPushSubscription() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.info('Push notifications ไม่รองรับในเบราว์เซอร์นี้')
            return
        }

        // ต้องได้ notification permission ก่อน subscribe push
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            console.info('Push subscription ข้ามไป — notification permission ยังไม่ได้รับ:', Notification.permission)
            return
        }

        try {
            // ลงทะเบียน service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js')
            console.log('Service Worker registered:', this.swRegistration.scope)

            // รอจน service worker พร้อมใช้งาน
            const registration = await navigator.serviceWorker.ready
            console.log('Service Worker ready')

            // ตรวจสอบว่ามี subscription อยู่แล้วหรือไม่
            let subscription = await registration.pushManager.getSubscription()

            if (!subscription) {
                // ดึง VAPID public key จาก server
                const response = await fetch('/api/push/vapid-public-key')
                if (!response.ok) {
                    console.warn('ไม่สามารถดึง VAPID key ได้:', response.status, response.statusText)
                    return
                }
                const { publicKey } = await response.json()

                if (!publicKey) {
                    console.warn('VAPID public key ว่างเปล่า')
                    return
                }

                // แปลง base64 URL-safe เป็น Uint8Array
                const applicationServerKey = this._urlBase64ToUint8Array(publicKey)

                // สร้าง push subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey,
                })
                console.log('Push subscription สร้างเรียบร้อย')
            } else {
                console.log('Push subscription มีอยู่แล้ว')
            }

            this.pushSubscription = subscription

            // ส่ง subscription ไป server เพื่อบันทึก
            const token = localStorage.getItem('token')
            if (!token) {
                console.warn('ไม่มี auth token — ไม่สามารถบันทึก push subscription ได้')
                return
            }

            const subJSON = subscription.toJSON()
            const saveResponse = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    endpoint: subJSON.endpoint,
                    keys: subJSON.keys,
                }),
            })

            if (!saveResponse.ok) {
                const errorData = await saveResponse.json().catch(() => ({}))
                console.error('บันทึก push subscription ไม่สำเร็จ:', saveResponse.status, errorData)
                return
            }

            console.log('Push subscription บันทึกสำเร็จ')
        } catch (error) {
            console.error('Push subscription ล้มเหลว:', error)
        }
    }

    /**
     * ยกเลิก push subscription (เรียกตอน logout ถ้าต้องการ)
     */
    async unregisterPushSubscription() {
        if (!this.pushSubscription) return

        try {
            const endpoint = this.pushSubscription.endpoint
            await this.pushSubscription.unsubscribe()
            this.pushSubscription = null

            const token = localStorage.getItem('token')
            if (token) {
                await fetch('/api/push/unsubscribe', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ endpoint }),
                })
            }
        } catch (error) {
            console.error('Push unsubscribe ล้มเหลว:', error)
        }
    }

    /**
     * แปลง VAPID key จาก base64url เป็น Uint8Array
     * ใช้สำหรับ PushManager.subscribe()
     */
    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }
}

const notifications = new NotificationManager()
export default notifications
