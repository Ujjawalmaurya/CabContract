export type AmbulanceType = 'basic' | 'advanced' | 'icu';

export interface FareBreakdown {
    baseFare: number;
    distanceCharge: number;
    ambulanceTypeSurcharge: number;
    citySurcharge: number;
    total: number;
}

export function calculateFare(
    distanceKm: number, 
    ambulanceType: AmbulanceType, 
    surchargeMultiplier = 1.0
): FareBreakdown {
    const baseFare = 200;
    const distanceCharge = Math.round(distanceKm * 15);
    
    let ambulanceTypeSurcharge = 0;
    if (ambulanceType === 'advanced') {
        ambulanceTypeSurcharge = 500;
    } else if (ambulanceType === 'icu') {
        ambulanceTypeSurcharge = 1500;
    }

    const subtotal = baseFare + distanceCharge + ambulanceTypeSurcharge;
    const total = Math.round(subtotal * surchargeMultiplier);
    const citySurcharge = total - subtotal;

    return {
        baseFare,
        distanceCharge,
        ambulanceTypeSurcharge,
        citySurcharge,
        total
    };
}
