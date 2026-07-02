import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  simulateDeliveryMessage,
  listDeliverySessions,
  getDeliverySession,
  calculateShippingPreview,
  testWhatsAppMessage,
  testInstagramMessage,
  getDeliveryOps,
} from './delivery.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.post('/simulate', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, simulateDeliveryMessage);
router.post('/whatsapp/test', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, testWhatsAppMessage);
router.post('/instagram/test', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, testInstagramMessage);
router.get('/sessions', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, listDeliverySessions);
router.get('/ops', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, getDeliveryOps);
router.get('/sessions/:sessionId', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, getDeliverySession);
router.get('/shipping', tenantMiddleware, calculateShippingPreview);

export default router;
