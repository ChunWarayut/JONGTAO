import express from 'express'
import * as paymentController from '../controllers/paymentController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Upload slip (customer)
router.post('/upload-slip/:bookingId', express.json({ limit: '10mb' }), paymentController.uploadSlip)

// Admin confirm payment
router.post('/confirm/:bookingId', express.json(), authenticate, paymentController.confirmPayment)

// Admin reject slip
router.post('/reject/:bookingId', express.json(), authenticate, paymentController.rejectPayment)

// Check payment status
router.get('/check-status/:bookingId', paymentController.checkPaymentStatus)

export default router
