import { Request, Response } from 'express';
import { Ride } from '../types';
import { contract } from '../config';

// In-memory ride store
export const rides: Ride[] = [];

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

    const newRide: Ride = {
        id: Date.now().toString(),
        riderId: req.user.id,
        pickup,
        drop,
        distanceKm,
        fare,
        status: 'pending'
    };

    rides.push(newRide);
    console.log(`[RIDE] Created: ${newRide.id} by ${req.user.email} | ${pickup} → ${drop} | ₹${fare}`);
    res.status(201).json(newRide);
};

export const acceptRide = async (req: any, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'pending') return res.status(400).json({ message: 'Ride already accepted or finished' });

    ride.driverId = req.user.id;
    ride.status = 'accepted';
    console.log(`[RIDE] Accepted: ${rideId} by driver ${req.user.email}`);
    res.json(ride);
};

export const startRide = async (req: any, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'accepted') return res.status(400).json({ message: 'Ride must be accepted first' });
    if (ride.riderId !== req.user.id) return res.status(403).json({ message: 'Only the rider can start the ride' });

    try {
        const contractRideId = parseInt(ride.id.slice(-6));
        const driverWallet = process.env.DRIVER_WALLET as string;

        const tx = await contract.reserveForRide(contractRideId, driverWallet, BigInt(ride.fare));
        await tx.wait();

        ride.status = 'started';
        ride.txHash = tx.hash;
        ride.reserveTxHash = tx.hash;

        console.log(`[RIDE] Started: ${rideId} | Escrow locked ₹${ride.fare} | txHash: ${tx.hash}`);
        res.json({ message: 'Funds reserved', txHash: tx.hash, ride });
    } catch (err: any) {
        console.error(`[RIDE] Start failed for ${rideId}:`, err.message);
        res.status(500).json({ message: 'Failed to reserve funds', error: err.message });
    }
};

export const endRide = async (req: any, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'started') return res.status(400).json({ message: 'Ride has not started' });

    try {
        const contractRideId = parseInt(ride.id.slice(-6));
        const tx = await contract.releaseToDriver(contractRideId);
        await tx.wait();

        ride.status = 'completed';
        ride.releaseTxHash = tx.hash;

        console.log(`[RIDE] Completed: ${rideId} | Funds released to driver | txHash: ${tx.hash}`);
        res.json({ message: 'Funds released to driver', txHash: tx.hash, ride });
    } catch (err: any) {
        console.error(`[RIDE] End failed for ${rideId}:`, err.message);
        res.status(500).json({ message: 'Failed to release funds', error: err.message });
    }
};

export const getMyRides = async (req: any, res: Response) => {
    const userRides = rides.filter(r => r.riderId === req.user.id || r.driverId === req.user.id);
    res.json(userRides);
};

export const getAvailableRides = async (req: any, res: Response) => {
    const available = rides.filter(r => r.status === 'pending');
    console.log(`[RIDE] Available rides requested by ${req.user.email}: ${available.length} found`);
    res.json(available);
};

export const getRideDetails = async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
};
