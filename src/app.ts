import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import rideRoutes from './routes/rides';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rides', rideRoutes);

app.get('/', (req, res) => {
    res.send('P2P Cab Backend is running');
});

export default app;
