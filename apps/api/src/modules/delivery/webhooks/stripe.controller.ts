import type { Response } from 'express';
import type { RequestWithRawBody } from '../../../middlewares/webhook.middleware.js';
import { AppError } from '../../../utils/api-response.js';
import { StripeSaasService } from '../../subscriptions/stripe-saas.service.js';

export const stripeSaasWebhook = async (req: RequestWithRawBody, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string' || !req.rawBody) {
    res.status(400).json({ error: 'Firma Stripe ausente' });
    return;
  }

  try {
    const event = StripeSaasService.constructWebhookEvent(req.rawBody, signature);
    res.status(200).json({ received: true });

    void StripeSaasService.handleWebhookEvent(event).catch((err) => {
      console.error('[Stripe Webhook] Error procesando evento:', err);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof AppError ? err.statusCode : 400;
    console.warn('[Stripe Webhook] Error:', message);
    res.status(status).json({ error: message });
  }
};
