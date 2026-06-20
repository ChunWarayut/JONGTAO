import webpush from 'web-push'
import { prisma } from '../index.js'

// ตั้งค่า VAPID keys สำหรับ Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@jongtao.app'

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
} else {
    console.warn('VAPID keys not configured - Web Push จะไม่ทำงาน')
}

/**
 * ส่ง push notification ไปยังทุก subscription ที่เก็บไว้
 * ถ้า subscription หมดอายุหรือไม่ถูกต้อง จะลบออกอัตโนมัติ
 *
 * @param {Object} payload - { title, body, type, tag, url }
 */
export async function sendPushToAll(payload) {
    if (!vapidPublicKey || !vapidPrivateKey) {
        return
    }

    let subscriptions
    try {
        subscriptions = await prisma.pushSubscription.findMany()
    } catch (error) {
        console.error('ดึง push subscriptions ไม่ได้:', error)
        return
    }

    if (subscriptions.length === 0) return

    const payloadString = JSON.stringify(payload)

    const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            }

            try {
                await webpush.sendNotification(pushSubscription, payloadString)
            } catch (error) {
                // 404 หรือ 410 หมายความว่า subscription หมดอายุแล้ว ลบออก
                if (error.statusCode === 404 || error.statusCode === 410) {
                    console.log(`ลบ expired subscription: ${sub.endpoint.slice(0, 60)}...`)
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id },
                    }).catch(() => {}) // ไม่ต้อง throw ถ้าลบไม่ได้
                } else {
                    console.error(`Push ส่งไม่สำเร็จไปยัง ${sub.endpoint.slice(0, 60)}...:`, error.message)
                }
            }
        })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
        console.log(`Push notifications: ${sent} สำเร็จ, ${failed} ล้มเหลว`)
    }
}
