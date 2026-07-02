import { env } from '../../../config/env.js';
import { decrypt } from '../../../utils/encryption.js';
import type { ITenant } from '../../tenant/tenant.model.js';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

function isEncrypted(value: string): boolean {
  return value.includes(':') && value.split(':').length === 3;
}

function resolveAccessToken(accessToken: string): string {
  if (!accessToken) return '';
  return isEncrypted(accessToken) ? decrypt(accessToken) : accessToken;
}

export interface WhatsAppSendResult {
  ok: boolean;
  mode: 'live' | 'dev';
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  static getCredentials(tenant: ITenant): {
    phoneNumberId: string;
    accessToken: string;
    configured: boolean;
  } {
    const phoneNumberId = tenant.config.whatsapp?.phoneNumberId ?? '';
    const accessToken = resolveAccessToken(tenant.config.whatsapp?.accessToken ?? '');
    return {
      phoneNumberId,
      accessToken,
      configured: Boolean(phoneNumberId && accessToken),
    };
  }

  static resolveVerifyToken(tenant: ITenant | null): string {
    const tenantToken = tenant?.config.whatsapp?.webhookToken?.trim();
    if (tenantToken) return tenantToken;
    return env.whatsappVerifyToken;
  }

  static verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    expectedToken: string
  ): boolean {
    return mode === 'subscribe' && token === expectedToken;
  }

  static async sendText(
    tenant: ITenant,
    to: string,
    text: string
  ): Promise<WhatsAppSendResult> {
    const { phoneNumberId, accessToken, configured } = WhatsAppService.getCredentials(tenant);

    if (!configured) {
      console.log(`[WhatsApp:DEV] → ${to}: ${text}`);
      return { ok: true, mode: 'dev' };
    }

    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: text, preview_url: false },
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error('[WhatsApp] Error al enviar:', res.status, body);
      return { ok: false, mode: 'live', error: `${res.status}: ${body}` };
    }

    try {
      const parsed = JSON.parse(body) as { messages?: Array<{ id: string }> };
      return {
        ok: true,
        mode: 'live',
        messageId: parsed.messages?.[0]?.id,
      };
    } catch {
      return { ok: true, mode: 'live' };
    }
  }

  static async getMediaUrl(tenant: ITenant, mediaId: string): Promise<string | null> {
    const { accessToken, configured } = WhatsAppService.getCredentials(tenant);
    if (!configured) return null;

    const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;

    const meta = (await metaRes.json()) as { url?: string };
    return meta.url ?? null;
  }
}

export class InstagramService {
  static getCredentials(tenant: ITenant): {
    pageId: string;
    accessToken: string;
    configured: boolean;
  } {
    const pageId = tenant.config.instagram?.pageId ?? '';
    const accessToken = InstagramService.resolveAccessToken(tenant.config.instagram?.accessToken ?? '');
    return {
      pageId,
      accessToken,
      configured: Boolean(pageId && accessToken),
    };
  }

  static resolveAccessToken(accessToken: string): string {
    if (!accessToken) return '';
    return isEncrypted(accessToken) ? decrypt(accessToken) : accessToken;
  }

  static async sendText(
    tenant: ITenant,
    recipientId: string,
    text: string
  ): Promise<{ ok: boolean; mode: 'live' | 'dev'; error?: string }> {
    const { pageId, accessToken, configured } = InstagramService.getCredentials(tenant);
    if (!configured) {
      console.log(`[Instagram:DEV] → ${recipientId}: ${text}`);
      return { ok: true, mode: 'dev' };
    }

    const url = `${GRAPH_API}/${pageId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Instagram] Error al enviar:', res.status, body);
      return { ok: false, mode: 'live', error: `${res.status}: ${body}` };
    }

    return { ok: true, mode: 'live' };
  }
}
