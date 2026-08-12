import { prisma } from '../lib/prisma.js'
import crypto from 'crypto'
import { sendPushToAll } from '../services/pushService.js'

// Store SSE clients
let clients = []

// Returns the [start, start+24h) UTC instants for the Bangkok (UTC+7) day that `date` falls on.
// Used by both the availability view and the double-booking guard so they agree on "same day".
// SQLite serialises writers with a database-level lock, so concurrent booking attempts
// can surface a transient "database is locked" (SQLITE_BUSY) or Prisma P2034 write
// conflict. Retry those a few times with a tiny backoff before giving up.
const isTransientWriteError = (error) => {
    if (!error) return false
    if (error.code === 'P2034') return true
    const msg = `${error.message || ''}`
    return /database is locked|SQLITE_BUSY|write conflict|deadlock/i.test(msg)
}

export const withWriteRetry = async (fn, attempts = 5) => {
    let lastError
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn()
        } catch (error) {
            // Business-rule rejections (table taken, hold expired) must NOT be retried.
            if (!isTransientWriteError(error)) throw error
            lastError = error
            await new Promise((r) => setTimeout(r, 50 * (i + 1)))
        }
    }
    throw lastError
}

// A booking may span several tables. Clients send `tableIds`; older callers (and the
// pre-multi-table client) send a single `tableId`. Normalise both into a deduped array.
export const normaliseTableIds = (tableIds, tableId) => {
    const raw = Array.isArray(tableIds) && tableIds.length ? tableIds : (tableId ? [tableId] : [])
    const parsed = raw.map((id) => parseInt(id)).filter((id) => Number.isInteger(id))
    return [...new Set(parsed)]
}

export const getBkkDayRange = (date) => {
    const bkkStr = (date || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
    const bkkDate = new Date(bkkStr)
    const yr = bkkDate.getFullYear()
    const mo = String(bkkDate.getMonth() + 1).padStart(2, '0')
    const da = String(bkkDate.getDate()).padStart(2, '0')
    const startOfDayBKK = new Date(`${yr}-${mo}-${da}T00:00:00+07:00`)
    const startOfTomorrowBKK = new Date(startOfDayBKK.getTime() + 24 * 60 * 60 * 1000)
    return { startOfDayBKK, startOfTomorrowBKK }
}

export const streamBookings = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    res.write('data: {"type":"connected"}\n\n')

    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n')
    }, 30000)

    clients.push(res)

    req.on('close', () => {
        clearInterval(heartbeat)
        clients = clients.filter(c => c !== res)
    })
}

export const notifyClients = (eventType = 'update', payload = {}) => {
    const data = JSON.stringify({ type: eventType, ...payload })
    clients.forEach(client => {
        client.write(`data: ${data}\n\n`)
    })
}

