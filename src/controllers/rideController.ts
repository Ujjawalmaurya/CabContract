import { Request, Response } from 'express';
import { RideModel as Ride } from '../models/Ride';
import { UserModel as User } from '../models/User';
import { contract } from '../config';

export const createRide = async (req: any, res: Response) => {
    const { pickup, drop, distanceKm, fare } = req.body;

    // Validation
    if (!pickup || !drop) {
        return res.status(400).json({ message: 'Pickup and drop locations are required' });
    }
    if (!distanceKm || distanceKm <= 0) {
        return res.status(400).json({ message: 'Distance must be greater than 0' });
    }
    if (!fare || fare <= 0) {
        return res.status(400).json({ message: 'Fare must be greater than 0' });
    }

    try {
        const newRide = new Ride({
            id: Date.now().toString(),
            riderId: req.user.id,
            pickup,
            drop,
            distanceKm,
            fare,
            status: 'pending'
        });

        await newRide.save();
        console.log(`[RIDE] Created: ${newRide.id} by ${req.user.email} | ${pickup} → ${drop} | ₹${fare}`);
        res.status(201).json(newRide);
    } catch (err: any) {
        console.error('[RIDE] Creation error:', err.message);
        res.status(500).json({ message: 'Failed to create ride', error: err.message });
    }
};

export const acceptRide = async (req: any, res: Response) => {
    const { rideId } = req.params;

    try {
        const ride = await Ride.findOne({ id: rideId });

        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (ride.status !== 'pending') return res.status(400).json({ message: 'Ride already accepted or finished' });

        ride.driverId = req.user.id;
        ride.status = 'accepted';
        await ride.save();

        console.log(`[RIDE] Accepted: ${rideId} by driver ${req.user.email}`);
        res.json(ride);
    } catch (err: any) {
        console.error('[RIDE] Acceptance error:', err.message);
        res.status(500).json({ message: 'Failed to accept ride', error: err.message });
    }
};

export const startRide = async (req: any, res: Response) => {
    const { rideId } = req.params;

    try {
        const ride = await Ride.findOne({ id: rideId });

        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (ride.status !== 'accepted') return res.status(400).json({ message: 'Ride must be accepted first' });
        if (ride.riderId !== req.user.id) return res.status(403).json({ message: 'Only the rider can start the ride' });

        const riderWallet = req.user.walletAddress.toLowerCase();
        const riderBalance = await contract.getBalance(riderWallet);
        console.log(`[RIDE] Balance check for ${req.user.email} (${riderWallet}): ₹${riderBalance} (Need ₹${ride.fare})`);

        if (BigInt(riderBalance) < BigInt(ride.fare)) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                error: `Your balance is ₹${riderBalance}, but the ride costs ₹${ride.fare}. Please add money to your wallet before starting.`
            });
        }

        const driver = await User.findById(ride.driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        const driverWallet = driver.walletAddress.toLowerCase();

        const contractRideId = parseInt(ride.id.slice(-6));
        console.log(`[RIDE] Reserving funds: ${riderWallet} -> ${driverWallet} (Amount: ₹${ride.fare})`);
        const tx = await contract.reserveForRide(contractRideId, riderWallet, driverWallet, BigInt(ride.fare));
        await tx.wait();

        ride.status = 'started';
        ride.txHash = tx.hash;
        ride.reserveTxHash = tx.hash;
        await ride.save();

        console.log(`[RIDE] Started: ${rideId} | Escrow locked ₹${ride.fare} | txHash: ${tx.hash}`);
        res.json({ message: 'Funds reserved', txHash: tx.hash, ride });
    } catch (err: any) {
        console.error(`[RIDE] Start failed for ${rideId}:`, err.message);
        const errorDetail = err.reason || err.data?.message || err.message;
        res.status(500).json({ message: 'Failed to reserve funds', error: errorDetail });
    }
};

export const endRide = async (req: any, res: Response) => {
    const { rideId } = req.params;

    try {
        const ride = await Ride.findOne({ id: rideId });

        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (ride.status !== 'started') return res.status(400).json({ message: 'Ride has not started' });

        const contractRideId = parseInt(ride.id.slice(-6));
        const tx = await contract.releaseToDriver(contractRideId);
        await tx.wait();

        ride.status = 'completed';
        ride.releaseTxHash = tx.hash;
        await ride.save();

        console.log(`[RIDE] Completed: ${rideId} | Funds released to driver | txHash: ${tx.hash}`);
        res.json({ message: 'Funds released to driver', txHash: tx.hash, ride });
    } catch (err: any) {
        console.error(`[RIDE] End failed for ${rideId}:`, err.message);
        const errorDetail = err.reason || err.data?.message || err.message;
        res.status(500).json({ message: 'Failed to release funds', error: errorDetail });
    }
};

export const getMyRides = async (req: any, res: Response) => {
    try {
        const userRides = await Ride.find({
            $or: [{ riderId: req.user.id }, { driverId: req.user.id }]
        });
        res.json(userRides);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch rides', error: err.message });
    }
};

export const getAvailableRides = async (req: any, res: Response) => {
    try {
        const available = await Ride.find({ status: 'pending' });
        console.log(`[RIDE] Available rides requested by ${req.user.email}: ${available.length} found`);
        res.json(available);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch available rides', error: err.message });
    }
};

export const getRideDetails = async (req: Request, res: Response) => {
    const { rideId } = req.params;
    try {
        const ride = await Ride.findOne({ id: rideId });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        res.json(ride);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch ride details', error: err.message });
    }
};
