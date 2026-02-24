import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const roleMiddleware = (role: 'rider' | 'driver') => {
    return (req: any, res: Response, next: NextFunction) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: `Access denied. ${role} only.` });
        }
        next();
    };
};
