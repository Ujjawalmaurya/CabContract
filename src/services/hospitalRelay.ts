import { RideModel } from '../models/Ride';
import { HospitalModel } from '../models/Hospital';
import { UserModel } from '../models/User';
import { getIo } from '../socket/socketServer';
import { logger } from '../utils/logger';

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function relayPatientInfo(rideId: string): Promise<void> {
    try {
        logger.info(`[HOSPITAL_RELAY] Starting relay for ride: ${rideId}`);

        // 1. Fetch ride details
        const ride = await RideModel.findOne({ id: rideId });
        if (!ride) {
            logger.error(`[HOSPITAL_RELAY] Ride not found: ${rideId}`);
            return;
        }

        // Parse pickup coordinates (assumed "lat,lng")
        const [latStr, lngStr] = ride.pickup.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (isNaN(lat) || isNaN(lng)) {
            logger.error(`[HOSPITAL_RELAY] Invalid pickup coordinates format for ride ${rideId}: ${ride.pickup}`);
            return;
        }

        // 2. Fetch nearest active hospital
        const hospital = await HospitalModel.findOne({
            isActive: true,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat] // [longitude, latitude]
                    }
                }
            }
        });

        if (!hospital) {
            logger.warn(`[HOSPITAL_RELAY] No active hospitals found near coordinates: ${lat}, ${lng}`);
            return;
        }

        // Save hospitalId on Ride document
        ride.hospitalId = hospital._id as any;
        await ride.save();

        logger.info(`[HOSPITAL_RELAY] Nearest hospital matched: ${hospital.name} (${hospital._id})`);

        // Fetch driver details if matched
        let ambulanceNumber = 'UP32AB1234';
        let driverContact = '+91XXXXXXXXXX';
        
        if (ride.driverId) {
            const driver = await UserModel.findById(ride.driverId);
            if (driver) {
                ambulanceNumber = driver.walletAddress.substring(0, 10).toUpperCase(); // mock licence plate from walletAddress
                driverContact = driver.email; // email as contact
            }
        }

        // 3. Construct Payload
        const payload = {
            rideId: ride.id,
            patientInfo: {
                name: ride.patientInfo?.name || 'Anonymous',
                condition: ride.patientInfo?.condition || 'General',
                bloodGroup: ride.patientInfo?.bloodGroup || 'Unknown',
                allergies: ride.patientInfo?.allergies || 'None'
            },
            ambulanceType: ride.ambulanceType,
            pickupLocation: { lat, lng },
            etaMinutes: Math.round(ride.distanceKm * 2) || 8, // simple ETA estimation
            ambulanceNumber,
            driverContact
        };

        // 4. POST Webhook with 3 retries
        let success = false;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`[HOSPITAL_RELAY] Dispatching webhook to ${hospital.webhookUrl} (Attempt ${attempt}/${maxRetries})`);
                
                const response = await fetch(hospital.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    success = true;
                    logger.info(`[HOSPITAL_RELAY] Webhook success on attempt ${attempt}`);
                    break;
                } else {
                    logger.warn(`[HOSPITAL_RELAY] Webhook returned status ${response.status} on attempt ${attempt}`);
                }
            } catch (err: any) {
                logger.error(`[HOSPITAL_RELAY] Webhook request error on attempt ${attempt}: ${err.message}`);
            }

            if (attempt < maxRetries) {
                await delay(2000); // 2s delay between retries
            }
        }

        if (!success) {
            logger.error(`[HOSPITAL_RELAY] Webhook dispatch failed after ${maxRetries} attempts for hospital ${hospital.name}`);
        }

        // 5. Emit socket event
        const io = getIo();
        if (io) {
            io.to(`hospital:${hospital._id}`).emit('patient:incoming', payload);
            logger.info(`[HOSPITAL_RELAY] Socket event 'patient:incoming' dispatched to hospital:${hospital._id}`);
        }

    } catch (err: any) {
        logger.error(`[HOSPITAL_RELAY] Unexpected error in relayPatientInfo: ${err.message}`);
    }
}
