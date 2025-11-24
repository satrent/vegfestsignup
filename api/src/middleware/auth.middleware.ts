import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '../models/User';

// Augment Express Request type
declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            userId: string;
            email: string;
            role: UserRole;
        };
    }
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const payload = verifyToken(token);

        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};

// Convenience middleware for common role checks
export const requireAdmin = requireRole('ADMIN', 'WEB_ADMIN');
export const requireWebAdmin = requireRole('WEB_ADMIN');
