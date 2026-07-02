import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  createInvoice,
  downloadInvoicePdf,
  listBillableOrders,
  testAfipConnection,
} from './billing.controller.js';

const router = Router();
const billingRoles = requireRole('admin', 'cashier');
const billingAdminRoles = requireRole('admin');

router.get('/orders', tenantMiddleware, authMiddleware, requireTenantMatch, billingRoles, listBillableOrders);

router.post(
  '/afip/test',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  billingAdminRoles,
  testAfipConnection
);

router.post(
  '/:orderId/invoice',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  billingRoles,
  createInvoice
);

router.get(
  '/:orderId/invoice/pdf',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  billingRoles,
  downloadInvoicePdf
);

export default router;
