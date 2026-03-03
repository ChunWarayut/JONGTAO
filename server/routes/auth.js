import express from 'express'
import * as authController from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', authController.login)
router.get('/check', authenticate, authController.checkAuth)

export default router
