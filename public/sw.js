// Service Worker สำหรับ Web Push Notifications
// ไฟล์นี้ต้องอยู่ที่ root เพื่อให้ scope ครอบคลุมทั้งเว็บไซต์

// ติดตั้ง SW ใหม่ทันทีโดยไม่รอ SW ตัวเก่า
self.addEventListener('install', (event) => {
    self.skipWaiting()
})

// เมื่อ activate ให้ claim clients ทันทีเพื่อควบคุมทุก tab
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
    // ต้อง parse payload ให้ถูกต้อง — fallback ถ้า parse ไม่ได้
    let data = { title: 'Jongtao', body: 'มีการแจ้งเตือนใหม่' }

    if (event.data) {
        try {
            data = event.data.json()
        } catch (e) {
            data = { title: 'Jongtao', body: event.data.text() }
        }
    }

    const title = data.title || 'Jongtao'
    const options = {
        body: data.body || data.message || 'มีการแจ้งเตือนใหม่',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'jongtao-' + Date.now(),
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/admin',
            type: data.type || 'booking',
        },
    }

    event.waitUntil(
        self.registration.showNotification(title, options)
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url = event.notification.data?.url || '/admin'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // ถ้ามีแท็บ admin เปิดอยู่แล้ว ให้ focus ไปที่แท็บนั้น
            for (const client of windowClients) {
                if (client.url.includes('/admin') && 'focus' in client) {
                    return client.focus()
                }
            }
            // ถ้าไม่มีแท็บเปิดอยู่ เปิดแท็บใหม่
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})
