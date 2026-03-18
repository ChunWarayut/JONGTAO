import Stripe from 'stripe'
import { prisma } from '../index.js'
import { notifyClients } from './bookingController.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const createPaymentIntent = async (req, res) => {
    const { bookingId, amount, currency = 'thb' } = req.body

    try {
        // Input validation
        if (!bookingId || !amount) {
            return res.status(400).json({ error: 'bookingId and amount are required' })
        }

        const parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'amount must be a positive number' })
        }

        // 1. Fetch booking to verify
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        // 2. Verify amount matches booking deposit
        if (Math.abs(parsedAmount - booking.depositAmount) > 0.01) {
            return res.status(400).json({ error: 'Amount does not match booking deposit' })
        }

        // 3. Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parsedAmount * 100), // Stripe expects amount in subunits (satang for THB)
            currency: currency,
            payment_method_types: ['promptpay'],
            metadata: {
                bookingId: booking.id.toString()
            }
        })

        // 4. Update booking with PaymentIntent ID
        await prisma.booking.update({
            where: { id: booking.id },
            data: { stripePaymentIntentId: paymentIntent.id }
        })

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        })
    } catch (error) {
        console.error('Create PaymentIntent error:', error)
        res.status(500).json({ error: 'Could not create payment intent' })
    }
}

export const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object
                console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)

                await prisma.booking.update({
                    where: { stripePaymentIntentId: paymentIntent.id },
                    data: {
                        status: 'confirmed',
                        paymentStatus: 'paid'
                    }
                })
                
                // Notify clients via SSE
                notifyClients()
                break
            }

            case 'payment_intent.payment_failed': {
                const failedIntent = event.data.object
                console.error(`Payment failed: ${failedIntent.last_payment_error?.message}`)

                await prisma.booking.update({
                    where: { stripePaymentIntentId: failedIntent.id },
                    data: {
                        paymentStatus: 'failed'
                    }
                })
                break
            }

            case 'payment_intent.created':
            case 'payment_intent.processing':
                // Expected lifecycle events, no action needed
                break

            default:
                console.log(`Unhandled event type ${event.type}`)
        }
    } catch (dbError) {
        console.error('Webhook DB operation failed:', dbError)
        // Still return 200 to prevent Stripe from retrying
    }

    res.json({ received: true })
}

export const checkPaymentStatus = async (req, res) => {
    const { bookingId } = req.params

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        if (!booking.stripePaymentIntentId) {
            return res.json({
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                message: 'No payment intent found'
            })
        }

        // Fetch the latest status from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId)

        // Update database if status changed
        let updatedStatus = booking.status
        let updatedPaymentStatus = booking.paymentStatus

        if (paymentIntent.status === 'succeeded' && booking.paymentStatus !== 'paid') {
            updatedStatus = 'confirmed'
            updatedPaymentStatus = 'paid'

            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    status: updatedStatus,
                    paymentStatus: updatedPaymentStatus
                }
            })
            
            // Notify clients via SSE
            notifyClients()
        }

        res.json({
            status: updatedStatus,
            paymentStatus: updatedPaymentStatus,
            stripeStatus: paymentIntent.status,
            updated: updatedStatus !== booking.status || updatedPaymentStatus !== booking.paymentStatus
        })
    } catch (error) {
        console.error('Check payment status error:', error)
        res.status(500).json({ error: 'Could not check payment status' })
    }
}
