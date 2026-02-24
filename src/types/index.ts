export interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: 'rider' | 'driver';
    walletAddress: string;
}

export interface Ride {
    id: string;
    riderId: string;
    driverId?: string;
    pickup: string;
    drop: string;
    distanceKm: number;
    fare: number;
    status: 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled';
    txHash?: string;
}
