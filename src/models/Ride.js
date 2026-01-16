import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
    rideId: {
        type: Number,
        required: true,
        unique: true
    },
    riderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pickupLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    dropLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    fare: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['REQUESTED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED'],
        default: 'REQUESTED'
    },
    blockchainTxHash: String,
    distance: Number,
    duration: Number
}, {
    timestamps: true
});

export default mongoose.model('Ride', rideSchema);
