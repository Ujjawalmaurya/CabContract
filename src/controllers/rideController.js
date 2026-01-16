import Ride from '../models/Ride.js';
import User from '../models/User.js';
import blockchainService from '../services/blockchainService.js';

export const requestRide = async (req, res) => {
    try {
        const { pickupLocation, dropLocation, fare } = req.body;
        const riderId = req.user.userId;

        // Get rider details
        const rider = await User.findById(riderId);
        if (!rider) {
            return res.status(404).json({ error: 'Rider not found' });
        }

        // Request ride on blockchain
        const { rideId, txHash } = await blockchainService.requestRide(
            rider.privateKey,
            fare
        );

        // Save ride in database
        const ride = new Ride({
            rideId,
            riderId,
            pickupLocation,
            dropLocation,
            fare,
            status: 'REQUESTED',
            blockchainTxHash: txHash
        });

        await ride.save();

        res.status(201).json({
            message: 'Ride requested successfully',
            ride: {
                id: ride._id,
                rideId: ride.rideId,
                fare: ride.fare,
                status: ride.status,
                txHash
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAvailableRides = async (req, res) => {
    try {
        const rides = await Ride.find({ status: 'REQUESTED' })
            .populate('riderId', 'name phone')
            .sort({ createdAt: -1 });

        res.json({ rides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const acceptRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const driverId = req.user.userId;

        // Get driver and ride details
        const driver = await User.findById(driverId);
        const ride = await Ride.findOne({ rideId: parseInt(rideId) });

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'REQUESTED') {
            return res.status(400).json({ error: 'Ride not available' });
        }

        // Accept ride on blockchain
        const txHash = await blockchainService.acceptRide(
            driver.privateKey,
            parseInt(rideId)
        );

        // Update ride in database
        ride.driverId = driverId;
        ride.status = 'ACCEPTED';
        ride.blockchainTxHash = txHash;
        await ride.save();

        res.json({
            message: 'Ride accepted successfully',
            ride: {
                id: ride._id,
                rideId: ride.rideId,
                status: ride.status,
                txHash
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const startRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const driverId = req.user.userId;

        const driver = await User.findById(driverId);
        const ride = await Ride.findOne({ rideId: parseInt(rideId) });

        if (!ride || ride.driverId.toString() !== driverId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Start ride on blockchain
        const txHash = await blockchainService.startRide(
            driver.privateKey,
            parseInt(rideId)
        );

        ride.status = 'STARTED';
        ride.blockchainTxHash = txHash;
        await ride.save();

        res.json({
            message: 'Ride started successfully',
            txHash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const completeRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const driverId = req.user.userId;

        const driver = await User.findById(driverId);
        const ride = await Ride.findOne({ rideId: parseInt(rideId) });

        if (!ride || ride.driverId.toString() !== driverId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Complete ride on blockchain
        const txHash = await blockchainService.completeRide(
            driver.privateKey,
            parseInt(rideId)
        );

        ride.status = 'COMPLETED';
        ride.blockchainTxHash = txHash;
        await ride.save();

        res.json({
            message: 'Ride completed successfully',
            txHash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
