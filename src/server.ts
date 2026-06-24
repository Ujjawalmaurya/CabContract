// Validate environment variables first before loading any config
import { env } from './config/env';
import app from './app';
import http from 'http';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { initSocketServer } from './socket/socketServer';
import { logger } from './utils/logger';

// Connect to MongoDB
connectDB();

const PORT = env.PORT;
const HOST = '0.0.0.0';

const server = http.createServer(app);

// Initialize Socket.io server
initSocketServer(server);

server.listen(PORT, HOST, () => {
    logger.info('========================================');
    logger.info('  🚨 AmbulanceChain Dispatch Server');
    logger.info('========================================');
    logger.info(`  Local:    http://localhost:${PORT}`);
    logger.info(`  API:      http://localhost:${PORT}/api`);
    logger.info(`  Socket:   ws://localhost:${PORT}`);
    logger.info('========================================');
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    logger.info(`[SERVER] Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
        logger.info('[SERVER] HTTP server closed.');

        try {
            // Close DB connection
            await mongoose.connection.close();
            logger.info('[DB] MongoDB connection closed.');
            process.exit(0);
        } catch (err: any) {
            logger.error(`[SERVER] Error during DB close: ${err.message}`);
            process.exit(1);
        }
    });

    // Timeout force shutdown in 10s
    setTimeout(() => {
        logger.error('[SERVER] Force shutdown triggered after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
export default server;
