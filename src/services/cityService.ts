import { CityModel, ICity } from '../models/City';
import { logger } from '../utils/logger';

export async function getCityForLocation(lat: number, lng: number): Promise<ICity | null> {
    try {
        const city = await CityModel.findOne({
            isActive: true,
            geofence: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat] // [longitude, latitude] for GeoJSON
                    }
                }
            }
        });
        return city;
    } catch (err: any) {
        logger.error(`[CITY_SERVICE] Error checking location geofence: ${err.message}`);
        return null;
    }
}

export async function isCityActive(lat: number, lng: number): Promise<boolean> {
    const city = await getCityForLocation(lat, lng);
    return city !== null;
}
