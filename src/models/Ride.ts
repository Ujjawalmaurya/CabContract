import { Schema, model, Document } from 'mongoose';

export interface IRide extends Document {
    id: string;
    riderId: string;
    driverId?: string;
    pickup: string; // "lat,lng" format or location name
    drop: string;   // "lat,lng" format or location name
    distanceKm: number;
    fare: number; // in INR
    status: 'pending' | 'accepted' | 'started' | 'completed';
    txHash?: string;
    reserveTxHash?: string;
    releaseTxHash?: string;
    
    // AmbulanceChain modifications
    ambulanceType: 'basic' | 'advanced' | 'icu';
    patientInfo: {
        name: string;
        condition: string;
        bloodGroup: string;
        allergies: string;
    };
    coverageType: 'cash' | 'insurance' | 'government';
    paymentStatus: 'pending' | 'paid' | 'refunded' | 'insurance' | 'waived';
    paymentMethod: 'escrow' | 'upi' | 'insurance' | 'government';
    familyShareToken: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    fareBreakdown: {
        baseFare: number;
        distanceCharge: number;
        ambulanceTypeSurcharge: number;
        citySurcharge: number;
        total: number;
    };
    cityId?: Schema.Types.ObjectId;
    hospitalId?: Schema.Types.ObjectId;
    acknowledgedByHospital: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const rideSchema = new Schema<IRide>({
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
    releaseTxHash: { type: String },
    
    // Ambulance fields
    ambulanceType: { 
        type: String, 
        enum: ['basic', 'advanced', 'icu'], 
        default: 'basic' 
    },
    patientInfo: {
        name: { type: String, default: 'Anonymous' },
        condition: { type: String, default: 'General' },
        bloodGroup: { type: String, default: 'Unknown' },
        allergies: { type: String, default: 'None' }
    },
    coverageType: { 
        type: String, 
        enum: ['cash', 'insurance', 'government'], 
        default: 'cash' 
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'insurance', 'waived'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['escrow', 'upi', 'insurance', 'government'],
        default: 'upi'
    },
    familyShareToken: { type: String, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    fareBreakdown: {
        baseFare: { type: Number, default: 200 },
        distanceCharge: { type: Number, default: 0 },
        ambulanceTypeSurcharge: { type: Number, default: 0 },
        citySurcharge: { type: Number, default: 0 },
        total: { type: Number, default: 200 }
    },
    cityId: { type: Schema.Types.ObjectId, ref: 'City' },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    acknowledgedByHospital: { type: Boolean, default: false }
}, { timestamps: true });

export const RideModel = model<IRide>('Ride', rideSchema);
export default RideModel;
