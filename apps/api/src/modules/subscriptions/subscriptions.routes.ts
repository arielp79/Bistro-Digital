import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  confirmCheckout,
  createCheckout,
  createPortal,
  listSaasPlans,
  syncSubscription,
} from './subscriptions.controller.js';

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
router.post(
  '/confirm',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  adminOnly,
  confirmCheckout
);
router.post(
  '/sync',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  adminOnly,
  syncSubscription
);

export default router;
