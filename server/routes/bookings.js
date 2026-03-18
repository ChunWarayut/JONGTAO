import express from 'express'
import * as bookingController from '../controllers/bookingController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.get('/stream', bookingController.streamBookings)
router.post('/', bookingController.createBooking)
router.get('/', authenticate, bookingController.getAllBookings)
router.get('/public-status', bookingController.getPublicBookings)
router.get('/qr/:qrCode', bookingController.getBookingByQR)
router.get('/:id', bookingController.getBookingById)
router.patch('/:id/status', authenticate, bookingController.updateBookingStatus)
router.delete('/:id', authenticate, bookingController.cancelBooking)

export default router
