import { Router } from 'express';
import { requestSOS, updatePatientInfo, getFamilyShareData, joinWaitlist } from '../controllers/sosController';
import { authMiddleware } from '../middleware/authMiddleware';
import { sosLimiter } from '../middleware/rateLimiter';

const router = Router();

// SOS booking endpoint with rate limiting
router.post('/sos', authMiddleware, sosLimiter, requestSOS);

// Patient info updates
router.patch('/rides/:id/patient-info', authMiddleware, updatePatientInfo);

// Family share public data lookup (No JWT authentication needed)
router.get('/share/:familyShareToken', getFamilyShareData);

// Waitlist subscription route (public, no auth)
router.post('/waitlist', joinWaitlist);

export default router;
