import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getAllZones = async (req, res) => {
    try {
        const zones = await prisma.zone.findMany({
            include: {
                _count: {
                    select: { bookings: { where: { status: { in: ['confirmed', 'checked-in'] } } } }
                }
            }
        })

        // Calculate available tables
        const zonesWithAvailability = zones.map(zone => ({
            ...zone,
            availableTables: zone.totalTables - zone._count.bookings
        }))

        res.json(zonesWithAvailability)
    } catch (error) {
        console.error('Get all zones error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const getZoneById = async (req, res) => {
    const { id } = req.params
    try {
        const zone = await prisma.zone.findUnique({
            where: { id: parseInt(id) }
        })
        if (!zone) return res.status(404).json({ error: 'Zone not found' })
        res.json(zone)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const createZone = async (req, res) => {
    try {
        const zone = await prisma.zone.create({ data: req.body })
        res.status(201).json(zone)
    } catch (error) {
        res.status(400).json({ error: 'Could not create zone' })
    }
}

export const updateZone = async (req, res) => {
    const { id } = req.params
    try {
        const zone = await prisma.zone.update({
            where: { id: parseInt(id) },
            data: req.body
        })
        res.json(zone)
    } catch (error) {
        res.status(400).json({ error: 'Could not update zone' })
    }
}

export const deleteZone = async (req, res) => {
    const { id } = req.params
    try {
        await prisma.zone.delete({ where: { id: parseInt(id) } })
        res.status(204).send()
    } catch (error) {
        res.status(400).json({ error: 'Could not delete zone' })
    }
}