export const createBooking = async (req, res) => {
    const {
        zoneId, tableId, tableIds, guestCount, extraTable, totalAmount, depositAmount,
        customerName, customerPhone, lineId, arrivalTime, occasion, note,
        bookingDate, sessionId, idempotencyKey
    } = req.body

    try {
        // Idempotency: if this exact submission was already processed (client retry,
        // double-tap, flaky network), replay the original booking instead of creating
        // a duplicate. The unique index on idempotencyKey also guards the race below.
        if (idempotencyKey) {
            const existing = await prisma.booking.findUnique({ where: { idempotencyKey } })
            if (existing) return res.status(200).json(existing)
        }

        // Generate simple QR code string (could be a unique link)
        const qrCode = crypto.randomBytes(8).toString('hex')

        const parsedTableIds = normaliseTableIds(tableIds, tableId)
        const bookingDateObj = new Date(bookingDate)

        // Compute BKK day boundaries for the requested booking date
        // (mirrors getPublicBookings to stay consistent with the availability view)
        const { startOfDayBKK, startOfTomorrowBKK } = getBkkDayRange(bookingDateObj)

        // Run inside a transaction so the "is this table already booked?" check and the
        // insert are atomic. SQLite serialises writers, so this prevents two concurrent
        // requests from both grabbing the same table on the same date (the double-booking bug).
        // Wrapped in a retry loop to ride out transient SQLITE_BUSY / write-conflict errors.
        const booking = await withWriteRetry(() => prisma.$transaction(async (tx) => {
            if (parsedTableIds.length) {
                // Every table on every non-cancelled booking, filtered by date in memory to
                // bypass SQLite/Prisma DateTime inconsistencies (same approach as
                // getPublicBookings). Reads BookingTable, not Booking.tableId, so a table
                // that is only a *secondary* table of another booking still counts as taken.
                const existingForTables = await tx.bookingTable.findMany({
                    where: { tableId: { in: parsedTableIds } },
                    select: {
                        tableId: true,
                        booking: { select: { status: true, bookingDate: true } }
                    }
                })

                const clashed = existingForTables.filter(({ booking: b }) => {
                    if (!b || b.status === 'cancelled') return false
                    const bDate = new Date(b.bookingDate)
                    return bDate >= startOfDayBKK && bDate < startOfTomorrowBKK
                })

                if (clashed.length) {
                    const err = new Error('TABLE_ALREADY_BOOKED')
                    err.code = 'TABLE_ALREADY_BOOKED'
                    throw err
                }

                // Enforce the hold timer: the customer must still own a non-expired hold on
                // *every* table they are booking. If any lapsed (didn't pay in time) that
                // table was released, so the booking is rejected and they must pick again.
                if (sessionId) {
                    // Compare expiry in memory — DateTime WHERE filters are unreliable on
                    // this SQLite/Prisma setup (see getPublicBookings' in-memory date filter).
                    const nowMs = Date.now()
                    const myHolds = await tx.tableHold.findMany({
                        where: { tableId: { in: parsedTableIds }, sessionId },
                        select: { tableId: true, bookingDate: true, expiresAt: true }
                    })
                    const heldIds = new Set(
                        myHolds
                            .filter((h) => {
                                const d = new Date(h.bookingDate)
                                return new Date(h.expiresAt).getTime() > nowMs &&
                                    d >= startOfDayBKK && d < startOfTomorrowBKK
                            })
                            .map((h) => h.tableId)
                    )
                    const missingTableIds = parsedTableIds.filter((id) => !heldIds.has(id))
                    if (missingTableIds.length) {
                        const err = new Error('HOLD_EXPIRED')
                        err.code = 'HOLD_EXPIRED'
                        // Which tables lapsed — lets the client keep the still-held ones
                        // instead of throwing the whole selection away.
                        err.missingTableIds = missingTableIds
                        throw err
                    }
                }
            }

            const created = await tx.booking.create({
                data: {
                    zoneId: parseInt(zoneId),
                    // tables is the authoritative set; tableId mirrors the first one so the
                    // scanner and other single-table read paths keep working.
                    tableId: parsedTableIds[0] ?? null,
                    tables: parsedTableIds.length
                        ? { create: parsedTableIds.map((id) => ({ tableId: id })) }
                        : undefined,
                    guestCount: parseInt(guestCount),
                    extraTable: !!extraTable,
                    totalAmount: parseFloat(totalAmount),
                    depositAmount: parseFloat(depositAmount),
                    customerName,
                    customerPhone,
                    lineId,
                    arrivalTime,
                    occasion,
                    note,
                    qrCode,
                    idempotencyKey: idempotencyKey || null,
                    bookingDate: bookingDateObj,
                    status: 'pending',
                    paymentMethod: req.body.paymentMethod || 'promptpay',
                    paymentStatus: 'unpaid'
                },
                include: { tables: { include: { table: true } } }
            })

            // Holds have served their purpose — release them now that the booking exists.
            if (sessionId) {
                await tx.tableHold.deleteMany({ where: { sessionId } })
            }

            return created
        }))

        // Let the map free up the (now booked) table for everyone watching live.
        notifyClients('holds_update', {})

        const tableNumbers = (booking.tables || []).map((bt) => bt.table?.number).filter(Boolean)
        const tableSummary = tableNumbers.length ? ` (โต๊ะ ${tableNumbers.join(', ')})` : ''

        // Notify SSE clients
        notifyClients('new_booking', {
            booking: {
                id: booking.id,
                customerName,
                customerPhone,
                guestCount: parseInt(guestCount),
                zoneId: parseInt(zoneId),
                tableNumbers,
                arrivalTime,
                bookingDate
            }
        })

        // ส่ง Web Push ไปยัง admin ที่ subscribe ไว้ (ทำงานแม้ปิดเบราว์เซอร์)
        sendPushToAll({
            title: 'การจองใหม่เข้ามา!',
            body: `${customerName} - ${parseInt(guestCount)} ท่าน${tableSummary}`,
            type: 'booking',
            tag: `booking-${booking.id}`,
            url: '/admin',
        }).catch((err) => console.error('Push notification error:', err))

        res.status(201).json(booking)
    } catch (error) {
        if (error.code === 'TABLE_ALREADY_BOOKED') {
            return res.status(409).json({ error: 'โต๊ะนี้เพิ่งถูกจองไปแล้ว กรุณาเลือกโต๊ะอื่น', code: 'TABLE_ALREADY_BOOKED' })
        }
        if (error.code === 'HOLD_EXPIRED') {
            return res.status(409).json({
                error: 'หมดเวลาในการจองโต๊ะ ระบบได้คืนโต๊ะแล้ว กรุณาเลือกโต๊ะใหม่อีกครั้ง',
                code: 'HOLD_EXPIRED',
                missingTableIds: error.missingTableIds || []
            })
        }
        // Two concurrent requests shared an idempotency key — the other one won.
        // Replay its result instead of surfacing a duplicate-key error.
        if (error.code === 'P2002' && idempotencyKey) {
            const existing = await prisma.booking.findUnique({ where: { idempotencyKey } })
            if (existing) return res.status(200).json(existing)
        }
        console.error('Create booking error:', error)
        res.status(400).json({ error: 'Could not create booking' })
    }
}

