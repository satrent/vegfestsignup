import jwt from 'jsonwebtoken';
import config from '../config';
import { UserRole } from '../models/User';

export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
    try {
        return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

export const generateVerificationCode = (): string => {
    // Generate 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
};
