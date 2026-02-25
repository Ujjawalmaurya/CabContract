import app from './app';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('\n========================================');
    console.log('  P2P Cab Backend');
    console.log('========================================');
    console.log(`  Local:    http://localhost:${PORT}`);

    // Print all network interface IPs
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`  Network:  http://${net.address}:${PORT}  (${name})`);
            }
        }
    }

    console.log(`\n  API Base:  http://<YOUR_IP>:${PORT}/api`);
    console.log('  ↑ Put this in cab/.env as API_URL');
    console.log('========================================\n');
});
