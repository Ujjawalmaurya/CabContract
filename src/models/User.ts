import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    role: 'rider' | 'user' | 'driver' | 'hospital' | 'admin';
    walletAddress: string;
    isAvailable: boolean;
    isVerified: boolean;
    verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
    vehicleType?: string; // e.g. 'ambulance'
    location?: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['rider', 'user', 'driver', 'hospital', 'admin'], 
        required: true 
    },
    walletAddress: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    vehicleType: { type: String, default: 'ambulance' },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0] // [lng, lat]
        }
    }
}, { timestamps: true });

// Geospatial index for nearby matches
userSchema.index({ location: '2dsphere' });

export const UserModel = model<IUser>('User', userSchema);
export default UserModel;
