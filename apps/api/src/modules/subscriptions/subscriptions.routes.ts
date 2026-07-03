import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import { createCheckout, createPortal, listSaasPlans } from './subscriptions.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/plans', listSaasPlans);
router.post(
  '/checkout',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  adminOnly,
  createCheckout
);
router.post(
  '/portal',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  adminOnly,
  createPortal
);

export default router;
