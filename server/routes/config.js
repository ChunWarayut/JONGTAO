import express from 'express'
import { getConfig, updateConfig } from '../controllers/configController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public route to check status
router.get('/', getConfig)

// Protected route to update status (Admin only)
router.patch('/', authenticate, updateConfig)

export default router
