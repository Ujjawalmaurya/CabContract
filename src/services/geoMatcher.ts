import { UserModel, IUser } from '../models/User';
import { logger } from '../utils/logger';

export async function findNearestDriver(
    lat: number, 
    lng: number, 
    maxDistanceMeters = 20000 // 20km default search radius
): Promise<IUser | null> {
    try {
        logger.info(`[GEO_MATCHER] Searching for nearest driver to [lat: ${lat}, lng: ${lng}]`);
        
        // Find nearest available, verified driver with vehicleType 'ambulance'
        const driver = await UserModel.findOne({
            role: 'driver',
            isVerified: true,
            isAvailable: true,
            vehicleType: 'ambulance',
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat] // [longitude, latitude]
                    },
                    $maxDistance: maxDistanceMeters
                }
            }
        });

        if (driver) {
            logger.info(`[GEO_MATCHER] Match found: ${driver.email} (${driver._id})`);
        } else {
            logger.warn(`[GEO_MATCHER] No available verified drivers found within ${maxDistanceMeters / 1000}km`);
        }

        return driver;
    } catch (err: any) {
        logger.error(`[GEO_MATCHER] Error finding nearest driver: ${err.message}`);
        return null;
    }
}
