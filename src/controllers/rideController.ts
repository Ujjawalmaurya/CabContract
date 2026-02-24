import { Request, Response } from 'express';
import { Ride } from '../types';
import { contract } from '../config';

// In-memory ride store
export const rides: Ride[] = [];

export const createRide = async (req: any, res: Response) => {
    const { pickup, drop, distanceKm, fare } = req.body;

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
    res.status(201).json(newRide);
};

export const acceptRide = async (req: any, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'pending') return res.status(400).json({ message: 'Ride already accepted or finished' });

    ride.driverId = req.user.id;
    ride.status = 'accepted';
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
        const drivelWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

        const tx = await contract.reserveForRide(contractRideId, drivelWallet, BigInt(ride.fare));
        await tx.wait();

        ride.status = 'started';
        ride.txHash = tx.hash;

        res.json({ message: 'Funds reserved', txHash: tx.hash, ride });
    } catch (err: any) {
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
        res.json({ message: 'Funds released to driver', txHash: tx.hash, ride });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to release funds', error: err.message });
    }
};

export const getMyRides = async (req: any, res: Response) => {
    const userRides = rides.filter(r => r.riderId === req.user.id || r.driverId === req.user.id);
    res.json(userRides);
};

export const getRideDetails = async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
};
