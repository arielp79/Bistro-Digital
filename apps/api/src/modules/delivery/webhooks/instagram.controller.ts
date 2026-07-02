import type { Request, Response, NextFunction } from 'express';
import { getDeliveryQueue } from '../../../services/queue.service.js';
import { Tenant } from '../../tenant/tenant.model.js';
import { TenantService } from '../../tenant/tenant.service.js';
import { WhatsAppService } from '../messaging/whatsapp.service.js';

async function resolveTenant(req: Request) {  if (req.tenant) return req.tenant;
  const queryTenant = req.query.tenant;
  if (typeof queryTenant === 'string') {
    return TenantService.findBySlug(queryTenant);
  }
  const pageId = (req.body as { entry?: Array<{ id?: string }> })?.entry?.[0]?.id;
  if (pageId) {
    return Tenant.findOne({
      'config.instagram.pageId': pageId,
      deletedAt: null,
      isActive: true,
    });
  }
  return null;
}

export const verifyInstagramWebhook = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const tenant = await resolveTenant(req);
  const expectedToken = WhatsAppService.resolveVerifyToken(tenant);

  if (WhatsAppService.verifyWebhook(mode, token, expectedToken)) {
    res.status(200).send(challenge ?? '');
    return;
  }
  res.sendStatus(403);
};
export const instagramWebhook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  res.status(200).json({ status: 'ok' });

  try {
    const tenant = await resolveTenant(req);
    if (!tenant) {
      console.warn('[Instagram Webhook] Tenant no resuelto');
      return;
    }

    const body = req.body as {
      entry?: Array<{
        messaging?: Array<{
          sender: { id: string };
          message?: { mid: string; text?: string; attachments?: Array<{ type: string; payload?: { url?: string } }> };
          timestamp: number;
        }>;
      }>;
    };

    const queue = getDeliveryQueue();

    for (const e of body.entry ?? []) {
      for (const msg of e.messaging ?? []) {
        if (!msg.message) continue;
        const attachment = msg.message.attachments?.find((a) => a.type === 'image');

        await queue.add('process_message', {
          platform: 'instagram',
          tenantId: tenant._id.toString(),
          messageId: msg.message.mid,
          from: msg.sender.id,
          type: attachment ? 'image' : 'text',
          text: msg.message.text ?? null,
          imageId: null,
          imageUrl: attachment?.payload?.url ?? null,
          timestamp: new Date(msg.timestamp).toISOString(),
        });

        console.log('[Instagram Webhook] Mensaje encolado', {
          tenant: tenant.slug,
          from: msg.sender.id,
          preview: msg.message.text?.slice(0, 80) ?? '[media]',
        });
      }
    }
  } catch (err) {
    console.error('[Instagram Webhook] Error:', err);
  }
};
