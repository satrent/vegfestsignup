// Type augmentation for Express Request
export interface JWTPayload {
    userId: string;
    email: string;
    role: 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN';
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
