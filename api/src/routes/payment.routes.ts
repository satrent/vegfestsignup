import express from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.middleware';
import { Registration } from '../models/Registration';

const router = express.Router();

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.warn('⚠️ STRIPE_SECRET_KEY is missing. Payment routes will fail.');
}

const stripe = new Stripe(stripeKey || 'sk_test_placeholder', {
    apiVersion: '2025-10-16.acacia' as any,
});

router.post('/create-payment-intent', authenticate, async (req, res) => {
    try {
        const userId = (req.user as any).userId; // req.user.userId from auth middleware
        const registration = await Registration.findOne({ userId });

        if (!registration) {
            res.status(404).json({ message: 'Registration not found' });
            return;
        }

        // Calculate Amount Logic (Must match frontend logic roughly, but is source of truth)
        let amount = 0;

        // 1. Application Fee
        const isExhibitor = registration.type === 'Exhibitor' || registration.type === 'Both';
        if (isExhibitor) {
            amount += 5000; // $50.00 in cents
        }

        // 2. Sponsorship Fee
        if (registration.sponsorshipLevel) {
            const level = registration.sponsorshipLevel.toLowerCase();
            switch (level) {
                case 'product':
                    amount += 0;
                    break;
                case 'bronze':
                    amount += 50000; // $500
                    break;
                case 'silver':
                    amount += 100000; // $1000
                    break;
                case 'gold':
                    amount += 250000; // $2500
                    break;
                case 'platinum':
                    amount += 500000; // $5000
                    break;
                case 'presenting':
                    amount += 1000000; // $10000
                    break;
            }
        }

        if (amount === 0) {
            res.status(400).json({ message: 'No payment due' });
            return;
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                registrationId: registration._id.toString(),
                userId: userId.toString()
            }
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
