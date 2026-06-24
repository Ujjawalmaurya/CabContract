import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { HospitalModel } from '../models/Hospital';
import { UserModel } from '../models/User';
import { RideModel } from '../models/Ride';
import { contract } from '../config';
import { getIo } from '../socket/socketServer';
import { logger } from '../utils/logger';

export const registerHospital = async (req: Request, res: Response) => {
    const { name, address, location, webhookUrl, contactNumber, email, password } = req.body;

    if (!name || !address || !location || !webhookUrl || !contactNumber || !email || !password) {
        return res.status(400).json({ message: 'All fields are required: name, address, location ([lng, lat]), webhookUrl, contactNumber, email, password' });
    }

    try {
        const existingHospital = await HospitalModel.findOne({ email });
        if (existingHospital) {
            return res.status(400).json({ message: 'Hospital already registered with this email' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        // Generate a dummy wallet address for the hospital user
        const walletAddress = '0x' + crypto.randomBytes(20).toString('hex');

        // 1. Create Hospital document
        const hospital = new HospitalModel({
            name,
            address,
            location: {
                type: 'Point',
                coordinates: location // [longitude, latitude]
            },
            webhookUrl,
            contactNumber,
            email
        });

        await hospital.save();

        // 2. Create User document with 'hospital' role
        const user = new UserModel({
            email,
            passwordHash,
            role: 'hospital',
            walletAddress
        });

        await user.save();

        logger.info(`[HOSPITAL] Registered: ${name} (${email})`);
        res.status(201).json({
            message: 'Hospital registered successfully',
            hospital,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (err: any) {
        logger.error(`[HOSPITAL] Registration failed: ${err.message}`);
        res.status(500).json({ message: 'Hospital registration failed', error: err.message });
    }
};

export const getIncomingPatients = async (req: any, res: Response) => {
    try {
        const hospital = await HospitalModel.findOne({ email: req.user.email });
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital entity not found for logged in user' });
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Fetch today's rides for this hospital
        const incoming = await RideModel.find({
            hospitalId: hospital._id,
            createdAt: { $gte: startOfDay }
        } as any);

        res.json(incoming);
    } catch (err: any) {
        logger.error(`[HOSPITAL] Failed to fetch incoming patients: ${err.message}`);
        res.status(500).json({ message: 'Failed to fetch incoming patients', error: err.message });
    }
};

export const acknowledgePatient = async (req: Request, res: Response) => {
    const { rideId } = req.params;

    try {
        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.acknowledgedByHospital = true;
        await ride.save();

        logger.info(`[HOSPITAL] Patient acknowledged for ride: ${rideId}`);
        res.json({ message: 'Patient acknowledged successfully', ride });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to acknowledge patient', error: err.message });
    }
};

export const markCovered = async (req: any, res: Response) => {
    const { rideId } = req.params;
    const { coverageType } = req.body; // 'insurance' | 'government'

    if (!coverageType || !['insurance', 'government'].includes(coverageType)) {
        return res.status(400).json({ message: 'Valid coverageType ("insurance" or "government") is required' });
    }

    try {
        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.coverageType = coverageType;
        ride.paymentStatus = 'insurance';
        await ride.save();

        // Trigger smart contract release / marking
        const rideBytes32 = ethers.id(rideId);
        logger.info(`[HOSPITAL] Marking insurance covered on-chain for ride ${rideId}`);
        const tx = await contract.markInsuranceCovered(rideBytes32);
        await tx.wait();

        // Emit socket notification to ride room
        const io = getIo();
        if (io) {
            io.to(`ride:${rideId}`).emit('payment:covered', {
                rideId,
                coverageType,
                txHash: tx.hash
            });
            logger.info(`[HOSPITAL] Dispatched payment:covered socket event for ride ${rideId}`);
        }

        res.json({ message: 'Ride marked as covered successfully', txHash: tx.hash, ride });

    } catch (err: any) {
        logger.error(`[HOSPITAL] Failed to mark ride ${rideId} covered: ${err.message}`);
        res.status(500).json({ message: 'Failed to mark ride covered', error: err.message });
    }
};
