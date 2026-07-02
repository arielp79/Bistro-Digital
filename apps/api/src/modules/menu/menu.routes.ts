import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware.js';
import { requireTenantMatch } from '../../middlewares/tenant-access.middleware.js';
import {
  getPublicMenu,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} from './menu.controller.js';

const router = Router();

// Público — cliente QR
router.get('/', tenantMiddleware, getPublicMenu);

const adminAuth = [tenantMiddleware, authMiddleware, requireTenantMatch, requireRole('admin')];

// Admin — categorías
router.get('/categories', ...adminAuth, listCategories);
router.post('/categories', ...adminAuth, createCategory);
router.patch('/categories/:id', ...adminAuth, updateCategory);
router.delete('/categories/:id', ...adminAuth, deleteCategory);

// Admin — ítems
router.get('/items', ...adminAuth, listItems);
router.get('/items/:id', ...adminAuth, getItem);
router.post('/items', ...adminAuth, createItem);
router.patch('/items/:id', ...adminAuth, updateItem);
router.delete('/items/:id', ...adminAuth, deleteItem);

export default router;
