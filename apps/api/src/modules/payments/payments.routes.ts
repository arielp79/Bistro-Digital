import { Router } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { createMercadoPagoPreference } from './payments.controller.js';

const router = Router();

router.get('/mercadopago/preference', tenantMiddleware, createMercadoPagoPreference);
router.post('/mercadopago/preference', tenantMiddleware, createMercadoPagoPreference);

export default router;
