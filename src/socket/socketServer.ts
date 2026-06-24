import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { RideModel } from '../models/Ride';
import { SOCKET_EVENTS } from './events';

let ioInstance: Server | null = null;

export function getIo(): Server | null {
    return ioInstance;
}

export function initSocketServer(server: http.Server): Server {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    ioInstance = io;

    // Socket auth middleware
    io.use(async (socket: Socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication token required'));
        }

        try {
            // Try JWT verification
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            
            if (decoded.role === 'driver') {
                const driver = await UserModel.findById(decoded.id);
                if (!driver) {
                    return next(new Error('Driver not found'));
                }
                socket.data = {
                    userId: decoded.id,
                    role: 'driver',
                    email: decoded.email
                };
                return next();
            }

            if (decoded.role === 'hospital') {
                socket.data = {
                    userId: decoded.id,
                    role: 'hospital',
                    email: decoded.email
                };
                return next();
            }

            // User / Rider check
            socket.data = {
                userId: decoded.id,
                role: decoded.role || 'rider',
                email: decoded.email
            };
            return next();

        } catch (jwtErr) {
            // If JWT verification fails, try validating as familyShareToken
            try {
                const ride = await RideModel.findOne({ familyShareToken: token });
                if (ride) {
                    socket.data = {
                        rideId: ride.id,
                        role: 'family'
                    };
                    return next();
                }
            } catch (dbErr) {
                console.error('[SOCKET AUTH] DB search error for familyShareToken:', dbErr);
            }
            
            return next(new Error('Authentication failed'));
        }
    });

    io.on('connection', async (socket: Socket) => {
        const role = socket.data.role;
        console.log(`[SOCKET] Connected: ${socket.id} | Role: ${role}`);

        if (role === 'driver') {
            const driverId = socket.data.userId;
            socket.join(`driver:${driverId}`);
            console.log(`[SOCKET] Driver ${driverId} joined room driver:${driverId}`);

            // Mark driver available on connection
            try {
                await UserModel.findByIdAndUpdate(driverId, { isAvailable: true });
                console.log(`[SOCKET] Driver ${driverId} marked available`);
            } catch (err: any) {
                console.error(`[SOCKET] Error marking driver ${driverId} available:`, err.message);
            }
        } else if (role === 'hospital') {
            const hospitalId = socket.data.userId;
            socket.join(`hospital:${hospitalId}`);
            console.log(`[SOCKET] Hospital ${hospitalId} joined room hospital:${hospitalId}`);
        } else if (role === 'family') {
            const rideId = socket.data.rideId;
            socket.join(`ride:${rideId}`);
            console.log(`[SOCKET] Family joined room ride:${rideId}`);
        }

        // Allow any authenticated user (e.g. rider/driver/family) to join a specific ride room
        socket.on('ride:join', (payload: { rideId: string }) => {
            const { rideId } = payload;
            if (rideId) {
                socket.join(`ride:${rideId}`);
                console.log(`[SOCKET] Socket ${socket.id} joined room ride:${rideId}`);
            }
        });

        // Listen for driver location updates
        socket.on(SOCKET_EVENTS.DRIVER_LOCATION, async (payload: {
            driverId: string;
            rideId: string;
            lat: number;
            lng: number;
            heading?: number;
            speed?: number;
        }) => {
            const { driverId, rideId, lat, lng, heading, speed } = payload;
            
            // Broadcast location:update to ride room
            io.to(`ride:${rideId}`).emit(SOCKET_EVENTS.LOCATION_UPDATE, {
                driverId,
                lat,
                lng,
                heading: heading ?? 0.0,
                speed: speed ?? 0.0,
                timestamp: new Date().toISOString()
            });

            // Update driver's location in the database
            try {
                await UserModel.findByIdAndUpdate(driverId, {
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    }
                });
            } catch (err: any) {
                console.error(`[SOCKET] Failed to update driver ${driverId} location in DB:`, err.message);
            }
        });

        // Listen for driver status updates
        socket.on(SOCKET_EVENTS.DRIVER_STATUS, async (payload: {
            driverId: string;
            rideId: string;
            status: 'enroute' | 'arrived' | 'transporting' | 'completed';
        }) => {
            const { driverId, rideId, status } = payload;
            
            // Broadcast status:update to ride room
            io.to(`ride:${rideId}`).emit(SOCKET_EVENTS.STATUS_UPDATE, {
                driverId,
                status,
                timestamp: new Date().toISOString()
            });

            // Update Ride status in the database
            try {
                // Map socket status to database status if needed, or update status directly
                const dbStatus = status === 'completed' ? 'completed' : 'started';
                await RideModel.findOneAndUpdate(
                    { id: rideId },
                    { status: dbStatus }
                );
                console.log(`[SOCKET] Ride ${rideId} status updated in DB to ${dbStatus} (Socket status: ${status})`);
            } catch (err: any) {
                console.error(`[SOCKET] Failed to update ride ${rideId} status in DB:`, err.message);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Disconnected: ${socket.id}`);

            if (socket.data.role === 'driver') {
                const driverId = socket.data.userId;
                try {
                    // Mark driver offline
                    await UserModel.findByIdAndUpdate(driverId, { isAvailable: false });
                    console.log(`[SOCKET] Driver ${driverId} marked unavailable`);

                    // Find if there is an active ride this driver was doing
                    const activeRide = await RideModel.findOne({
                        driverId: driverId,
                        status: { $in: ['pending', 'accepted', 'started'] }
                    });

                    if (activeRide) {
                        io.to(`ride:${activeRide.id}`).emit(SOCKET_EVENTS.DRIVER_OFFLINE, {
                            driverId,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`[SOCKET] Broadcasted driver:offline for ride ${activeRide.id}`);
                    }
                } catch (err: any) {
                    console.error(`[SOCKET] Disconnect cleanup failed for driver ${driverId}:`, err.message);
                }
            }
        });
    });

    return io;
}