export const getAllBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: { zone: true, table: true, tables: { include: { table: true } } },
            orderBy: { bookingDate: 'desc' }
        })
        res.json(bookings)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const getPublicBookings = async (req, res) => {
    try {
        // Check if date parameter is provided
        const dateParam = req.query.date;

        // If a date (YYYY-MM-DD) is given, anchor on noon BKK so the day computed below
        // is unambiguous; otherwise default to today in BKK.
        const anchorDate = dateParam ? new Date(`${dateParam}T12:00:00+07:00`) : new Date();
        const { startOfDayBKK, startOfTomorrowBKK } = getBkkDayRange(anchorDate);

        // Fetch all active bookings and filter in memory to bypass SQLite/Prisma DateTime inconsistencies
        const allBookings = await prisma.booking.findMany({
            where: {
                status: { not: 'cancelled' }
            },
            select: {
                id: true,
                tableId: true,
                bookingDate: true,
                status: true,
                tables: { select: { tableId: true } }
            }
        });

        // Filter bookings that fall within the specified date boundary
        const bookings = allBookings
            .filter(b => {
                const bDate = new Date(b.bookingDate);
                return bDate >= startOfDayBKK && bDate < startOfTomorrowBKK;
            })
            // The map greys out every table on the booking, so expose the whole set.
            // tableId stays for older clients that only understand one table.
            .map(({ tables, ...b }) => ({ ...b, tableIds: tables.map(t => t.tableId) }));

        res.json(bookings);
    } catch (error) {
        console.error("getPublicBookings Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const getBookingById = async (req, res) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' })
    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { zone: true, table: true, tables: { include: { table: true } } }
        })
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        res.json(booking)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const updateBookingStatus = async (req, res) => {
    const { id } = req.params
    const { status, paymentStatus } = req.body
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status, paymentStatus }
        })
        notifyClients('status_update', { bookingId: parseInt(id), status, paymentStatus })
        res.json(booking)
    } catch (error) {
        res.status(400).json({ error: 'Could not update booking status' })
    }
}

export const cancelBooking = async (req, res) => {
    const { id } = req.params
    try {
        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status: 'cancelled' }
        })
        notifyClients('booking_cancelled', { bookingId: parseInt(id) })
        res.json(booking)
    } catch (error) {
        res.status(400).json({ error: 'Could not cancel booking' })
    }
}

// Hard delete, as opposed to cancelBooking's soft "status = cancelled".
// Owners need this for junk rows — someone tapping through the flow for fun leaves a
// pending booking that clutters the nightly report. Removing the row also frees the
// table, since availability only looks at non-cancelled bookings.
export const deleteBooking = async (req, res) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' })
    try {
        await prisma.booking.delete({ where: { id } })
        notifyClients('booking_deleted', { bookingId: id })
        notifyClients('holds_update', {})
        res.json({ success: true, id })
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Booking not found' })
        console.error('Delete booking error:', error)
        res.status(400).json({ error: 'Could not delete booking' })
    }
}

export const getBookingByQR = async (req, res) => {
    try {
        const { qrCode } = req.params

        const booking = await prisma.booking.findUnique({
            where: { qrCode },
            include: {
                zone: true,
                table: true,
                tables: { include: { table: true } }
            }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        res.json(booking)
    } catch (error) {
        console.error('Get booking by QR error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
