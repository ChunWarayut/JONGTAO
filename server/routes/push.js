import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { prisma } from '../index.js'

const router = express.Router()

// POST /api/push/subscribe - บันทึก push subscription ของ admin
router.post('/subscribe', authenticate, async (req, res) => {
    const { endpoint, keys } = req.body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({ error: 'ข้อมูล subscription ไม่ครบ' })
    }

    try {
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            create: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Subscribe error:', error)
        res.status(500).json({ error: 'บันทึก subscription ไม่สำเร็จ' })
    }
})

// DELETE /api/push/unsubscribe - ลบ push subscription
router.delete('/unsubscribe', authenticate, async (req, res) => {
    const { endpoint } = req.body

    if (!endpoint) {
        return res.status(400).json({ error: 'ต้องระบุ endpoint' })
    }

    try {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint },
        })

        res.json({ success: true })
    } catch (error) {
        console.error('Unsubscribe error:', error)
        res.status(500).json({ error: 'ลบ subscription ไม่สำเร็จ' })
    }
})

// GET /api/push/vapid-public-key - ส่ง VAPID public key ไปให้ frontend
router.get('/vapid-public-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY
    if (!key) {
        return res.status(500).json({ error: 'VAPID key ยังไม่ได้ตั้งค่า' })
    }
    res.json({ publicKey: key })
})

export default router
