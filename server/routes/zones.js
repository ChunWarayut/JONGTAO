import express from 'express'
import * as zoneController from '../controllers/zoneController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/', zoneController.getAllZones)
router.get('/:id', zoneController.getZoneById)
router.post('/', authenticate, zoneController.createZone)
router.put('/:id', authenticate, zoneController.updateZone)
router.delete('/:id', authenticate, zoneController.deleteZone)

export default router
