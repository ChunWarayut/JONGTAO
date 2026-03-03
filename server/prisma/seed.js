import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    await prisma.appConfig.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.table.deleteMany()
    await prisma.zone.deleteMany()

    const zones = [
        { code: 'A', name: 'Zone A – หน้าเวที', seatsPerTable: 4, totalTables: 8, minSpend: 2000, extraTableCost: 500, color: '#FF6B6B' },
        { code: 'B', name: 'Zone B – กลางร้าน', seatsPerTable: 4, totalTables: 10, minSpend: 1500, extraTableCost: 400, color: '#4ECDC4' },
        { code: 'C', name: 'Zone C – ด้านหลัง', seatsPerTable: 4, totalTables: 6, minSpend: 1000, extraTableCost: 300, color: '#45B7D1' },
        { code: 'VIP', name: 'VIP – ใกล้เวที', seatsPerTable: 6, totalTables: 4, minSpend: 5000, extraTableCost: 1000, color: '#FFD93D' },
    ]

    for (const zoneData of zones) {
        const zone = await prisma.zone.create({ data: zoneData })

        // Seed tables for each zone
        for (let i = 1; i <= zone.totalTables; i++) {
            await prisma.table.create({
                data: {
                    number: `${zone.code}${i}`,
                    x: Math.floor(Math.random() * 80) + 10, // random x 10-90%
                    y: Math.floor(Math.random() * 80) + 10, // random y 10-90%
                    status: 'active',
                    zoneId: zone.id
                }
            })
        }
    }

    // Create owner
    const adminPassword = 'password123'
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    await prisma.owner.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            name: 'Shop Owner'
        }
    })

    // Create default AppConfig
    await prisma.appConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            isBookingOpen: true,
            openTime: "18:00",
            closeTime: "02:00",
            isBookingFeeRequired: true
        }
    })

    console.log('Seed data created successfully')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
