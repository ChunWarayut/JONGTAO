import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getTodayStats = async (req, res) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    try {
        const todayBookings = await prisma.booking.findMany({
            where: {
                bookingDate: {
                    gte: today,
                    lt: tomorrow
                }
            }
        })

        const stats = {
            totalBookings: todayBookings.length,
            confirmedBookings: todayBookings.filter(b => b.status === 'confirmed').length,
            todayRevenue: todayBookings
                .filter(b => b.paymentStatus !== 'unpaid')
                .reduce((sum, b) => sum + (b.paymentStatus === 'deposit' ? b.depositAmount : b.totalAmount), 0)
        }

        res.json(stats)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const getSummaryStats = async (req, res) => {
    try {
        const allBookings = await prisma.booking.findMany()
        const summary = {
            totalRevenue: allBookings
                .filter(b => b.paymentStatus !== 'unpaid')
                .reduce((sum, b) => sum + (b.paymentStatus === 'deposit' ? b.depositAmount : b.totalAmount), 0),
            totalBookings: allBookings.length
        }
        res.json(summary)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}
