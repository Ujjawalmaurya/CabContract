import { DriverVerificationModel } from '../models/DriverVerification';
import { UserModel } from '../models/User';
import { getIo } from '../socket/socketServer';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

export async function submitVerification(
    driverId: string,
    docs: { aadhaarUrl?: string; vehicleRegUrl?: string; ambulancePermitUrl?: string }
): Promise<void> {
    try {
        logger.info(`[VERIFICATION_SERVICE] Submitting verification for driver: ${driverId}`);
        
        let verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification) {
            verification = new DriverVerificationModel({ driverId });
        }

        if (docs.aadhaarUrl) verification.aadhaarUrl = docs.aadhaarUrl;
        if (docs.vehicleRegUrl) verification.vehicleRegUrl = docs.vehicleRegUrl;
        if (docs.ambulancePermitUrl) verification.ambulancePermitUrl = docs.ambulancePermitUrl;
        
        verification.status = 'pending';
        verification.submittedAt = new Date();
        await verification.save();

        await UserModel.findByIdAndUpdate(driverId, { verificationStatus: 'pending' });

        // Notify admins via socket
        const io = getIo();
        if (io) {
            io.emit('admin:verification_pending', {
                driverId,
                submittedAt: verification.submittedAt
            });
            logger.info(`[VERIFICATION_SERVICE] Broadcasted admin:verification_pending event for driver ${driverId}`);
        }

    } catch (err: any) {
        logger.error(`[VERIFICATION_SERVICE] Submission failed for driver ${driverId}: ${err.message}`);
        throw err;
    }
}

export async function approveDriver(driverId: string, reviewerId: string): Promise<void> {
    try {
        logger.info(`[VERIFICATION_SERVICE] Approving driver ${driverId} by reviewer ${reviewerId}`);

        const verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification) {
            throw new Error('Verification document not found for this driver');
        }

        // If auto-approved by DigiLocker, check conditions
        if (reviewerId === 'SYSTEM_DIGILOCKER') {
            if (!verification.aadhaarVerified || !verification.vehicleVerified) {
                logger.warn(`[VERIFICATION_SERVICE] Auto-approval skipped: AadhaarVerified=${verification.aadhaarVerified}, VehicleVerified=${verification.vehicleVerified}`);
                return;
            }
        }

        verification.status = 'approved';
        verification.reviewedAt = new Date();
        if (reviewerId !== 'SYSTEM_DIGILOCKER') {
            verification.reviewedBy = new Types.ObjectId(reviewerId);
        }
        await verification.save();

        // Update driver user status
        await UserModel.findByIdAndUpdate(driverId, {
            isVerified: true,
            verificationStatus: 'approved'
        });

        // Notify driver via socket
        const io = getIo();
        if (io) {
            io.to(`driver:${driverId}`).emit('driver:verified', {
                verified: true,
                timestamp: new Date().toISOString()
            });
            logger.info(`[VERIFICATION_SERVICE] Socket notified driver:${driverId} of approval`);
        }

    } catch (err: any) {
        logger.error(`[VERIFICATION_SERVICE] Approval failed for driver ${driverId}: ${err.message}`);
        throw err;
    }
}

export async function rejectDriver(driverId: string, reviewerId: string, reason: string): Promise<void> {
    try {
        logger.info(`[VERIFICATION_SERVICE] Rejecting driver ${driverId} by reviewer ${reviewerId}. Reason: ${reason}`);

        const verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification) {
            throw new Error('Verification document not found for this driver');
        }

        verification.status = 'rejected';
        verification.rejectionReason = reason;
        verification.reviewedAt = new Date();
        verification.reviewedBy = new Types.ObjectId(reviewerId);
        await verification.save();

        // Update driver user status
        await UserModel.findByIdAndUpdate(driverId, {
            isVerified: false,
            verificationStatus: 'rejected'
        });

        // Notify driver via socket
        const io = getIo();
        if (io) {
            io.to(`driver:${driverId}`).emit('driver:rejected', {
                verified: false,
                reason,
                timestamp: new Date().toISOString()
            });
            logger.info(`[VERIFICATION_SERVICE] Socket notified driver:${driverId} of rejection`);
        }

    } catch (err: any) {
        logger.error(`[VERIFICATION_SERVICE] Rejection failed for driver ${driverId}: ${err.message}`);
        throw err;
    }
}
