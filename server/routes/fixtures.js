import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authenticate } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()
const FIXTURES_FILE = path.join(__dirname, '../data/fixtures.json')

// Default fixtures matching the venue layout
const DEFAULT_FIXTURES = [
    { id: 'reception', label: 'จุดรับโต๊ะ', sublabel: 'ติด Rich Brand', x: 5, y: 5, w: 22, h: 8, style: '' },
    { id: 'photo', label: 'จุดถ่ายรูปศิลปิน', x: 5, y: 15, w: 22, h: 8, style: '' },
    { id: 'dj', label: 'DJ', x: 16, y: 26, w: 10, h: 10, style: 'accent' },
    { id: 'stage', label: 'STAGE', x: 5, y: 38, w: 9, h: 35, style: 'red', vertical: true },
    { id: 'toilet-left', label: 'TOILET', icon: '🚻', x: 5, y: 76, w: 12, h: 16, style: 'red' },
    { id: 'bar', label: 'BAR', x: 20, y: 78, w: 20, h: 12, style: 'accent' },
    { id: 'toilet-right', label: 'TOILET', icon: '🚻', x: 75, y: 70, w: 15, h: 22, style: 'red' },
    { id: 'outdoor-top', label: 'OUTDOOR', x: 70, y: 5, w: 6, h: 18, style: '', vertical: true },
    { id: 'projector', label: 'PROJECTOR', x: 78, y: 5, w: 6, h: 18, style: 'accent', vertical: true },
    { id: 'outdoor-mid', label: 'OUTDOOR', x: 70, y: 26, w: 14, h: 8, style: '' },
    { id: 'entrance', label: 'ทางเข้า ➔', x: 28, y: 27, w: 8, h: 4, style: 'text' },
    { id: 'exit', label: 'ทางออก ➔', x: 68, y: 62, w: 5, h: 8, style: 'text', vertical: true },
]

// Ensure data directory exists
function ensureDataDir() {
    const dir = path.dirname(FIXTURES_FILE)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

// GET /api/fixtures - public
router.get('/', (req, res) => {
    ensureDataDir()
    if (fs.existsSync(FIXTURES_FILE)) {
        const data = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8'))
        return res.json(data)
    }
    // Return defaults if no saved data
    res.json(DEFAULT_FIXTURES)
})

// POST /api/fixtures - admin only
router.post('/', authenticate, (req, res) => {
    ensureDataDir()
    const { fixtures } = req.body
    fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2))
    res.json({ success: true })
})

export default router
