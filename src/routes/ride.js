import express from 'express';
import {
    requestRide,
    getAvailableRides,
    acceptRide,
    startRide,
    completeRide
} from '../controllers/rideController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/request', auth, requestRide);
router.get('/available', auth, getAvailableRides);
router.post('/accept/:rideId', auth, acceptRide);
router.post('/start/:rideId', auth, startRide);
router.post('/complete/:rideId', auth, completeRide);

export default router;
