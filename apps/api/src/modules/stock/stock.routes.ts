import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  listIngredients,
  listAlerts,
  createIngredient,
  updateIngredient,
  createMovement,
} from './stock.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/ingredients', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, listIngredients);
router.get('/alerts', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, listAlerts);
router.post('/ingredients', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, createIngredient);
router.patch('/ingredients/:id', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, updateIngredient);
router.post('/movements', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, createMovement);

export default router;
