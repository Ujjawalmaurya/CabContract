import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../types';

// In-memory user store
export const users: User[] = [];

export const register = async (req: Request, res: Response) => {
    const { email, password, role, walletAddress } = req.body;

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
        id: Date.now().toString(),
        email,
        passwordHash,
        role,
        walletAddress
    };

    users.push(newUser);

    const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, walletAddress: newUser.walletAddress },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: { email, role, walletAddress } });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    res.json({ token, user: { email: user.email, role: user.role, walletAddress: user.walletAddress } });
};
