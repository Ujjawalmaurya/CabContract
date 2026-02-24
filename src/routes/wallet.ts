import { Router } from 'express';
import { getBalance, addMoney } from '../controllers/walletController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/balance', authMiddleware, getBalance);
router.post('/add-money', authMiddleware, addMoney);

export default router;
