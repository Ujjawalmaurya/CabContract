import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    try {
        const decoded: any = jwt.verify(token, env.JWT_SECRET);
        if (decoded.walletAddress) {
            decoded.walletAddress = decoded.walletAddress.toLowerCase();
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const roleMiddleware = (...allowedRoles: ('rider' | 'user' | 'driver' | 'hospital' | 'admin')[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${allowedRoles.join(', ')} (You have: ${req.user?.role || 'none'})` 
            });
        }
        next();
    };
};
