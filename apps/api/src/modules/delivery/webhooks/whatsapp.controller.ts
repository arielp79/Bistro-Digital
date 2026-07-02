import type { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env.js';
import { getDeliveryQueue } from '../../../services/queue.service.js';
import { Tenant } from '../../tenant/tenant.model.js';
import { TenantService } from '../../tenant/tenant.service.js';
import { WhatsAppService } from '../messaging/whatsapp.service.js';

export async function resolveTenantFromWhatsappWebhook(req: Request) {
  if (req.tenant) return req.tenant;

  const queryTenant = req.query.tenant;
  if (typeof queryTenant === 'string') {
    return TenantService.findBySlug(queryTenant);
  }

  const body = req.body as {
    entry?: Array<{
      changes?: Array<{
        value?: { metadata?: { phone_number_id?: string } };
      }>;
    }>;
  };

  const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (phoneNumberId) {
    return Tenant.findOne({
      'config.whatsapp.phoneNumberId': phoneNumberId,
      deletedAt: null,
      isActive: true,
    });
  }

  return null;
}

export const verifyWhatsappWebhook = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const tenant = await resolveTenantFromWhatsappWebhook(req);
  const expectedToken = WhatsAppService.resolveVerifyToken(tenant);

  if (WhatsAppService.verifyWebhook(mode, token, expectedToken)) {
    console.log('[WhatsApp Webhook] Verificación OK', {
      tenant: tenant?.slug ?? 'global',
      phoneNumberId: tenant?.config.whatsapp.phoneNumberId ?? null,
    });
    res.status(200).send(challenge ?? '');
    return;
  }

  console.warn('[WhatsApp Webhook] Verificación fallida', {
    mode,
    tenant: tenant?.slug ?? req.query.tenant ?? null,
  });
  res.sendStatus(403);
};

export const whatsappWebhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  res.status(200).json({ status: 'ok' });

  try {
    const tenant = await resolveTenantFromWhatsappWebhook(req);
    if (!tenant) {
      console.warn('[WhatsApp Webhook] Tenant no resuelto — revisá Phone Number ID en Settings');
      return;
    }

    const { entry } = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              id: string;
              from: string;
              type: string;
              timestamp: string;
              text?: { body: string };
              image?: { id: string };
            }>;
            statuses?: unknown[];
          };
        }>;
      }>;
    };

    const queue = getDeliveryQueue();
    let enqueued = 0;

    for (const e of entry ?? []) {
      for (const change of e.changes ?? []) {
        const message = change.value?.messages?.[0];
        if (!message) continue;

        await queue.add('process_message', {
          platform: 'whatsapp',
          tenantId: tenant._id.toString(),
          messageId: message.id,
          from: message.from,
          type: message.type === 'image' ? 'image' : 'text',
          text: message.text?.body ?? null,
          imageId: message.image?.id ?? null,
          timestamp: new Date(Number(message.timestamp) * 1000).toISOString(),
        });
        enqueued += 1;

        console.log('[WhatsApp Webhook] Mensaje encolado', {
          tenant: tenant.slug,
          from: message.from,
          type: message.type,
          jobPreview: message.text?.body?.slice(0, 80) ?? '[media]',
        });
      }
    }

    if (enqueued === 0) {
      console.log('[WhatsApp Webhook] Evento recibido sin mensajes (status/delivery/read)');
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err);
  }
};
