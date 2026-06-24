import mongoose from 'mongoose';
import { env } from '../config/env';
import { CityModel } from '../models/City';

const cities = [
    {
        name: 'Mumbai',
        state: 'Maharashtra',
        isActive: true,
        geofence: {
            type: 'Polygon',
            coordinates: [[
                [72.775, 18.892],
                [72.998, 18.892],
                [72.998, 19.314],
                [72.775, 19.314],
                [72.775, 18.892] // Close loop
            ]]
        },
        baseFareOverride: 250,
        surchargeMultiplier: 1.2,
        contactNumber: '+912222222222'
    },
    {
        name: 'Delhi',
        state: 'NCR',
        isActive: true,
        geofence: {
            type: 'Polygon',
            coordinates: [[
                [76.842, 28.401],
                [77.348, 28.401],
                [77.348, 28.882],
                [76.842, 28.882],
                [76.842, 28.401]
            ]]
        },
        baseFareOverride: 200,
        surchargeMultiplier: 1.1,
        contactNumber: '+911111111111'
    },
    {
        name: 'Bengaluru',
        state: 'Karnataka',
        isActive: true,
        geofence: {
            type: 'Polygon',
            coordinates: [[
                [77.341, 12.834],
                [77.801, 12.834],
                [77.801, 13.143],
                [77.341, 13.143],
                [77.341, 12.834]
            ]]
        },
        baseFareOverride: 220,
        surchargeMultiplier: 1.15,
        contactNumber: '+918080808080'
    },
    {
        name: 'Chennai',
        state: 'Tamil Nadu',
        isActive: true,
        geofence: {
            type: 'Polygon',
            coordinates: [[
                [80.124, 12.901],
                [80.334, 12.901],
                [80.334, 13.201],
                [80.124, 13.201],
                [80.124, 12.901]
            ]]
        },
        baseFareOverride: 180,
        surchargeMultiplier: 1.0,
        contactNumber: '+914444444444'
    },
    {
        name: 'Hyderabad',
        state: 'Telangana',
        isActive: true,
        geofence: {
            type: 'Polygon',
            coordinates: [[
                [78.239, 17.189],
                [78.618, 17.189],
                [78.618, 17.589],
                [78.239, 17.589],
                [78.239, 17.189]
            ]]
        },
        baseFareOverride: 190,
        surchargeMultiplier: 1.05,
        contactNumber: '+914040404040'
    }
];

async function seed() {
    try {
        console.log('[SEED] Connecting to database...');
        await mongoose.connect(env.MONGO_URI);
        console.log('[SEED] Connected to MongoDB.');

        console.log('[SEED] Clearing existing cities...');
        await CityModel.deleteMany({});

        console.log('[SEED] Inserting 5 initial cities...');
        await CityModel.insertMany(cities);

        console.log('[SEED] Cities seeded successfully!');
        process.exit(0);
    } catch (err: any) {
        console.error('[SEED] Seeding error:', err.message);
        process.exit(1);
    }
}

seed();
