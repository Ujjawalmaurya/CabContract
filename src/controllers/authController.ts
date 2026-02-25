import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../types';

// In-memory user store
export const users: User[] = [];

export const register = async (req: Request, res: Response) => {
    const { email, password, role, walletAddress } = req.body;

    // Validation
    if (!email || !password || !role || !walletAddress) {
        return res.status(400).json({ message: 'All fields are required: email, password, role, walletAddress' });
    }
    if (!['rider', 'driver'].includes(role)) {
        return res.status(400).json({ message: 'Role must be either rider or driver' });
    }
    if (password.length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }
    const trimmedWallet = walletAddress?.trim();
    if (!trimmedWallet || !/^0x[a-fA-F0-9]{40}$/.test(trimmedWallet)) {
        return res.status(400).json({ message: 'Invalid wallet address format (must be 0x followed by 40 hex characters)' });
    }

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
        id: Date.now().toString(),
        email,
        passwordHash,
        role,
        walletAddress: trimmedWallet
    };

    users.push(newUser);

    const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, walletAddress: newUser.walletAddress },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    console.log(`[AUTH] Registered: ${email} as ${role} (wallet: ${walletAddress})`);
    res.status(201).json({ token, user: { id: newUser.id, email, role, walletAddress } });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    console.log(`[AUTH] Login: ${email} (${user.role})`);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, walletAddress: user.walletAddress } });
};
