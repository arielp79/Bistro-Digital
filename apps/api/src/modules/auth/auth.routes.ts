import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { login, refresh, me } from '../auth/auth.controller.js';

const router = Router();

router.post('/login', tenantMiddleware, login);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);

export default router;
