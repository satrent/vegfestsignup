import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vegfest',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:4200',
    },

    email: {
        service: process.env.EMAIL_SERVICE || 'console',
        from: process.env.EMAIL_FROM || 'noreply@vegfest.org',
        aws: {
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    },

    mockGoogleAuth: process.env.MOCK_GOOGLE_AUTH === 'true',
};

export default config;
