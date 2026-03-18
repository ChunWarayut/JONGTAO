import express from 'express'
import * as specialDateController from '../controllers/specialDateController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/', specialDateController.getAllSpecialDates)
router.get('/by-date', specialDateController.getSpecialDateByDate)
router.post('/', authenticate, specialDateController.createSpecialDate)
router.patch('/:id', authenticate, specialDateController.updateSpecialDate)
router.delete('/:id', authenticate, specialDateController.deleteSpecialDate)

export default router
