import { Router } from 'express';
import { registerHospital, getIncomingPatients, acknowledgePatient, markCovered } from '../controllers/hospitalController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Admin only: Register new hospitals
router.post('/register', authMiddleware, roleMiddleware('admin'), registerHospital);

// Hospital role only
router.get('/incoming', authMiddleware, roleMiddleware('hospital'), getIncomingPatients);
router.patch('/rides/:rideId/acknowledge', authMiddleware, roleMiddleware('hospital'), acknowledgePatient);
router.post('/rides/:rideId/mark-covered', authMiddleware, roleMiddleware('hospital'), markCovered);

export default router;
