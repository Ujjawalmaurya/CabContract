import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/p2p_cab';

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[DB] ✅ MongoDB connected');
    } catch (err: any) {
        console.error('[DB] ✗ MongoDB connection failed:', err.message);
        process.exit(1);
    }
};
