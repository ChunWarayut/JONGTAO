import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const prisma = new PrismaClient()

export const createPaymentIntent = async (req, res) => {
    const { bookingId, amount, currency = 'thb' } = req.body

    try {
        // 1. Fetch booking to verify
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(bookingId) }
        })

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        // 2. Create PaymentIntent
        // For PromptPay, we need to specify 'promptpay' in payment_method_types
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in subunits (satang for THB)
            currency: currency,
            payment_method_types: ['promptpay'],
            metadata: {
                bookingId: booking.id.toString()
            }
        })

        // 3. Update booking with PaymentIntent ID
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
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)

            // Update booking status
            await prisma.booking.update({
                where: { stripePaymentIntentId: paymentIntent.id },
                data: {
                    status: 'confirmed',
                    paymentStatus: 'paid'
                }
            })
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object
            console.error(`Payment failed: ${failedIntent.last_payment_error?.message}`)

            // Optionally update booking status to cancelled or failed
            await prisma.booking.update({
                where: { stripePaymentIntentId: failedIntent.id },
                data: {
                    paymentStatus: 'failed'
                }
            })
            break;

        case 'payment_intent.created':
        case 'payment_intent.processing':
            // These are expected, no action needed for now
            break;

        default:
            console.log(`Unhandled event type ${event.type}`)
    }

    res.json({ received: true })
}
