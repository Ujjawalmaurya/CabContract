function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

export function getETA(distanceKm: number, averageSpeedKmh = 45): number {
    if (averageSpeedKmh <= 0) return 0;
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    return Math.max(timeMinutes, 1); // Minimum 1 minute ETA
}
