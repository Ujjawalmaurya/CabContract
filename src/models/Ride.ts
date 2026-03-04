import { Schema, model } from 'mongoose';

const rideSchema = new Schema({
    id: { type: String, required: true, unique: true },
    riderId: { type: String, required: true },
    driverId: { type: String },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    fare: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'started', 'completed'],
        default: 'pending'
    },
    txHash: { type: String },
    reserveTxHash: { type: String },
    releaseTxHash: { type: String }
}, { timestamps: true });

export const RideModel = model('Ride', rideSchema);
