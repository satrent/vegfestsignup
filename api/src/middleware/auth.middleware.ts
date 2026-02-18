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
            isSuperAdmin?: boolean;
            isApprover?: boolean;
        };
    }
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

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

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (!req.user.isSuperAdmin && req.user.role !== 'WEB_ADMIN') {
        res.status(403).json({ error: 'Requires Super Admin privileges' });
        return;
    }

    next();
};

export const requireApprover = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (!req.user.isApprover && !req.user.isSuperAdmin && req.user.role !== 'WEB_ADMIN') {
        res.status(403).json({ error: 'Requires Approver privileges' });
        return;
    }

    next();
};
