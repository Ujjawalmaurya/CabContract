import { Router } from 'express';
import { createCity, activateCity, deactivateCity, listCities, getDashboardStats, getWaitlist } from '../controllers/adminController';
import { getPendingVerifications, approveDriver, rejectDriver } from '../controllers/verificationController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All admin routes require admin authentication
router.use(authMiddleware, roleMiddleware('admin'));

router.post('/cities', createCity);
router.patch('/cities/:id/activate', activateCity);
router.patch('/cities/:id/deactivate', deactivateCity);
router.get('/cities', listCities);
router.get('/stats', getDashboardStats);
router.get('/waitlist', getWaitlist);

router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/:driverId/approve', approveDriver);
router.post('/verifications/:driverId/reject', rejectDriver);

export default router;
