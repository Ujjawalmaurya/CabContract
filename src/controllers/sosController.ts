import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { RideModel } from '../models/Ride';
import { UserModel } from '../models/User';
import { HospitalModel } from '../models/Hospital';
import { getCityForLocation, isCityActive } from '../services/cityService';
import { findNearestDriver } from '../services/geoMatcher';
import { calculateFare } from '../services/fareCalculator';
import { getDistance } from '../utils/haversine';
import { relayPatientInfo } from '../services/hospitalRelay';
import { logger } from '../utils/logger';
import { WaitlistModel } from '../models/Waitlist';

export const requestSOS = async (req: any, res: Response) => {
    const { pickup, patientInfo, coverageType, ambulanceType } = req.body;

    if (!pickup) {
        return res.status(400).json({ message: 'Pickup coordinates ("lat,lng") are required' });
    }

    try {
        const [latStr, lngStr] = pickup.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ message: 'Invalid pickup coordinates format. Must be "lat,lng"' });
        }

        // 1. Check if city is active
        const isActive = await isCityActive(lat, lng);
        if (!isActive) {
            // Find any active city to return as nearest city recommendation
            const activeCity = await getCityForLocation(lat, lng);
            return res.status(422).json({
                error: 'SERVICE_NOT_AVAILABLE',
                message: 'AmbulanceChain not yet available in your area',
                nearestCity: activeCity ? activeCity.name : null
            });
        }

        // Fetch city details
        const city = await getCityForLocation(lat, lng);
        const surchargeMultiplier = city?.surchargeMultiplier ?? 1.0;
        const cityId = city?._id;

        // 2. Find nearest hospital to calculate route distance
        const nearestHospital = await HospitalModel.findOne({
            isActive: true,
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] }
                }
            }
        });

        let distanceKm = 5; // default fallback distance
        if (nearestHospital) {
            const hLng = nearestHospital.location.coordinates[0];
            const hLat = nearestHospital.location.coordinates[1];
            distanceKm = getDistance(lat, lng, hLat, hLng);
        }

        // 3. Calculate fare breakdown
        const type = ambulanceType || 'basic';
        const fareBreakdown = calculateFare(distanceKm, type, surchargeMultiplier);

        // 4. Find nearest verified available driver
        const driver = await findNearestDriver(lat, lng);

        // Generate UUID family share token
        const familyShareToken = crypto.randomUUID();

        // 5. Create Ride
        const rideId = Date.now().toString();
        const ride = new RideModel({
            id: rideId,
            riderId: req.user?.id || 'anonymous_sos',
            driverId: driver?._id ? driver._id.toString() : undefined,
            pickup,
            drop: nearestHospital ? `${nearestHospital.location.coordinates[1]},${nearestHospital.location.coordinates[0]}` : 'hospital_coords',
            distanceKm,
            fare: fareBreakdown.total,
            status: driver ? 'accepted' : 'pending',
            ambulanceType: type,
            patientInfo: {
                name: patientInfo?.name || 'Anonymous',
                condition: patientInfo?.condition || 'General',
                bloodGroup: patientInfo?.bloodGroup || 'Unknown',
                allergies: patientInfo?.allergies || 'None'
            },
            coverageType: coverageType || 'cash',
            paymentStatus: coverageType === 'government' ? 'waived' : 'pending',
            paymentMethod: coverageType === 'government' ? 'government' : 'upi',
            familyShareToken,
            fareBreakdown,
            cityId,
            hospitalId: nearestHospital?._id
        });

        await ride.save();

        const familyShareUrl = `${env.BASE_URL}/share/${familyShareToken}`;
        
        logger.info(`[SOS] Booked: ${rideId} | Driver: ${driver?.email || 'Searching...'} | Share: ${familyShareUrl}`);

        // Trigger hospital relay in background if driver matched
        if (driver) {
            relayPatientInfo(rideId).catch((err) => {
                logger.error(`[SOS] Background hospital relay failed for ride ${rideId}: ${err.message}`);
            });
        }

        res.status(201).json({
            success: true,
            rideId,
            driverMatched: !!driver,
            familyShareUrl,
            ride
        });

    } catch (err: any) {
        logger.error(`[SOS] SOS request failed: ${err.message}`);
        res.status(500).json({ message: 'SOS request failed', error: err.message });
    }
};

export const updatePatientInfo = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, condition, bloodGroup, allergies } = req.body;

    try {
        const ride = await RideModel.findOne({ id });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        if (ride.patientInfo) {
            if (name) ride.patientInfo.name = name;
            if (condition) ride.patientInfo.condition = condition;
            if (bloodGroup) ride.patientInfo.bloodGroup = bloodGroup;
            if (allergies) ride.patientInfo.allergies = allergies;
        }

        await ride.save();
        logger.info(`[SOS] Patient Info updated for ride: ${id}`);

        // Re-trigger hospital relay
        relayPatientInfo(id as string).catch((err) => {
            logger.error(`[SOS] Background hospital relay update failed for ride ${id}: ${err.message}`);
        });

        res.json({ message: 'Patient info updated and re-routed successfully', ride });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to update patient info', error: err.message });
    }
};

export const serveFamilyShareView = async (req: Request, res: Response) => {
    const { familyShareToken } = req.params;

    try {
        const ride = await RideModel.findOne({ familyShareToken });
        if (!ride) {
            return res.status(404).send('Share tracking link not found or expired.');
        }

        const filePath = path.join(__dirname, '../views/family-share.html');
        if (!fs.existsSync(filePath)) {
            return res.status(504).send('Share tracking template missing.');
        }

        let html = fs.readFileSync(filePath, 'utf8');
        
        // Inject maps API key safely before sending
        html = html.replace('__GMAPS_KEY__', env.GOOGLE_MAPS_API_KEY);

        res.send(html);
    } catch (err: any) {
        logger.error(`[SOS] Serve share view error: ${err.message}`);
        res.status(500).send('Failed to load tracking dashboard.');
    }
};

export const getFamilyShareData = async (req: Request, res: Response) => {
    const { familyShareToken } = req.params;

    try {
        const ride = await RideModel.findOne({ familyShareToken });
        if (!ride) {
            return res.status(404).json({ message: 'Ride tracking data not found' });
        }

        let driverName = 'Searching for driver...';
        let vehicleNumber = 'Pending match';
        let driverContact = '112';

        if (ride.driverId) {
            const driver = await UserModel.findById(ride.driverId);
            if (driver) {
                driverName = driver.email.split('@')[0]; // Safe name representation
                vehicleNumber = driver.walletAddress.substring(0, 10).toUpperCase();
                driverContact = driver.email;
            }
        }

        res.json({
            rideId: ride.id,
            pickup: ride.pickup,
            status: ride.status,
            ambulanceType: ride.ambulanceType,
            driverName,
            vehicleNumber,
            driverContact
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to fetch share data', error: err.message });
    }
};

export const joinWaitlist = async (req: Request, res: Response) => {
    const { lat, lng, contact, city } = req.body;

    if (!lat || !lng || !contact || !city) {
        return res.status(400).json({ message: 'All fields are required: lat, lng, contact, city' });
    }

    try {
        const item = new WaitlistModel({ lat, lng, contact, city });
        await item.save();
        logger.info(`[SOS] User joined waitlist for city ${city}: ${contact}`);
        res.status(201).json({ message: 'Successfully joined waitlist', item });
    } catch (err: any) {
        logger.error(`[SOS] Failed to join waitlist: ${err.message}`);
        res.status(500).json({ message: 'Failed to join waitlist', error: err.message });
    }
};

