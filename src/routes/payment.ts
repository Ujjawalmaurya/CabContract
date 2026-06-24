import express, { Router } from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Create Razorpay Order
router.post('/create-order', authMiddleware, paymentLimiter, createOrder);

// Verify payment signature & lock escrow
router.post('/verify', authMiddleware, paymentLimiter, verifyPayment);

// Public webhook endpoint with raw body parser for Razorpay signature check
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
