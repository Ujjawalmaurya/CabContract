import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel as User } from '../models/User';

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
    const trimmedWallet = walletAddress?.trim().toLowerCase();
    if (!trimmedWallet || !/^0x[a-fA-F0-9]{40}$/.test(trimmedWallet)) {
        return res.status(400).json({ message: 'Invalid wallet address format (must be 0x followed by 40 hex characters)' });
    }

    try {
        if (await User.findOne({ email })) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({
            email,
            passwordHash,
            role,
            walletAddress: trimmedWallet
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role, walletAddress: newUser.walletAddress },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        console.log(`[AUTH] Registered: ${email} as ${role} (wallet: ${walletAddress})`);
        res.status(201).json({ token, user: { id: newUser._id, email, role, walletAddress } });
    } catch (err: any) {
        console.error('[AUTH] Registration error:', err.message);
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });

        // Normalize stored wallet if it somehow isn't (for legacy users)
        if (user && user.walletAddress !== user.walletAddress.toLowerCase()) {
            user.walletAddress = user.walletAddress.toLowerCase();
            await user.save();
        }

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, walletAddress: user.walletAddress },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        console.log(`[AUTH] Login: ${email} (${user.role})`);
        res.json({ token, user: { id: user._id, email: user.email, role: user.role, walletAddress: user.walletAddress } });
    } catch (err: any) {
        console.error('[AUTH] Login error:', err.message);
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};
