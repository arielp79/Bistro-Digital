import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  listTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
} from './table.controller.js';

const router = Router();
const staffRoles = requireRole('waiter', 'kitchen', 'cashier', 'admin');
const adminOnly = requireRole('admin');

router.get('/', tenantMiddleware, authMiddleware, requireTenantMatch, staffRoles, listTables);
router.post('/', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, createTable);
router.get('/:tableId', tenantMiddleware, getTable);
router.patch('/:tableId', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, updateTable);
router.delete('/:tableId', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, deleteTable);
router.patch(
  '/:tableId/status',
  tenantMiddleware,
  authMiddleware,
  requireTenantMatch,
  staffRoles,
  updateTableStatus
);

export default router;
