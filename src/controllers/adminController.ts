import { Request, Response } from 'express';
import { CityModel } from '../models/City';
import { UserModel } from '../models/User';
import { RideModel } from '../models/Ride';
import { WaitlistModel } from '../models/Waitlist';
import { logger } from '../utils/logger';

export const createCity = async (req: Request, res: Response) => {
    const { name, state, geofence, baseFareOverride, surchargeMultiplier, contactNumber } = req.body;

    if (!name || !state || !geofence || !contactNumber) {
        return res.status(400).json({ message: 'Missing required fields: name, state, geofence, contactNumber' });
    }

    try {
        const city = new CityModel({
            name,
            state,
            geofence,
            baseFareOverride,
            surchargeMultiplier: surchargeMultiplier ?? 1.0,
            contactNumber
        });

        await city.save();
        logger.info(`[ADMIN] Created city: ${name}, ${state}`);
        res.status(201).json(city);
    } catch (err: any) {
        logger.error(`[ADMIN] Failed to create city: ${err.message}`);
        res.status(500).json({ message: 'Failed to create city', error: err.message });
    }
};

export const activateCity = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const city = await CityModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
        if (!city) return res.status(404).json({ message: 'City not found' });
        
        logger.info(`[ADMIN] Activated city: ${city.name}`);
        res.json(city);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to activate city', error: err.message });
    }
};

export const deactivateCity = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const city = await CityModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!city) return res.status(404).json({ message: 'City not found' });

        logger.info(`[ADMIN] Deactivated city: ${city.name}`);
        res.json(city);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to deactivate city', error: err.message });
    }
};

export const listCities = async (req: Request, res: Response) => {
    try {
        const cities = await CityModel.find({});
        
        // Calculate basic stats for each city (e.g. driver count matching locations, etc. mock or actual)
        const enrichedCities = await Promise.all(cities.map(async (city) => {
            // Find active drivers inside this city geofence
            const activeDrivers = await UserModel.countDocuments({
                role: 'driver',
                isAvailable: true,
                location: {
                    $geoWithin: {
                        $geometry: city.geofence
                    }
                }
            });

            // Find completed rides inside this city geofence today
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            // Fetch city rides
            const ridesToday = await RideModel.countDocuments({
                cityId: city._id,
                createdAt: { $gte: startOfDay }
            } as any);

            return {
                ...city.toObject(),
                stats: {
                    activeDrivers,
                    ridesToday
                }
            };
        }));

        res.json(enrichedCities);
    } catch (err: any) {
        logger.error(`[ADMIN] Failed to list cities: ${err.message}`);
        res.status(500).json({ message: 'Failed to list cities', error: err.message });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalDrivers = await UserModel.countDocuments({ role: 'driver' });
        const verifiedDrivers = await UserModel.countDocuments({ role: 'driver', isVerified: true });
        const activeDrivers = await UserModel.countDocuments({ role: 'driver', isAvailable: true });
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const ridesToday = await RideModel.countDocuments({
            createdAt: { $gte: startOfDay }
        });

        // Revenue today (sum of finished rides)
        const completedRidesToday = await RideModel.find({
            status: 'completed',
            createdAt: { $gte: startOfDay }
        });
        const revenueToday = completedRidesToday.reduce((acc, ride) => acc + (ride.fare || 0), 0);

        res.json({
            drivers: {
                total: totalDrivers,
                verified: verifiedDrivers,
                active: activeDrivers
            },
            ridesToday,
            revenueToday
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
    }
};

export const getWaitlist = async (req: Request, res: Response) => {
    try {
        const items = await WaitlistModel.find({}).sort({ requestedAt: -1 });
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch waitlist', error: err.message });
    }
};

