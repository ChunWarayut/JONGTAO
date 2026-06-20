// Service Worker สำหรับ Web Push Notifications
// ไฟล์นี้ต้องอยู่ที่ root เพื่อให้ scope ครอบคลุมทั้งเว็บไซต์

self.addEventListener('push', (event) => {
    let data = { title: 'Jongtao', body: 'มีการแจ้งเตือนใหม่' }

    if (event.data) {
        try {
            data = event.data.json()
        } catch (e) {
            data.body = event.data.text()
        }
    }

    const options = {
        body: data.body || data.message || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'jongtao-' + Date.now(),
        requireInteraction: true,
        data: {
            url: data.url || '/admin',
            type: data.type || 'booking',
        },
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
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
