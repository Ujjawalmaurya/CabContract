import { Schema, model, Document } from 'mongoose';

export interface IHospital extends Document {
    name: string;
    address: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };
    webhookUrl: string;
    contactNumber: string;
    email: string;
    registeredAt: Date;
    isActive: boolean;
}

const hospitalSchema = new Schema<IHospital>({
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true // [longitude, latitude]
        }
    },
    webhookUrl: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    registeredAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Geospatial index for nearby matches
hospitalSchema.index({ location: '2dsphere' });

export const HospitalModel = model<IHospital>('Hospital', hospitalSchema);
export default HospitalModel;
