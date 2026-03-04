import { Response } from 'express';
import { contract } from '../config';

export const getBalance = async (req: any, res: Response) => {
    try {
        const wallet = req.user.walletAddress.toLowerCase();
        const balance = await contract.getBalance(wallet);
        console.log(`[WALLET] Balance check: ${req.user.email} (${wallet}) -> ₹${balance}`);
        res.json({ balance: balance.toString() });
    } catch (err: any) {
        console.error(`[WALLET] ✗ Failed to fetch balance for ${req.user.email}:`, err.message);
        res.status(500).json({ message: 'Failed to fetch balance', error: err.message });
    }
};

export const addMoney = async (req: any, res: Response) => {
    const { amount } = req.body;

    // Validation
    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    try {
        const wallet = req.user.walletAddress.toLowerCase();
        console.log(`[WALLET] Adding funds for ${req.user.email} (${wallet}): ₹${amount}`);
        const tx = await contract.addMoney(wallet, BigInt(amount));
        const receipt = await tx.wait();

        const newBalance = await contract.getBalance(wallet);
        console.log(`[WALLET] ${req.user.email} added ₹${amount} | txHash: ${receipt.hash}`);

        res.json({ txHash: tx.hash, balance: newBalance.toString() });
    } catch (err: any) {
        console.error(`[WALLET] Failed to add money for ${req.user.email}:`, err.message);
        res.status(500).json({ message: 'Failed to add money', error: err.message });
    }
};
