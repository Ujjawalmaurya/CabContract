import { env } from '../config/env';
import { DriverVerificationModel } from '../models/DriverVerification';
import { UserModel } from '../models/User';
import { approveDriver } from './verificationService';
import { logger } from '../utils/logger';

export interface DigiLockerResult {
    verified: boolean;
    name?: string;
    aadhaarLast4?: string;
    message?: string;
}

export interface VehicleRCResult {
    verified: boolean;
    vehicleNumber?: string;
    ownerName?: string;
    vehicleClass?: string;
    permitType?: string;
    message?: string;
}

export function getAuthUrl(driverId: string): string {
    const baseUrl = 'https://api.digitallocker.gov.in/public/oauth2/1/authorize';
    const params = new URLSearchParams({
        client_id: env.DIGILOCKER_CLIENT_ID,
        redirect_uri: env.DIGILOCKER_REDIRECT_URI,
        state: driverId,
        response_type: 'code',
        scope: 'aadhaar'
    });
    return `${baseUrl}?${params.toString()}`;
}

// Simple helper to parse XML elements or attributes via regex
function parseXmlAttribute(xml: string, attribute: string): string {
    const regex = new RegExp(`${attribute}="([^"]+)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
}

function parseXmlElement(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
}

export async function handleCallback(code: string, driverId: string): Promise<DigiLockerResult> {
    try {
        logger.info(`[DIGILOCKER] Code exchange for driver: ${driverId}`);
        
        // 1. Exchange code for access token
        const tokenResponse = await fetch('https://api.digitallocker.gov.in/public/oauth2/1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: env.DIGILOCKER_CLIENT_ID,
                client_secret: env.DIGILOCKER_CLIENT_SECRET,
                redirect_uri: env.DIGILOCKER_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            const errBody = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errBody}`);
        }

        const tokenData = await tokenResponse.json() as any;
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error('Access token was missing in DigiLocker response');
        }

        // 2. Fetch Aadhaar eKYC XML
        logger.info(`[DIGILOCKER] Fetching eaadhaar XML for driver: ${driverId}`);
        const aadhaarResponse = await fetch('https://api.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!aadhaarResponse.ok) {
            throw new Error(`Aadhaar retrieval failed: ${aadhaarResponse.statusText}`);
        }

        const xmlContent = await aadhaarResponse.text();
        
        // 3. Parse XML response
        const name = parseXmlAttribute(xmlContent, 'name') || parseXmlElement(xmlContent, 'Name') || 'Verified Driver';
        const uid = parseXmlAttribute(xmlContent, 'uid') || parseXmlElement(xmlContent, 'uid') || '';
        const aadhaarLast4 = uid ? uid.slice(-4) : 'XXXX';

        // 4. Update verification document
        let verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification) {
            verification = new DriverVerificationModel({ driverId });
        }

        verification.aadhaarVerified = true;
        verification.digilockerToken = accessToken; // In production this should be encrypted
        verification.verifiedName = name;
        verification.aadhaarLast4 = aadhaarLast4;
        verification.digilockerVerifiedAt = new Date();
        
        await verification.save();
        
        logger.info(`[DIGILOCKER] Aadhaar verified for driver ${driverId}: Name="${name}"`);

        return {
            verified: true,
            name,
            aadhaarLast4
        };

    } catch (err: any) {
        logger.error(`[DIGILOCKER] Callback processing error for driver ${driverId}: ${err.message}`);
        return {
            verified: false,
            message: err.message
        };
    }
}

export async function fetchVehicleRC(driverId: string, vehicleNumber: string): Promise<VehicleRCResult> {
    try {
        const verification = await DriverVerificationModel.findOne({ driverId });
        if (!verification || !verification.digilockerToken) {
            throw new Error('DigiLocker token missing. Please complete Aadhaar verification first.');
        }

        logger.info(`[DIGILOCKER] Fetching Vehicle RC for driver ${driverId}, Vehicle ${vehicleNumber}`);

        // Get Vahan RC document via DigiLocker API
        const response = await fetch('https://api.digitallocker.gov.in/public/oauth2/1/xml/registration_of_vehicles', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${verification.digilockerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                doc_id: vehicleNumber
            })
        });

        if (!response.ok) {
            throw new Error(`DigiLocker RC retrieval failed: ${response.statusText}`);
        }

        const xmlContent = await response.text();

        // Extract registration details
        const ownerName = parseXmlAttribute(xmlContent, 'ownerName') || parseXmlElement(xmlContent, 'OwnerName') || 'Verified Owner';
        const vehicleClass = parseXmlAttribute(xmlContent, 'vehicleClass') || parseXmlElement(xmlContent, 'VehicleClass') || 'Ambulance';
        const permitType = parseXmlAttribute(xmlContent, 'permitType') || parseXmlElement(xmlContent, 'PermitType') || 'Emergency / Ambulance';

        // Validate permit type contains 'ambulance' or 'emergency'
        const isValidPermit = permitType.toLowerCase().includes('ambulance') || permitType.toLowerCase().includes('emergency');
        if (!isValidPermit) {
            logger.warn(`[DIGILOCKER] RC validation failed for ${vehicleNumber}. Permit type: "${permitType}" does not specify ambulance/emergency.`);
            return {
                verified: false,
                message: `Permit type "${permitType}" is not authorized for emergency services. Must contain "ambulance" or "emergency".`
            };
        }

        // Update verification record
        verification.vehicleVerified = true;
        verification.vehicleNumber = vehicleNumber;
        verification.vehicleClass = vehicleClass;
        verification.permitType = permitType;
        await verification.save();

        logger.info(`[DIGILOCKER] Vehicle RC verified for driver ${driverId}: Vehicle="${vehicleNumber}" Owner="${ownerName}"`);

        // Check if both Aadhaar and Vehicle are verified to trigger auto-approval
        if (verification.aadhaarVerified && verification.vehicleVerified) {
            await approveDriver(driverId.toString(), 'SYSTEM_DIGILOCKER');
        }

        return {
            verified: true,
            vehicleNumber,
            ownerName,
            vehicleClass,
            permitType
        };

    } catch (err: any) {
        logger.error(`[DIGILOCKER] RC fetch error for driver ${driverId}: ${err.message}`);
        return {
            verified: false,
            message: err.message
        };
    }
}
