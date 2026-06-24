import { Router } from 'express';
import { getBalance, addMoney, payFromWallet } from '../controllers/walletController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/balance', authMiddleware, getBalance);
router.post('/add-money', authMiddleware, addMoney);
router.post('/pay', authMiddleware, payFromWallet);

export default router;
