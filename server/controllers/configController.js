import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getConfig = async (req, res) => {
    try {
        let config = await prisma.appConfig.findUnique({
            where: { id: 1 }
        })

        if (!config) {
            config = await prisma.appConfig.create({
                data: {
                    id: 1,
                    isBookingOpen: true,
                    openTime: "18:00",
                    closeTime: "02:00",
                    isBookingFeeRequired: true
                }
            })
        }

        res.json({
            ...config,
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        })
    } catch (error) {
        console.error('Get config error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const updateConfig = async (req, res) => {
    const { isBookingOpen, openTime, closeTime, isBookingFeeRequired } = req.body

    try {
        const config = await prisma.appConfig.update({
            where: { id: 1 },
            data: {
                isBookingOpen,
                openTime,
                closeTime,
                isBookingFeeRequired
            }
        })
        res.json(config)
    } catch (error) {
        console.error('Update config error:', error)
        res.status(400).json({ error: 'Could not update config', details: error.message })
    }
}
