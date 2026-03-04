import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['rider', 'driver'], required: true },
    walletAddress: { type: String, required: true }
}, { timestamps: true });

export const UserModel = model('User', userSchema);
