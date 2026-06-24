import { Response } from 'express';
import { ethers } from 'ethers';
import { contract } from '../config';
import { RideModel } from '../models/Ride';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

export const getBalance = async (req: any, res: Response) => {
    try {
        const wallet = req.user.walletAddress.toLowerCase();
        const balance = await contract.getBalance(wallet);
        logger.info(`[WALLET] Balance check: ${req.user.email} (${wallet}) -> ₹${balance}`);
        res.json({ balance: balance.toString() });
    } catch (err: any) {
        logger.error(`[WALLET] Failed to fetch balance for ${req.user.email}: ${err.message}`);
        res.status(500).json({ message: 'Failed to fetch balance', error: err.message });
    }
};

export const addMoney = async (req: any, res: Response) => {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    try {
        const wallet = req.user.walletAddress.toLowerCase();
        logger.info(`[WALLET] Adding funds for ${req.user.email} (${wallet}): ₹${amount}`);
        const tx = await contract.addMoney(wallet, BigInt(amount));
        const receipt = await tx.wait();

        const newBalance = await contract.getBalance(wallet);
        logger.info(`[WALLET] ${req.user.email} added ₹${amount} | txHash: ${receipt.hash}`);

        res.json({ txHash: tx.hash, balance: newBalance.toString() });
    } catch (err: any) {
        logger.error(`[WALLET] Failed to add money for ${req.user.email}: ${err.message}`);
        res.status(500).json({ message: 'Failed to add money', error: err.message });
    }
};

export const payFromWallet = async (req: any, res: Response) => {
    const { rideId } = req.body;

    if (!rideId) {
        return res.status(400).json({ message: 'Ride ID is required' });
    }

    try {
        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        const rider = await UserModel.findById(ride.riderId);
        const driver = await UserModel.findById(ride.driverId);

        if (!rider || !driver) {
            return res.status(404).json({ message: 'Rider or Driver not found' });
        }

        const riderWallet = rider.walletAddress.toLowerCase();
        const driverWallet = driver.walletAddress.toLowerCase();

        // 1. Check on-chain balance
        const balance = await contract.getBalance(riderWallet);
        if (BigInt(balance) < BigInt(ride.fare)) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                error: `Your balance is ₹${balance.toString()}, but the ride cost is ₹${ride.fare}.`
            });
        }

        const rideBytes32 = ethers.id(rideId);
        const amountInPaise = Math.round(ride.fare * 100);

        logger.info(`[WALLET] Direct escrow instant pay for ride: ${rideId}. Fare: ₹${ride.fare}`);

        // 2. Lock fare in escrow
        const txLock = await contract.lockFare(rideBytes32, riderWallet, driverWallet, amountInPaise);
        await txLock.wait();

        // 3. Immediately release to driver for instant settlement
        const txRelease = await contract.releaseToDriver(rideBytes32);
        await txRelease.wait();

        // 4. Update ride details
        ride.paymentStatus = 'paid';
        ride.paymentMethod = 'escrow';
        ride.status = 'completed';
        ride.releaseTxHash = txRelease.hash;
        ride.txHash = txLock.hash;
        await ride.save();

        logger.info(`[WALLET] ✅ Instant pay success for ride: ${rideId}. LockTx: ${txLock.hash}, ReleaseTx: ${txRelease.hash}`);

        res.json({
            message: 'Payment settled instantly using wallet escrow',
            lockTxHash: txLock.hash,
            releaseTxHash: txRelease.hash,
            ride
        });

    } catch (err: any) {
        logger.error(`[WALLET] Instant pay failed for ride ${rideId}: ${err.message}`);
        res.status(500).json({ message: 'Instant wallet payment failed', error: err.message });
    }
};
