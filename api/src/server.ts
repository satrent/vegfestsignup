import express, { Request, Response, NextFunction } from 'express'; // Restart trigger 12
// Restart trigger 3


import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import config from './config';
import connectDatabase from './config/database';

// Import routes
import path from 'path'; // Added import
import authRoutes from './routes/auth.routes';
import googleAuthRoutes from './routes/google-auth.routes';
import mockAuthRoutes from './routes/mock-auth.routes';
import registrationRoutes from './routes/registration.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

// CORS configuration
app.use(
    cors({
        origin: config.frontend.url,
        credentials: true,
    })
);

// Middleware
import cookieParser from 'cookie-parser'; // Added import

// ... imports

app.use(helmet({ crossOriginResourcePolicy: false })); // Allow loading images from different origin (for local uploads)
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Added cookie-parser

// Serve uploaded files statically in development (or locally)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Initialize Passport
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    });
});

// API Routes
app.use('/api/auth', authRoutes);

if (config.mockGoogleAuth) {
    console.log('⚠️  Using MOCK Google Authentication');
    app.use('/api/auth', mockAuthRoutes);
} else {
    app.use('/api/auth', googleAuthRoutes);
}
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin/users', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        // Start listening
        app.listen(config.port, () => {
            console.log('\n🚀 ===== VegFest API Server =====');
            console.log(`📡 Server running on http://localhost:${config.port}`);
            console.log(`🌍 Environment: ${config.nodeEnv}`);
            console.log(`🔗 Frontend URL: ${config.frontend.url}`);

            console.log(`📧 Email Config:`);
            console.log(`   - Service: ${config.email.service}`);
            console.log(`   - From: ${config.email.from}`);

            if (config.email.service === 'smtp') {
                console.log(`   - SMTP Host: ${config.email.smtp.host ? config.email.smtp.host : 'MISSING'}`);
                console.log(`   - SMTP Port: ${config.email.smtp.port}`);
                console.log(`   - SMTP User: ${config.email.smtp.user ? 'Set' : 'MISSING'}`);
            }

            if (config.nodeEnv === 'production' && config.email.service === 'console') {
                console.error('\n⚠️  WARNING: Production environment detected but Email Service is set to CONSOLE.');
                console.error('   Emails will NOT be sent to users. They will be logged to stdout.');
                console.error('   Set EMAIL_SERVICE=smtp and configure SMTP settings to fix this.\n');
            }

            console.log('================================\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
