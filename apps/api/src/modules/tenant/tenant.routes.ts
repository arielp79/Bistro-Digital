import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import { getTenantConfig, getAdminSettings, updateTenantConfig, resolveTenantByHost } from './tenant.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/resolve', resolveTenantByHost);
router.get('/config', tenantMiddleware, getTenantConfig);
router.get('/settings', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, getAdminSettings);
router.patch('/config', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, updateTenantConfig);

export default router;
