import { Router } from 'express';
import { createRide, acceptRide, startRide, endRide, getMyRides, getRideDetails } from '../controllers/rideController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/create', authMiddleware, roleMiddleware('rider'), createRide);
router.post('/accept/:rideId', authMiddleware, roleMiddleware('driver'), acceptRide);
router.post('/start/:rideId', authMiddleware, roleMiddleware('rider'), startRide);
router.post('/end/:rideId', authMiddleware, roleMiddleware('driver'), endRide);
router.get('/my-rides', authMiddleware, getMyRides);
router.get('/:rideId', authMiddleware, getRideDetails);

export default router;
