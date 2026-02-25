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

export default app;
