import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { env } from '../config/env';
import * as verificationService from '../services/verificationService';
import * as digilockerService from '../services/digilockerService';
import { DriverVerificationModel } from '../models/DriverVerification';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const fileFormat = file.mimetype.split('/')[1]; // pdf, png, jpeg
        return {
            folder: 'driver_documents',
            allowed_formats: ['jpg', 'png', 'pdf'],
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.fieldname}`
        };
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadDocsMiddleware = upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'vehicleReg', maxCount: 1 },
    { name: 'ambulancePermit', maxCount: 1 }
]);

export const submitVerification = async (req: any, res: Response) => {
    const driverId = req.user.id;
    const files = req.files as any;

    try {
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ message: 'No documents uploaded. Aadhaar, Vehicle Reg, and Permit are required.' });
        }

        const aadhaarUrl = files?.aadhaar?.[0]?.path;
        const vehicleRegUrl = files?.vehicleReg?.[0]?.path;
        const ambulancePermitUrl = files?.ambulancePermit?.[0]?.path;

        await verificationService.submitVerification(driverId, {
            aadhaarUrl,
            vehicleRegUrl,
            ambulancePermitUrl
        });

        res.status(200).json({
            message: 'Documents submitted successfully. Verification status is pending.',
            documents: { aadhaarUrl, vehicleRegUrl, ambulancePermitUrl }
        });
    } catch (err: any) {
        logger.error(`[VERIFICATION_CONTROLLER] Submission failed: ${err.message}`);
        res.status(500).json({ message: 'Failed to submit verification documents', error: err.message });
    }
};

export const getDigiLockerAuth = async (req: any, res: Response) => {
    const driverId = req.user.id;
    try {
        const authUrl = digilockerService.getAuthUrl(driverId);
        res.json({ authUrl });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to generate DigiLocker auth URL', error: err.message });
    }
};

export const handleDigiLockerCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query; // state is driverId

    if (!code || !state) {
        return res.status(400).send('Invalid DigiLocker callback. Code and state are required.');
    }

    const driverId = state.toString();

    try {
        const aadhaarResult = await digilockerService.handleCallback(code.toString(), driverId);
        
        if (aadhaarResult.verified) {
            // Check if there is an RC number to auto-fetch
            const verification = await DriverVerificationModel.findOne({ driverId });
            if (verification && verification.vehicleNumber) {
                await digilockerService.fetchVehicleRC(driverId, verification.vehicleNumber);
            }
        }

        // Redirect to mobile app deep link
        res.redirect('ambulancechain://verified');
    } catch (err: any) {
        logger.error(`[VERIFICATION_CONTROLLER] DigiLocker callback failed: ${err.message}`);
        res.redirect(`ambulancechain://error?message=${encodeURIComponent(err.message)}`);
    }
};

export const fetchVahanRC = async (req: any, res: Response) => {
    const driverId = req.user.id;
    const { vehicleNumber } = req.body;

    if (!vehicleNumber) {
        return res.status(400).json({ message: 'Vehicle registration number is required' });
    }

    try {
        // Store vehicle number first
        let verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification) {
            verification = new DriverVerificationModel({ driverId });
        }
        verification.vehicleNumber = vehicleNumber;
        await verification.save();

        const result = await digilockerService.fetchVehicleRC(driverId, vehicleNumber);
        if (result.verified) {
            res.json({ message: 'Vehicle registration verified successfully via DigiLocker Vahan RC', details: result });
        } else {
            res.status(400).json({ message: 'Vehicle RC verification failed', error: result.message });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch Vehicle RC details', error: err.message });
    }
};

export const getPendingVerifications = async (req: Request, res: Response) => {
    try {
        const pendings = await DriverVerificationModel.find({ status: 'pending' })
            .populate('driverId', 'email walletAddress');
        
        res.json(pendings);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch pending verifications', error: err.message });
    }
};

export const approveDriver = async (req: any, res: Response) => {
    const { driverId } = req.params;
    const adminId = req.user.id;

    try {
        await verificationService.approveDriver(driverId, adminId);
        res.json({ message: 'Driver verification approved successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to approve driver', error: err.message });
    }
};

export const rejectDriver = async (req: any, res: Response) => {
    const { driverId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
    }

    try {
        await verificationService.rejectDriver(driverId, adminId, reason);
        res.json({ message: 'Driver verification rejected successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to reject driver', error: err.message });
    }
};
