import { env } from '../config/env.js';

export type EmailDeliveryMode = 'console' | 'resend' | 'disabled';

export interface EmailSendResult {
  sent: boolean;
  mode: EmailDeliveryMode;
  error?: string;
}

export interface WelcomeOnboardingEmailParams {
  to: string;
  adminName: string;
  restaurantName: string;
  slug: string;
  plan: string;
  adminUrl: string;
  menuUrl: string;
}

function buildWelcomeHtml(params: WelcomeOnboardingEmailParams): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E">
      <h1 style="color:#1A1A2E">¡Bienvenido a Bistró Digital!</h1>
      <p>Hola <strong>${params.adminName}</strong>,</p>
      <p>Tu restaurante <strong>${params.restaurantName}</strong> ya está listo con el plan <strong>${params.plan}</strong>.</p>
      <p><strong>Identificador:</strong> <code>${params.slug}</code></p>
      <p style="margin:24px 0">
        <a href="${params.adminUrl}" style="background:#1A1A2E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
          Ir al panel admin
        </a>
      </p>
      <p><a href="${params.menuUrl}">Abrir menú QR</a></p>
      <p style="color:#666;font-size:13px;margin-top:32px">
        Podés conectar WhatsApp e Instagram desde el panel en Conectar Meta.
      </p>
    </div>
  `.trim();
}

export class EmailService {
  static getMode(): EmailDeliveryMode {
    if (!env.onboardingWelcomeEmail) return 'disabled';
    if (env.resendApiKey) return 'resend';
    return 'console';
  }

  static async sendWelcomeOnboarding(params: WelcomeOnboardingEmailParams): Promise<EmailSendResult> {
    const mode = EmailService.getMode();
    if (mode === 'disabled') {
      return { sent: false, mode };
    }

    const subject = `Bienvenido a Bistró Digital — ${params.restaurantName}`;
    const html = buildWelcomeHtml(params);

    if (mode === 'console') {
      console.log(
        `[Email:console] To=${params.to} Subject="${subject}" admin=${params.adminUrl} menu=${params.menuUrl}`
      );
      return { sent: true, mode };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.emailFrom,
          to: [params.to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error('[Email:resend] Error', res.status, body);
        return { sent: false, mode, error: `Resend ${res.status}` };
      }

      return { sent: true, mode };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de envío';
      console.error('[Email:resend]', message);
      return { sent: false, mode, error: message };
    }
  }
}
