import { prisma } from '../lib/prisma.js'


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

export const getRevenueStats = async (req, res) => {
    const { period = 'month', year, month } = req.query
    const GATEWAY_FEE_RATE = 0.03
    const now = new Date()

    let startDate, endDate
    if (period === 'today') {
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999)
    } else if (period === 'week') {
        startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999)
    } else if (period === 'month') {
        const y = year ? parseInt(year) : now.getFullYear()
        const m = month ? parseInt(month) - 1 : now.getMonth()
        startDate = new Date(y, m, 1)
        endDate = new Date(y, m + 1, 0, 23, 59, 59, 999)
    } else {
        startDate = new Date(0)
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999)
    }

    try {
        const [paidBookings, unpaidBookings] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    bookingDate: { gte: startDate, lte: endDate },
                    paymentStatus: { not: 'unpaid' },
                    status: { not: 'cancelled' }
                },
                include: { zone: { select: { code: true, name: true } } },
                orderBy: { bookingDate: 'asc' }
            }),
            prisma.booking.findMany({
                where: {
                    bookingDate: { gte: startDate, lte: endDate },
                    paymentStatus: 'unpaid',
                    status: { not: 'cancelled' }
                }
            })
        ])

        const getAmount = (b) => b.paymentStatus === 'deposit' ? (b.depositAmount || 0) : (b.totalAmount || 0)

        // แยก free (totalAmount=0) ออกจาก pending จริงๆ
        const freeBookings = unpaidBookings.filter(b => (b.totalAmount || 0) === 0 && (b.depositAmount || 0) === 0)
        const pendingBookings = unpaidBookings.filter(b => (b.totalAmount || 0) > 0 || (b.depositAmount || 0) > 0)

        const grossRevenue = paidBookings.reduce((sum, b) => sum + getAmount(b), 0)
        const gatewayFee = Math.round(grossRevenue * GATEWAY_FEE_RATE)
        const netRevenue = grossRevenue - gatewayFee
        const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)

        // Group by date
        const byDateMap = {}
        paidBookings.forEach(b => {
            const d = new Date(b.bookingDate).toISOString().split('T')[0]
            if (!byDateMap[d]) byDateMap[d] = { date: d, gross: 0, count: 0 }
            byDateMap[d].gross += getAmount(b)
            byDateMap[d].count++
        })
        const dailyStats = Object.values(byDateMap)
            .map(d => ({ ...d, fee: Math.round(d.gross * GATEWAY_FEE_RATE), net: Math.round(d.gross * (1 - GATEWAY_FEE_RATE)) }))
            .sort((a, b) => b.date.localeCompare(a.date))

        // Group by payment method
        const byMethodMap = {}
        paidBookings.forEach(b => {
            const m = b.paymentMethod || 'other'
            if (!byMethodMap[m]) byMethodMap[m] = { method: m, gross: 0, count: 0 }
            byMethodMap[m].gross += getAmount(b)
            byMethodMap[m].count++
        })
        const methodStats = Object.values(byMethodMap)
            .map(m => ({ ...m, fee: Math.round(m.gross * GATEWAY_FEE_RATE), net: Math.round(m.gross * (1 - GATEWAY_FEE_RATE)) }))
            .sort((a, b) => b.gross - a.gross)

        res.json({
            period, startDate, endDate,
            grossRevenue, gatewayFee, netRevenue,
            gatewayFeeRate: GATEWAY_FEE_RATE,
            paidCount: paidBookings.length,
            freeCount: freeBookings.length,
            pendingCount: pendingBookings.length,
            pendingRevenue,
            dailyStats,
            methodStats
        })
    } catch (error) {
        console.error('Revenue stats error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
