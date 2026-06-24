import { Schema, model, Document } from 'mongoose';

export interface ICity extends Document {
    name: string;
    state: string;
    isActive: boolean;
    geofence: {
        type: 'Polygon';
        coordinates: number[][][]; // [[[lng, lat], ...]]
    };
    baseFareOverride?: number;
    surchargeMultiplier: number;
    contactNumber: string;
    createdAt: Date;
    updatedAt: Date;
}

const citySchema = new Schema<ICity>({
    name: { type: String, required: true, unique: true },
    state: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    geofence: {
        type: {
            type: String,
            enum: ['Polygon'],
            required: true
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of arrays of numbers
            required: true
        }
    },
    baseFareOverride: { type: Number },
    surchargeMultiplier: { type: Number, default: 1.0 },
    contactNumber: { type: String, required: true }
}, { timestamps: true });

// Index for geofence query using 2dsphere
citySchema.index({ geofence: '2dsphere' });

export const CityModel = model<ICity>('City', citySchema);
