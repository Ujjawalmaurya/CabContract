import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { contract } from '../config';

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || ''
        });
    }
    return razorpayInstance;
}

export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    notes: any;
    created_at: number;
}

export async function createOrder(amount: number, rideId: string): Promise<RazorpayOrder> {
    const razorpay = getRazorpayInstance();
    // amount in INR is multiplied by 100 to convert to paise
    const amountInPaise = Math.round(amount * 100);

    const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: rideId,
        notes: {
            rideId,
            purpose: 'ambulance_booking'
        }
    };

    const order = await razorpay.orders.create(options);
    return order as RazorpayOrder;
}

export function verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return generatedSignature === signature;
}

export async function refundPayment(paymentId: string, amount: number, rideId: string): Promise<void> {
    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(amount * 100);

    // Call Razorpay Refund API
    await razorpay.payments.refund(paymentId, {
        amount: amountInPaise,
        notes: {
            rideId,
            reason: 'ride_cancelled'
        }
    });

    // On success: trigger contract refund
    const rideBytes32 = ethers.id(rideId);
    const tx = await contract.refund(rideBytes32);
    await tx.wait();
    console.log(`[PAYMENT] Escrow refund transaction complete on-chain for ride ${rideId} (txHash: ${tx.hash})`);
}
