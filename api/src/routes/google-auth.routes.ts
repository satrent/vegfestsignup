import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '../config';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';

const router = Router();

// Configure Google OAuth strategy
if (config.google.clientId && config.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.google.clientId,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackURL,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;

                    if (!email) {
                        return done(new Error('No email found in Google profile'));
                    }

                    // Find or create user
                    let user = await User.findOne({ googleId: profile.id });

                    if (!user) {
                        // Check if user exists with this email
                        user = await User.findOne({ email });

                        if (user) {
                            // Link Google account to existing user
                            user.googleId = profile.id;
                            user.emailVerified = true;
                        } else {
                            // Create new admin user
                            user = new User({
                                email,
                                googleId: profile.id,
                                firstName: profile.name?.givenName,
                                lastName: profile.name?.familyName,
                                emailVerified: true,
                                role: 'ADMIN', // Default role for Google OAuth users
                            });
                        }

                        user.lastLoginAt = new Date();
                        await user.save();
                    } else {
                        // Update last login
                        user.lastLoginAt = new Date();
                        await user.save();
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );
}

// Initiate Google OAuth
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

// Google OAuth callback
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${config.frontend.url}/login?error=google_auth_failed`,
    }),
    (req: Request, res: Response) => {
        try {
            const user = req.user as any;

            if (!user) {
                res.redirect(`${config.frontend.url}/login?error=no_user`);
                return;
            }

            // Generate JWT token
            const token = generateToken({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            // Redirect to frontend with token
            res.redirect(`${config.frontend.url}/auth/google/callback?token=${token}`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect(`${config.frontend.url}/login?error=auth_failed`);
        }
    }
);

export default router;
