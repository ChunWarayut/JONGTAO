import express from 'express'
import * as tableController from '../controllers/tableController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/', tableController.getAllTables)
router.post('/bulk', authenticate, tableController.bulkUpsertTables)
router.delete('/:id', authenticate, tableController.deleteTable)

export default router
