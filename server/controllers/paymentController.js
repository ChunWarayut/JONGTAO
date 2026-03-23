import { prisma } from '../index.js'
import { notifyClients } from './bookingController.js'

export const uploadSlip = async (req, res) => {
    const { bookingId } = req.params
    const { slipImage } = req.body

    if (!bookingId || !slipImage) {
        return res.status(400).json({ error: 'bookingId and slipImage are required' })
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        await prisma.booking.update({
            where: { id: parseInt(bookingId) },
            data: {
                slipImageUrl: slipImage,
                paymentStatus: 'pending_verification'
            }
        })

        // Notify admin via SSE
        notifyClients()

        res.json({ success: true, message: 'Slip uploaded successfully' })
    } catch (error) {
        console.error('Upload slip error:', error)
        res.status(500).json({ error: 'Could not upload slip' })
    }
}

export const confirmPayment = async (req, res) => {
    const { bookingId } = req.params

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        await prisma.booking.update({
            where: { id: parseInt(bookingId) },
            data: {
                status: 'confirmed',
                paymentStatus: 'paid'
            }
        })

        notifyClients()

        res.json({ success: true, message: 'Payment confirmed' })
    } catch (error) {
        console.error('Confirm payment error:', error)
        res.status(500).json({ error: 'Could not confirm payment' })
    }
}

export const rejectPayment = async (req, res) => {
    const { bookingId } = req.params
    const { reason } = req.body

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        await prisma.booking.update({
            where: { id: parseInt(bookingId) },
            data: {
                paymentStatus: 'slip_rejected',
                slipImageUrl: null,
                slipRejectReason: reason || 'สลิปไม่ถูกต้อง'
            }
        })

        notifyClients()

        res.json({ success: true, message: 'Slip rejected' })
    } catch (error) {
        console.error('Reject payment error:', error)
        res.status(500).json({ error: 'Could not reject payment' })
    }
}

export const checkPaymentStatus = async (req, res) => {
    const { bookingId } = req.params

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        res.json({
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            slipImageUrl: booking.slipImageUrl,
            slipRejectReason: booking.slipRejectReason
        })
    } catch (error) {
        console.error('Check payment status error:', error)
        res.status(500).json({ error: 'Could not check payment status' })
    }
}
