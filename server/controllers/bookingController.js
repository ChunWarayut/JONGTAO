import { prisma } from '../lib/prisma.js'
import crypto from 'crypto'
import { sendPushToAll } from '../services/pushService.js'

// Store SSE clients
let clients = []

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
        zoneId, tableId, guestCount, extraTable, totalAmount, depositAmount,
        customerName, customerPhone, lineId, arrivalTime, occasion, note,
        bookingDate
    } = req.body

    try {
        // Generate simple QR code string (could be a unique link)
        const qrCode = crypto.randomBytes(8).toString('hex')

        const booking = await prisma.booking.create({
            data: {
                zoneId: parseInt(zoneId),
                tableId: tableId ? parseInt(tableId) : null,
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
                bookingDate: new Date(bookingDate),
                status: 'pending',
                paymentMethod: req.body.paymentMethod || 'promptpay',
                paymentStatus: 'unpaid'
            }
        })

        // Notify SSE clients
        notifyClients('new_booking', {
            booking: {
                id: booking.id,
                customerName,
                customerPhone,
                guestCount: parseInt(guestCount),
                zoneId: parseInt(zoneId),
                arrivalTime,
                bookingDate
            }
        })

        // ส่ง Web Push ไปยัง admin ที่ subscribe ไว้ (ทำงานแม้ปิดเบราว์เซอร์)
        sendPushToAll({
            title: 'การจองใหม่เข้ามา!',
            body: `${customerName} - ${parseInt(guestCount)} ท่าน`,
            type: 'booking',
            tag: `booking-${booking.id}`,
            url: '/admin',
        }).catch((err) => console.error('Push notification error:', err))

        res.status(201).json(booking)
    } catch (error) {
        console.error('Create booking error:', error)
        res.status(400).json({ error: 'Could not create booking' })
    }
}

export const getAllBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            include: { zone: true, table: true },
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

        let startOfDayBKK, startOfTomorrowBKK;

        if (dateParam) {
            // Use the provided date (format: YYYY-MM-DD)
            const [yr, mo, da] = dateParam.split('-');
            const startOfDayBKKText = `${yr}-${mo}-${da}T00:00:00+07:00`;
            startOfDayBKK = new Date(startOfDayBKKText);
            startOfTomorrowBKK = new Date(startOfDayBKK.getTime() + 24 * 60 * 60 * 1000);
        } else {
            // Find current date in BKK (default behavior)
            const bkkTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
            const bkkDate = new Date(bkkTimeStr);

            // Extract YYYY-MM-DD for today in BKK
            const yr = bkkDate.getFullYear();
            const mo = String(bkkDate.getMonth() + 1).padStart(2, '0');
            const da = String(bkkDate.getDate()).padStart(2, '0');

            // BKK timezone is UTC+7, so midnight BKK is 17:00 UTC the previous day
            // Construct the strict ISO string for the start of today in BKK
            const startOfDayBKKText = `${yr}-${mo}-${da}T00:00:00+07:00`;
            startOfDayBKK = new Date(startOfDayBKKText);

            // Start of tomorrow is exactly 24 hours later
            startOfTomorrowBKK = new Date(startOfDayBKK.getTime() + 24 * 60 * 60 * 1000);
        }

        // Fetch all active bookings and filter in memory to bypass SQLite/Prisma DateTime inconsistencies
        const allBookings = await prisma.booking.findMany({
            where: {
                status: { not: 'cancelled' }
            },
            select: {
                id: true,
                tableId: true,
                bookingDate: true,
                status: true
            }
        });

        // Filter bookings that fall within the specified date boundary
        const bookings = allBookings.filter(b => {
            const bDate = new Date(b.bookingDate);
            return bDate >= startOfDayBKK && bDate < startOfTomorrowBKK;
        });

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
            include: { zone: true }
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

export const getBookingByQR = async (req, res) => {
    try {
        const { qrCode } = req.params

        const booking = await prisma.booking.findUnique({
            where: { qrCode },
            include: {
                zone: true,
                table: true
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
