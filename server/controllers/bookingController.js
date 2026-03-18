import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Store SSE clients
let clients = []

export const streamBookings = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Add this client
    clients.push(res)

    req.on('close', () => {
        clients = clients.filter(c => c !== res)
    })
}

const notifyClients = () => {
    clients.forEach(client => {
        client.write('data: update\n\n')
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
        notifyClients()

        res.status(201).json(booking)
    } catch (error) {
        console.error('Create booking error:', error)
        res.status(400).json({ error: 'Could not create booking', details: error.message })
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
    const { id } = req.params
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
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
        notifyClients()
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
        notifyClients()
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
