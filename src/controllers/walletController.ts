import { Response } from 'express';
import { contract } from '../config';

export const getBalance = async (req: any, res: Response) => {
    try {
        const balance = await contract.getBalance(req.user.walletAddress);
        res.json({ balance: balance.toString() });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch balance', error: err.message });
    }
};

export const addMoney = async (req: any, res: Response) => {
    const { amount } = req.body;
    try {
        // Note: In a real app, the backend shouldn't pay for the user's money addition.
        // But for this simulation, the contract owner (backend wallet) adds money to their own balance
        // and we simulate the user's balance.
        const tx = await contract.addMoney(BigInt(amount));
        const receipt = await tx.wait();

        console.log('Money Added Tx Receipt:', receipt.hash);

        const newBalance = await contract.getBalance(req.user.walletAddress);
        res.json({ txHash: tx.hash, balance: newBalance.toString() });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to add money', error: err.message });
    }
};
