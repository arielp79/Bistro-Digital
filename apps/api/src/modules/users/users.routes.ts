import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import { listUsers, createUser, updateUser } from './users.controller.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, listUsers);
router.post('/', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, createUser);
router.patch('/:id', tenantMiddleware, authMiddleware, requireTenantMatch, adminOnly, updateUser);

export default router;
