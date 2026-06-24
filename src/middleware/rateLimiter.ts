import rateLimit from 'express-rate-limit';
// @ts-ignore
import MongoStore from 'rate-limit-mongo';
import { env } from '../config/env';

const mongoUri = env.MONGO_URI;

// Helper to create store with expiration
const createMongoStore = (expireTimeMs: number) => {
    return new MongoStore({
        uri: mongoUri,
        collectionName: 'rateLimits',
        expireTimeMs
    });
};

export const generalLimiter = rateLimit({
    store: createMongoStore(60 * 1000), // 1 minute
    windowMs: 60 * 1000,
    max: 100,
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const sosLimiter = rateLimit({
    store: createMongoStore(60 * 1000), // 1 minute
    windowMs: 60 * 1000,
    max: 5,
    message: {
        error: 'SOS_RATE_LIMIT_EXCEEDED',
        message: 'Emergency SOS bookings are rate limited to 5 per minute to prevent abuse.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const authLimiter = rateLimit({
    store: createMongoStore(15 * 60 * 1000), // 15 minutes
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const paymentLimiter = rateLimit({
    store: createMongoStore(60 * 1000), // 1 minute
    windowMs: 60 * 1000,
    max: 20,
    message: {
        error: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        message: 'Too many payment requests. Please wait a minute before retrying.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
