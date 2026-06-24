import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Normalize environment variables for backward compatibility
if (process.env.MONGODB_URI && !process.env.MONGO_URI) {
    process.env.MONGO_URI = process.env.MONGODB_URI;
}
if (process.env.RPC_URL && !process.env.HARDHAT_RPC_URL) {
    process.env.HARDHAT_RPC_URL = process.env.RPC_URL;
}
if (process.env.OPERATOR_PRIVATE_KEY && !process.env.CONTRACT_OWNER_PRIVATE_KEY) {
    process.env.CONTRACT_OWNER_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(1205),
    BASE_URL: z.string().default('http://localhost:1205'),
    MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/p2p_cab'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    HARDHAT_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
    CONTRACT_OWNER_PRIVATE_KEY: z.string().min(1, 'CONTRACT_OWNER_PRIVATE_KEY/OPERATOR_PRIVATE_KEY is required'),
    CONTRACT_ADDRESS: z.string().min(1, 'CONTRACT_ADDRESS is required'),
    RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
    CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
    DIGILOCKER_CLIENT_ID: z.string().min(1, 'DIGILOCKER_CLIENT_ID is required'),
    DIGILOCKER_CLIENT_SECRET: z.string().min(1, 'DIGILOCKER_CLIENT_SECRET is required'),
    DIGILOCKER_REDIRECT_URI: z.string().min(1, 'DIGILOCKER_REDIRECT_URI is required'),
    GOOGLE_MAPS_API_KEY: z.string().min(1, 'GOOGLE_MAPS_API_KEY is required'),
    FCM_SERVER_KEY: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000)
});

let validatedEnv: z.infer<typeof envSchema>;

try {
    validatedEnv = envSchema.parse(process.env);
} catch (error: any) {
    if (error instanceof z.ZodError) {
        console.error('\n========================================');
        console.error('  ❌ ENVIRONMENT CONFIGURATION ERROR');
        console.error('========================================');
        (error as any).errors.forEach((err: any) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        console.error('========================================\n');
    } else {
        console.error('Failed to parse environment variables:', error);
    }
    process.exit(1);
}

export const env = validatedEnv;
