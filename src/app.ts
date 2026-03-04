import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import rideRoutes from './routes/rides';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.send('P2P Cab Backend is running');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rides', rideRoutes);

// Catch-all 404 logger
app.use((req, res) => {
    console.warn(`[404] ✗ ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.url}`,
        tip: 'Check if you are missing the /api prefix or have a trailing slash issue'
    });
});

export default app;
