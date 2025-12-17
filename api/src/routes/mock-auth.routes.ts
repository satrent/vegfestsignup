import { Router, Request, Response } from 'express';
import config from '../config';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';

const router = Router();

// Mock Initiate Google OAuth
router.get('/google', (_req: Request, res: Response) => {
    // Redirect to backend callback immediately
    res.redirect('/api/auth/google/callback');
});

// Mock Google OAuth callback
router.get('/google/callback', async (_req: Request, res: Response) => {
    try {
        const email = 'mock-admin@vegfest.org';

        // Find or create mock user
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                googleId: 'mock_google_id_12345',
                firstName: 'Mock',
                lastName: 'Admin',
                emailVerified: true,
                role: 'ADMIN',
            });
        }

        user.lastLoginAt = new Date();
        await user.save();

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        // Set secure cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        // Redirect to frontend callback (which will just redirect to dashboard)
        res.redirect(`${config.frontend.url}/auth/google/callback`);
    } catch (error) {
        console.error('Mock OAuth callback error:', error);
        res.redirect(`${config.frontend.url}/login?error=auth_failed`);
    }
});

export default router;
