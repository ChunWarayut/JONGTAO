import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Routes
import authRoutes from './routes/auth.js'
import zoneRoutes from './routes/zones.js'
import bookingRoutes from './routes/bookings.js'
import statsRoutes from './routes/stats.js'
import tableRoutes from './routes/tables.js'
import configRoutes from './routes/config.js'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api/zones', zoneRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/config', configRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

export { prisma }
