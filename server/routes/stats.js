import express from 'express'
import * as statsController from '../controllers/statsController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/today', authenticate, statsController.getTodayStats)
router.get('/summary', authenticate, statsController.getSummaryStats)
router.get('/revenue', authenticate, statsController.getRevenueStats)

export default router
