import { Schema, model, Document } from 'mongoose';

export interface IWaitlist extends Document {
    lat: number;
    lng: number;
    contact: string;
    city: string;
    requestedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    contact: { type: String, required: true },
    city: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const WaitlistModel = model<IWaitlist>('Waitlist', waitlistSchema);
export default WaitlistModel;
