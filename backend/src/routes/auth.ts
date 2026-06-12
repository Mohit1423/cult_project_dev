import { Router } from 'express';
import { register, login, getProfile, getDriversOutside, getPassengerHistory } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.get('/drivers-outside', authenticateToken, getDriversOutside);
router.get('/passenger-history', authenticateToken, getPassengerHistory);

export default router;
