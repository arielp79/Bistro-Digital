import { Router } from 'express';
import { optionalTenantMiddleware } from '../../../middlewares/tenant.middleware.js';
import { verifyMetaWebhookSignature } from '../../../middlewares/webhook.middleware.js';
import { verifyWhatsappWebhook, whatsappWebhook } from './whatsapp.controller.js';
import { verifyInstagramWebhook, instagramWebhook } from './instagram.controller.js';

import { mercadopagoWebhook } from './mercadopago.controller.js';
import { stripeSaasWebhook } from './stripe.controller.js';

const router = Router();

router.get('/whatsapp', optionalTenantMiddleware, (req, res) => {
  void verifyWhatsappWebhook(req, res);
});
router.post(
  '/whatsapp',
  optionalTenantMiddleware,
  verifyMetaWebhookSignature,
  whatsappWebhook
);
router.get('/instagram', optionalTenantMiddleware, (req, res) => {
  void verifyInstagramWebhook(req, res);
});
router.post('/instagram', optionalTenantMiddleware, verifyMetaWebhookSignature, instagramWebhook);
router.post('/mercadopago', mercadopagoWebhook);
router.post('/stripe', stripeSaasWebhook);

export default router;