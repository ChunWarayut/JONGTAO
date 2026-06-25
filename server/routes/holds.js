import express from 'express'
import * as holdController from '../controllers/holdController.js'

const router = express.Router()

// Public — customers place / release / query temporary table holds
router.post('/', holdController.createHold)
router.delete('/', holdController.releaseHold)
router.get('/public', holdController.getPublicHolds)

export default router
