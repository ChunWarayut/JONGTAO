import { prisma } from '../lib/prisma.js'
import { notifyClients, getBkkDayRange, withWriteRetry } from './bookingController.js'

const DEFAULT_HOLD_MINUTES = 15

const getHoldMinutes = async () => {
    const config = await prisma.appConfig.findUnique({ where: { id: 1 } })
    return config?.holdMinutes || DEFAULT_HOLD_MINUTES
}

// A hold is still active when its expiry is in the future. We compare in memory rather
// than in the SQL WHERE clause because DateTime comparisons are unreliable on this
// SQLite/Prisma setup (same reason getPublicBookings filters dates in memory).
const isActive = (hold, now) => new Date(hold.expiresAt).getTime() > now.getTime()

// Delete holds whose timer has elapsed. Called both on a periodic interval (see index.js)
// and lazily; notifies SSE clients so freed tables reappear on everyone's map.
export const cleanupExpiredHolds = async () => {
    try {
        const now = new Date()
        const all = await prisma.tableHold.findMany({ select: { id: true, expiresAt: true } })
        const expiredIds = all.filter((h) => !isActive(h, now)).map((h) => h.id)
        if (expiredIds.length === 0) return 0

        const result = await prisma.tableHold.deleteMany({ where: { id: { in: expiredIds } } })
        if (result.count > 0) notifyClients('holds_update', {})
        return result.count
    } catch (error) {
        console.error('cleanupExpiredHolds error:', error)
        return 0
    }
}

// Place (or refresh) a temporary hold the moment a customer picks a table, so nobody
// else can select it while they complete the booking flow.
export const createHold = async (req, res) => {
    const { tableId, bookingDate, sessionId } = req.body

    if (!tableId || !bookingDate || !sessionId) {
        return res.status(400).json({ error: 'tableId, bookingDate และ sessionId จำเป็นต้องระบุ' })
    }

    try {
        const parsedTableId = parseInt(tableId)
        const bookingDateObj = new Date(bookingDate)
        const { startOfDayBKK, startOfTomorrowBKK } = getBkkDayRange(bookingDateObj)
        const holdMinutes = await getHoldMinutes()
        const now = new Date()
        const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000)

        const hold = await withWriteRetry(() => prisma.$transaction(async (tx) => {
            // 1. Confirmed/pending booking already owns this table on this day?
            const bookings = await tx.booking.findMany({
                where: { tableId: parsedTableId, status: { not: 'cancelled' } },
                select: { bookingDate: true }
            })
            const isBooked = bookings.some((b) => {
                const d = new Date(b.bookingDate)
                return d >= startOfDayBKK && d < startOfTomorrowBKK
            })
            if (isBooked) {
                const err = new Error('TABLE_BOOKED')
                err.code = 'TABLE_BOOKED'
                throw err
            }

            // 2. Another active session is holding this table on this day?
            const tableHolds = await tx.tableHold.findMany({
                where: { tableId: parsedTableId },
                select: { sessionId: true, bookingDate: true, expiresAt: true }
            })
            const heldByOther = tableHolds.some((h) => {
                const d = new Date(h.bookingDate)
                return h.sessionId !== sessionId && isActive(h, now) && d >= startOfDayBKK && d < startOfTomorrowBKK
            })
            if (heldByOther) {
                const err = new Error('TABLE_HELD')
                err.code = 'TABLE_HELD'
                throw err
            }

            // 3. A session may hold only one table at a time — drop any earlier hold
            //    (covers the case where the customer goes back and picks a different table).
            await tx.tableHold.deleteMany({ where: { sessionId } })

            // 4. Create the fresh hold.
            return tx.tableHold.create({
                data: {
                    tableId: parsedTableId,
                    bookingDate: bookingDateObj,
                    sessionId,
                    expiresAt
                }
            })
        }))

        notifyClients('holds_update', {})
        res.status(201).json({ expiresAt: hold.expiresAt, holdMinutes })
    } catch (error) {
        if (error.code === 'TABLE_BOOKED') {
            return res.status(409).json({ error: 'โต๊ะนี้ถูกจองไปแล้ว กรุณาเลือกโต๊ะอื่น' })
        }
        if (error.code === 'TABLE_HELD') {
            return res.status(409).json({ error: 'โต๊ะนี้กำลังถูกเลือกโดยลูกค้าท่านอื่น กรุณาเลือกโต๊ะอื่น' })
        }
        console.error('Create hold error:', error)
        res.status(400).json({ error: 'ไม่สามารถจองโต๊ะชั่วคราวได้' })
    }
}

// Release a customer's hold (cancel / restart / leave). Idempotent.
export const releaseHold = async (req, res) => {
    const { sessionId, tableId } = req.body

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId จำเป็นต้องระบุ' })
    }

    try {
        await prisma.tableHold.deleteMany({
            where: { sessionId, ...(tableId ? { tableId: parseInt(tableId) } : {}) }
        })
        notifyClients('holds_update', {})
        res.json({ ok: true })
    } catch (error) {
        console.error('Release hold error:', error)
        res.status(400).json({ error: 'ไม่สามารถคืนโต๊ะได้' })
    }
}

// Active holds for a given date, used by the map to gray out tables others are holding.
// Includes sessionId so a client can tell its own hold apart and keep it selectable.
export const getPublicHolds = async (req, res) => {
    try {
        const dateParam = req.query.date
        const anchorDate = dateParam ? new Date(`${dateParam}T12:00:00+07:00`) : new Date()
        const { startOfDayBKK, startOfTomorrowBKK } = getBkkDayRange(anchorDate)
        const now = new Date()

        const holds = await prisma.tableHold.findMany({
            select: { tableId: true, sessionId: true, expiresAt: true, bookingDate: true }
        })

        const filtered = holds
            .filter((h) => {
                const d = new Date(h.bookingDate)
                return isActive(h, now) && d >= startOfDayBKK && d < startOfTomorrowBKK
            })
            .map((h) => ({ tableId: h.tableId, sessionId: h.sessionId, expiresAt: h.expiresAt }))

        res.json(filtered)
    } catch (error) {
        console.error('getPublicHolds error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
