import { Schema, model, Document, Types } from 'mongoose';

export interface IDriverVerification extends Document {
    driverId: Types.ObjectId;
    aadhaarUrl?: string;
    vehicleRegUrl?: string;
    ambulancePermitUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId;
    
    // DigiLocker specific
    aadhaarVerified: boolean;
    vehicleVerified: boolean;
    digilockerToken?: string; // Should be encrypted at rest in production
    verifiedName?: string;
    aadhaarLast4?: string;
    vehicleNumber?: string;
    vehicleClass?: string;
    permitType?: string;
    digilockerVerifiedAt?: Date;
}

const driverVerificationSchema = new Schema<IDriverVerification>({
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    aadhaarUrl: { type: String },
    vehicleRegUrl: { type: String },
    ambulancePermitUrl: { type: String },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    
    // DigiLocker fields
    aadhaarVerified: { type: Boolean, default: false },
    vehicleVerified: { type: Boolean, default: false },
    digilockerToken: { type: String },
    verifiedName: { type: String },
    aadhaarLast4: { type: String },
    vehicleNumber: { type: String },
    vehicleClass: { type: String },
    permitType: { type: String },
    digilockerVerifiedAt: { type: Date }
}, { timestamps: true });

export const DriverVerificationModel = model<IDriverVerification>('DriverVerification', driverVerificationSchema);
