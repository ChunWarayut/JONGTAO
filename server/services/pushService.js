import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'

// VAPID configuration is deferred to first use because ES module imports
// execute before dotenv.config() in index.js, so process.env is not yet
// populated at module-evaluation time.
let vapidConfigured = false

function ensureVapidConfigured() {
    if (vapidConfigured) return true

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@jongtao.app'

    if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
        vapidConfigured = true
        console.log('Web Push VAPID configured successfully')
        return true
    } else {
        console.warn('VAPID keys not configured - Web Push จะไม่ทำงาน')
        return false
    }
}

/**
 * ส่ง push notification ไปยังทุก subscription ที่เก็บไว้
 * ถ้า subscription หมดอายุหรือไม่ถูกต้อง จะลบออกอัตโนมัติ
 *
 * @param {Object} payload - { title, body, type, tag, url }
 */
export async function sendPushToAll(payload) {
    if (!ensureVapidConfigured()) {
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

    let sentCount = 0
    let failedCount = 0

    await Promise.allSettled(
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
                sentCount++
            } catch (error) {
                failedCount++
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

    console.log(`Push notifications: ${sentCount} สำเร็จ, ${failedCount} ล้มเหลว จาก ${subscriptions.length} subscriptions`)
}
