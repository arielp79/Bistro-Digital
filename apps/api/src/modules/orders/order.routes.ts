import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import { env } from '../../config/env.js';
import { apiError } from '../../utils/api-response.js';
import {
  createOrder,
  getOrder,
  getOrderStatus,
  listOrders,
  updateOrderStatus,
  closeOrder,
} from './order.controller.js';

const router = Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'development' ? 1_000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.tenant?._id ?? 'unknown'}:${req.ip}`,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(apiError('Demasiadas solicitudes. Esperá un momento e intentá de nuevo.'));
  },
});

const staffRoles = requireRole('waiter', 'kitchen', 'cashier', 'admin');

router.post('/', tenantMiddleware, orderLimiter, createOrder);

router.get('/', tenantMiddleware, authMiddleware, requireTenantMatch, staffRoles, listOrders);

router.get('/:orderId/status', tenantMiddleware, getOrderStatus);
router.get('/:orderId', tenantMiddleware, getOrder);

router.patch(
  '/:orderId/status',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  requireRole('kitchen', 'cashier', 'admin'),
  updateOrderStatus
);

router.post(
  '/:orderId/close',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  requireRole('waiter', 'cashier', 'admin'),
  closeOrder
);

export default router;
