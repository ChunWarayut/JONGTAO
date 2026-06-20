import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Routes
import authRoutes from './routes/auth.js'
import zoneRoutes from './routes/zones.js'
import bookingRoutes from './routes/bookings.js'
import statsRoutes from './routes/stats.js'
import tableRoutes from './routes/tables.js'
import configRoutes from './routes/config.js'
import paymentRoutes from './routes/payment.js'
import fixtureRoutes from './routes/fixtures.js'
import specialDateRoutes from './routes/specialDates.js'
import pushRoutes from './routes/push.js'

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001 // Using 3001 as seen in .env

app.disable('x-powered-by')
app.use(cors())

app.use('/api/payments', paymentRoutes)

app.use(express.json({ limit: '15mb' }))

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
app.use('/api/fixtures', fixtureRoutes)
app.use('/api/special-dates', specialDateRoutes)
app.use('/api/push', pushRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist'), { extensions: ['html'] }))

// API 404 handler -- must be before SPA catch-all
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' })
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

export { prisma }
