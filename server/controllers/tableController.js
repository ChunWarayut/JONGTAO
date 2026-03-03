import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getAllTables = async (req, res) => {
    try {
        const tables = await prisma.table.findMany({
            include: {
                zone: true
            }
        })
        res.json(tables)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const bulkUpsertTables = async (req, res) => {
    const { tables } = req.body // Array of { id, number, x, y, zoneId, status }
    try {
        const results = await Promise.all(
            tables.map(table => {
                const { id, ...data } = table
                if (id && typeof id === 'number') {
                    return prisma.table.update({
                        where: { id },
                        data
                    })
                } else {
                    return prisma.table.create({
                        data
                    })
                }
            })
        )
        res.json(results)
    } catch (error) {
        console.error('Bulk upsert error:', error)
        res.status(400).json({ error: 'Could not save table layout' })
    }
}

export const deleteTable = async (req, res) => {
    const { id } = req.params
    try {
        // First disconnect any bookings associated with this table
        await prisma.booking.updateMany({
            where: { tableId: parseInt(id) },
            data: { tableId: null }
        })

        await prisma.table.delete({
            where: { id: parseInt(id) }
        })
        res.status(204).send()
    } catch (error) {
        console.error('Delete table error:', error)
        res.status(400).json({ error: 'Could not delete table', details: error.message })
    }
}
