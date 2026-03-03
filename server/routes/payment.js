import express from 'express'
import * as paymentController from '../controllers/paymentController.js'

const router = express.Router()

// Create Payment Intent
router.post('/create-intent', express.json(), paymentController.createPaymentIntent)

// Webhook (Note: this needs raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook)

export default router
