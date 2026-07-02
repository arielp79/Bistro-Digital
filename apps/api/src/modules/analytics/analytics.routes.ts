import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import { getSalesAnalytics, getTopItems } from './analytics.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/sales', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, getSalesAnalytics);
router.get('/items/top', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, getTopItems);

export default router;
