import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import rideRoutes from './routes/rides';
import sosRoutes from './routes/sos';
import hospitalRoutes from './routes/hospital';
import verificationRoutes from './routes/verification';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payment';
import { handleWebhook } from './controllers/paymentController';
import { serveFamilyShareView } from './controllers/sosController';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

const app = express();

app.use(cors());
app.use(requestLogger);
app.use(generalLimiter);

// 1. Raw body webhook route registered BEFORE express.json()
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

// 2. Static Views
app.get('/share/:familyShareToken', serveFamilyShareView);

app.get('/hospital', (req, res) => {
    const filePath = path.join(__dirname, 'views/hospital-dashboard.html');
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Dispatch console template not found');
    }
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('__GMAPS_KEY__', env.GOOGLE_MAPS_API_KEY);
    res.send(html);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        contract: 'connected' // Config loads contract dynamically
    });
});

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/driver/verify', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes); // handles create-order and verify

// Catch-all 404 logger
app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.url}`,
        tip: 'Check your API endpoints prefix and request method'
    });
});

// 4. Global Error Handler (must be the last middleware)
app.use(errorHandler);

export default app;
