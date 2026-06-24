import { Router } from 'express';
import { 
    submitVerification, 
    getDigiLockerAuth, 
    handleDigiLockerCallback, 
    fetchVahanRC, 
    uploadDocsMiddleware 
} from '../controllers/verificationController';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public callback for DigiLocker OAuth redirects (no auth header since redirecting from browser)
router.get('/digilocker/callback', handleDigiLockerCallback);

// Driver verification endpoints (require logged-in driver)
router.post('/submit', authMiddleware, roleMiddleware('driver'), uploadDocsMiddleware, submitVerification);
router.get('/digilocker/auth', authMiddleware, roleMiddleware('driver'), getDigiLockerAuth);
router.post('/rc', authMiddleware, roleMiddleware('driver'), fetchVahanRC);

export default router;
