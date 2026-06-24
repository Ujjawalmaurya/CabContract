import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { env } from '../config/env';
import { RideModel } from '../models/Ride';
import { UserModel } from '../models/User';
import * as paymentService from '../services/paymentService';
import { contract } from '../config';
import { getIo } from '../socket/socketServer';
import { logger } from '../utils/logger';

export const createOrder = async (req: any, res: Response) => {
    const { rideId } = req.body;

    if (!rideId) {
        return res.status(400).json({ message: 'Ride ID is required' });
    }

    try {
        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const order = await paymentService.createOrder(ride.fare, rideId);
        
        // Save order ID to Ride
        ride.razorpayOrderId = order.id;
        await ride.save();

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: env.RAZORPAY_KEY_ID
        });
    } catch (err: any) {
        logger.error(`[PAYMENT_CONTROLLER] Order creation failed: ${err.message}`);
        res.status(500).json({ message: 'Failed to create payment order', error: err.message });
    }
};

export const verifyPayment = async (req: any, res: Response) => {
    const { rideId, orderId, paymentId, signature } = req.body;

    if (!rideId || !orderId || !paymentId || !signature) {
        return res.status(400).json({ message: 'Missing payment verification details: rideId, orderId, paymentId, signature' });
    }

    try {
        // Verify Razorpay HMAC
        const isValid = paymentService.verifyPayment(orderId, paymentId, signature);
        if (!isValid) {
            logger.warn(`[PAYMENT_CONTROLLER] HMAC verification failed for ride ${rideId}`);
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        const rider = await UserModel.findById(ride.riderId);
        const driver = await UserModel.findById(ride.driverId);

        if (!rider || !driver) {
            return res.status(404).json({ message: 'Rider or Driver user not found' });
        }

        // Add transaction metadata to ride
        ride.razorpayPaymentId = paymentId;
        ride.paymentStatus = 'paid';
        ride.paymentMethod = 'upi';
        await ride.save();

        // Lock funds on-chain for verification transparency
        logger.info(`[PAYMENT_CONTROLLER] Locking ride fare on-chain for ride ${rideId}`);
        const rideBytes32 = ethers.id(rideId);
        const amountInPaise = Math.round(ride.fare * 100);

        const tx = await contract.lockFare(
            rideBytes32,
            rider.walletAddress,
            driver.walletAddress,
            amountInPaise
        );
        await tx.wait();

        logger.info(`[PAYMENT_CONTROLLER] Escrow locked on-chain: ride ${rideId} (txHash: ${tx.hash})`);
        res.json({ message: 'Payment verified successfully and escrow locked', txHash: tx.hash, ride });

    } catch (err: any) {
        logger.error(`[PAYMENT_CONTROLLER] Verification failed: ${err.message}`);
        res.status(500).json({ message: 'Failed to verify payment', error: err.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
        return res.status(400).send('Webhook signature missing');
    }

    // Acknowledge receipt of webhook immediately to Razorpay (avoiding timeout)
    res.status(200).send('Received');

    // Run verification and processing asynchronously
    (async () => {
        try {
            const secret = env.RAZORPAY_WEBHOOK_SECRET;
            const bodyString = req.body.toString(); // RAW buffer from express.raw()

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(bodyString)
                .digest('hex');

            if (expectedSignature !== signature) {
                logger.error('[PAYMENT_WEBHOOK] Verification failed: signatures mismatch');
                return;
            }

            const payload = JSON.parse(bodyString);
            const event = payload.event;
            logger.info(`[PAYMENT_WEBHOOK] Received event: ${event}`);

            if (event === 'payment.captured') {
                const payment = payload.payload.payment.entity;
                const orderId = payment.order_id;
                const paymentId = payment.id;

                const ride = await RideModel.findOne({ razorpayOrderId: orderId });
                if (ride && ride.paymentStatus !== 'paid') {
                    ride.razorpayPaymentId = paymentId;
                    ride.paymentStatus = 'paid';
                    await ride.save();
                    logger.info(`[PAYMENT_WEBHOOK] Ride ${ride.id} marked PAID asynchronously`);
                }
            } else if (event === 'payment.failed') {
                const payment = payload.payload.payment.entity;
                const orderId = payment.order_id;

                const ride = await RideModel.findOne({ razorpayOrderId: orderId });
                if (ride) {
                    const io = getIo();
                    if (io) {
                        io.to(`ride:${ride.id}`).emit('payment:failed', {
                            rideId: ride.id,
                            message: payment.error_description || 'Payment transaction failed'
                        });
                    }
                    logger.warn(`[PAYMENT_WEBHOOK] Payment failed for ride ${ride.id}`);
                }
            } else if (event === 'refund.processed') {
                const refund = payload.payload.refund.entity;
                const paymentId = refund.payment_id;

                const ride = await RideModel.findOne({ razorpayPaymentId: paymentId });
                if (ride) {
                    ride.paymentStatus = 'refunded';
                    await ride.save();
                    logger.info(`[PAYMENT_WEBHOOK] Ride ${ride.id} marked REFUNDED asynchronously`);
                }
            }

        } catch (err: any) {
            logger.error(`[PAYMENT_WEBHOOK] Error processing webhook asynchronously: ${err.message}`);
        }
    })();
};
