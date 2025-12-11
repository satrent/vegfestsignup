import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { VerificationCode } from '../models/VerificationCode';
import { generateToken, generateVerificationCode } from '../utils/jwt';
import { emailService } from '../services/email.service';
import { authenticate } from '../middleware/auth.middleware';

// Augment Express Request type
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            userId: string;
            email: string;
            role: 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN';
        };
    }
}

const router = Router();

// Request verification code
router.post(
    '/request-code',
    [
        body('email').isEmail().normalizeEmail({ gmail_remove_subaddress: false }),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email } = req.body;

            // Check for recent code requests (rate limiting)
            const recentCode = await VerificationCode.findOne({
                email,
                createdAt: { $gte: new Date(Date.now() - 60000) }, // Within last minute
            });

            if (recentCode) {
                res.status(429).json({
                    error: 'Please wait before requesting another code',
                    retryAfter: 60,
                });
                return;
            }

            // Generate new code
            const code = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Save code to database
            await VerificationCode.create({
                email,
                code,
                expiresAt,
            });

            // Send email
            await emailService.sendVerificationCode(email, code);

            res.json({
                success: true,
                message: 'Verification code sent to your email',
            });
        } catch (error) {
            console.error('Error requesting verification code:', error);
            res.status(500).json({
                error: 'Failed to send verification code', // Keeping the generic message for UI if it relies on it? No, better to append.
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
);

// Verify code and login
router.post(
    '/verify-code',
    [
        body('email').isEmail().normalizeEmail({ gmail_remove_subaddress: false }),
        body('code').isString().isLength({ min: 6, max: 6 }),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, code } = req.body;

            // Find verification code
            const verificationCode = await VerificationCode.findOne({
                email,
                code,
                verified: false,
            });

            if (!verificationCode) {
                res.status(400).json({ error: 'Invalid verification code' });
                return;
            }

            // Check if expired
            if (verificationCode.isExpired()) {
                res.status(400).json({ error: 'Verification code expired' });
                return;
            }

            // Check max attempts
            if (verificationCode.maxAttemptsReached()) {
                res.status(400).json({ error: 'Maximum attempts reached. Please request a new code.' });
                return;
            }

            // Increment attempts
            verificationCode.attempts += 1;
            await verificationCode.save();

            // Mark as verified
            verificationCode.verified = true;
            await verificationCode.save();

            // Find or create user
            let user = await User.findOne({ email });
            const isNewUser = !user;

            if (!user) {
                user = await User.create({
                    email,
                    emailVerified: true,
                    role: 'PARTICIPANT',
                });

                // Send welcome email
                await emailService.sendWelcomeEmail(email);
            } else {
                // Update existing user
                user.emailVerified = true;
                user.lastLoginAt = new Date();
                await user.save();
            }

            // Generate JWT token
            const token = generateToken({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            res.json({
                success: true,
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    emailVerified: user.emailVerified,
                },
                isNewUser,
            });
        } catch (error) {
            console.error('Error verifying code:', error);
            res.status(500).json({ error: 'Failed to verify code' });
        }
    }
);

// Get current user info
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user!.userId);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// Logout (client-side token removal, but we can track it here)
router.post('/logout', authenticate, async (_req: Request, res: Response) => {
    // In a more complex system, you might invalidate the token here
    // For now, client will just remove the token
    res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
