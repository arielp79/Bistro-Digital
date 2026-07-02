import type {
  TenantAdminSettings,
  TenantConfigPublic,
  TenantConfigUpdate,
  TenantDomainSettings,
  MetaIntegrationStatus,
  TenantWebhookInfo,
} from '@bistro/shared-types';
import type { Request } from 'express';
import { encrypt } from '../../utils/encryption.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/api-response.js';
import {
  buildClientUrl,
  defaultTenantDomain,
  dnsCnameTarget,
  extractSlugFromHostname,
  isDefaultTenantDomain,
  isValidCustomDomain,
  normalizeDomain,
  normalizeHost,
} from '../../utils/tenant-host.js';
import { Tenant, type ITenant } from './tenant.model.js';
import { WhatsAppService, InstagramService } from '../delivery/messaging/whatsapp.service.js';

export class TenantService {
  static async findById(id: string): Promise<ITenant | null> {
    return Tenant.findOne({ _id: id, deletedAt: null, isActive: true });
  }

  static async findBySlug(slug: string): Promise<ITenant | null> {
    return Tenant.findOne({ slug: slug.toLowerCase(), deletedAt: null, isActive: true });
  }

  static async findByDomain(domain: string): Promise<ITenant | null> {
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;
    return Tenant.findOne({ domain: normalized, deletedAt: null, isActive: true });
  }

  static async findByIdAny(id: string): Promise<ITenant | null> {
    return Tenant.findOne({ _id: id, deletedAt: null });
  }

  static async findBySlugAny(slug: string): Promise<ITenant | null> {
    return Tenant.findOne({ slug: slug.toLowerCase(), deletedAt: null });
  }

  static buildDomainSettings(tenant: ITenant): TenantDomainSettings {
    const domain = normalizeDomain(tenant.domain);
    const defaultSubdomain = defaultTenantDomain(tenant.slug);
    const isCustom = !isDefaultTenantDomain(domain, tenant.slug);

    return {
      domain,
      defaultSubdomain,
      isCustomDomain: isCustom,
      clientUrl: buildClientUrl(domain, tenant.slug),
      dnsCnameTarget: dnsCnameTarget(),
    };
  }

  static async resolveByHost(host: string | null | undefined): Promise<ITenant | null> {
    const normalizedHost = normalizeHost(host ?? undefined);
    if (!normalizedHost) return null;

    const byDomain = await TenantService.findByDomain(normalizedHost);
    if (byDomain) return byDomain;

    const slug = extractSlugFromHostname(normalizedHost);
    if (slug) {
      return TenantService.findBySlug(slug);
    }

    return null;
  }

  static async resolveByIdentifier(identifier: string): Promise<ITenant | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    const isObjectId = /^[a-f\d]{24}$/i.test(trimmed);
    if (isObjectId) {
      return TenantService.findById(trimmed);
    }

    if (trimmed.includes('.')) {
      const byHost = await TenantService.resolveByHost(trimmed);
      if (byHost) return byHost;
    }

    return TenantService.findBySlug(trimmed);
  }

  static toPublicConfig(tenant: ITenant): TenantConfigPublic {
    return {
      slug: tenant.slug,
      name: tenant.name,
      branding: tenant.config.branding,
      languages: tenant.config.languages,
      defaultLanguage: tenant.config.defaultLanguage,
      currency: tenant.config.currency,
      timezone: tenant.config.timezone,
      paymentMethods: tenant.config.paymentMethods,
    };
  }

  static buildWebhookInfo(tenant: ITenant): TenantWebhookInfo {
    const publicUrl = env.apiPublicUrl.replace(/\/$/, '');
    const localUrl = env.apiUrl.replace(/\/$/, '');
    const tunnelRequired = publicUrl === localUrl || publicUrl.includes('localhost');
    const verifyToken = WhatsAppService.resolveVerifyToken(tenant);

    return {
      whatsappUrl: `${publicUrl}/api/v1/webhooks/whatsapp?tenant=${tenant.slug}`,
      instagramUrl: `${publicUrl}/api/v1/webhooks/instagram?tenant=${tenant.slug}`,
      metaVerifyToken: verifyToken,
      publicApiUrl: publicUrl,
      tunnelRequired,
      signatureVerification: Boolean(env.whatsappAppSecret),
    };
  }

  static buildMetaStatus(tenant: ITenant): MetaIntegrationStatus {
    const whatsapp = WhatsAppService.getCredentials(tenant);
    const instagram = InstagramService.getCredentials(tenant);
    const verifyToken = tenant.config.whatsapp?.webhookToken?.trim() || env.whatsappVerifyToken;

    return {
      metaAppReady: Boolean(verifyToken),
      whatsappConnected: whatsapp.configured,
      instagramConnected: instagram.configured,
      deliveryReady: whatsapp.configured || instagram.configured,
    };
  }

  static buildPilotStatus(tenant: ITenant): TenantAdminSettings['pilotStatus'] {
    const webhooks = TenantService.buildWebhookInfo(tenant);
    const meta = TenantService.buildMetaStatus(tenant);
    const afip = tenant.config.afip;
    const afipConfigured = Boolean(
      afip?.cuit?.trim() && afip?.certificate && afip?.privateKey
    );

    const checks = [
      !webhooks.tunnelRequired,
      env.isAiConfigured,
      meta.whatsappConnected,
      meta.instagramConnected,
      afipConfigured,
      afip?.enabled ?? false,
    ];
    const done = checks.filter(Boolean).length;

    return {
      overallPercent: Math.round((done / checks.length) * 100),
      publicApiReady: !webhooks.tunnelRequired,
      aiConfigured: env.isAiConfigured,
      aiProvider: env.activeAiProvider,
      metaWhatsApp: meta.whatsappConnected,
      metaInstagram: meta.instagramConnected,
      afipConfigured,
      afipEnabled: afip?.enabled ?? false,
    };
  }

  static toAdminSettings(tenant: ITenant): TenantAdminSettings {
    return {
      ...TenantService.toPublicConfig(tenant),
      domainSettings: TenantService.buildDomainSettings(tenant),
      integrations: {
        mercadopagoConfigured: Boolean(tenant.config.mercadopago?.accessToken),
        whatsappConfigured: WhatsAppService.getCredentials(tenant).configured,
        whatsappPhoneNumberId: tenant.config.whatsapp?.phoneNumberId ?? '',
        whatsappWebhookToken: tenant.config.whatsapp?.webhookToken ?? '',
        instagramConfigured: InstagramService.getCredentials(tenant).configured,
        instagramPageId: tenant.config.instagram?.pageId ?? '',
      },
      webhooks: TenantService.buildWebhookInfo(tenant),
      metaStatus: TenantService.buildMetaStatus(tenant),
      afip: {
        enabled: tenant.config.afip?.enabled ?? false,
        cuit: tenant.config.afip?.cuit ?? '',
        pointOfSale: tenant.config.afip?.pointOfSale ?? 1,
        certificateConfigured: Boolean(tenant.config.afip?.certificate),
        privateKeyConfigured: Boolean(tenant.config.afip?.privateKey),
      },
      pilotStatus: TenantService.buildPilotStatus(tenant),
    };
  }

  static async assertDomainAvailable(domain: string, tenantId: string): Promise<string> {
    const normalized = normalizeDomain(domain);
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new AppError('Tenant no encontrado', 404);

    if (
      normalized === defaultTenantDomain(tenant.slug) ||
      normalized === `${tenant.slug}.local`
    ) {
      return normalized;
    }

    if (!isValidCustomDomain(normalized)) {
      throw new AppError('Dominio inválido', 400);
    }

    if (normalized === env.platformBaseDomain || normalized.endsWith(`.${env.platformBaseDomain}`)) {
      throw new AppError('Usá el subdominio por defecto de la plataforma en lugar de un dominio custom', 400);
    }

    const conflict = await Tenant.findOne({
      domain: normalized,
      deletedAt: null,
      _id: { $ne: tenantId },
    });
    if (conflict) {
      throw new AppError('Ese dominio ya está en uso por otro restaurante', 409);
    }

    return normalized;
  }

  static async updateConfig(tenantId: string, data: TenantConfigUpdate): Promise<TenantAdminSettings> {
    const update: Record<string, unknown> = {};
    if (data.name) update.name = data.name;
    if (data.domain !== undefined) {
      update.domain = await TenantService.assertDomainAvailable(data.domain, tenantId);
    }
    if (data.branding) {
      for (const [k, v] of Object.entries(data.branding)) {
        update[`config.branding.${k}`] = v;
      }
    }
    if (data.defaultLanguage) update['config.defaultLanguage'] = data.defaultLanguage;
    if (data.paymentMethods) {
      for (const [k, v] of Object.entries(data.paymentMethods)) {
        update[`config.paymentMethods.${k}`] = v;
      }
    }
    if (data.integrations) {
      if (data.integrations.mercadopagoAccessToken !== undefined) {
        const token = data.integrations.mercadopagoAccessToken.trim();
        update['config.mercadopago.accessToken'] = token ? encrypt(token) : '';
      }
      if (data.integrations.whatsappPhoneNumberId !== undefined) {
        update['config.whatsapp.phoneNumberId'] = data.integrations.whatsappPhoneNumberId.trim();
      }
      if (data.integrations.whatsappAccessToken !== undefined) {
        const token = data.integrations.whatsappAccessToken.trim();
        update['config.whatsapp.accessToken'] = token ? encrypt(token) : '';
      }
      if (data.integrations.whatsappWebhookToken !== undefined) {
        update['config.whatsapp.webhookToken'] = data.integrations.whatsappWebhookToken.trim();
      }
      if (data.integrations.instagramPageId !== undefined) {
        update['config.instagram.pageId'] = data.integrations.instagramPageId.trim();
      }
      if (data.integrations.instagramAccessToken !== undefined) {
        const token = data.integrations.instagramAccessToken.trim();
        update['config.instagram.accessToken'] = token ? encrypt(token) : '';
      }
    }
    if (data.afip) {
      if (data.afip.enabled !== undefined) update['config.afip.enabled'] = data.afip.enabled;
      if (data.afip.cuit !== undefined) update['config.afip.cuit'] = data.afip.cuit.trim();
      if (data.afip.pointOfSale !== undefined) {
        update['config.afip.pointOfSale'] = data.afip.pointOfSale;
      }
      if (data.afip.certificate !== undefined) {
        const cert = data.afip.certificate.trim();
        update['config.afip.certificate'] = cert ? encrypt(cert) : '';
      }
      if (data.afip.privateKey !== undefined) {
        const key = data.afip.privateKey.trim();
        update['config.afip.privateKey'] = key ? encrypt(key) : '';
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true });
    if (!tenant) throw new Error('Tenant no encontrado');
    return TenantService.toAdminSettings(tenant);
  }
}

export function extractTenantIdentifier(req: Request): string | null {
  const headerId = req.headers['x-tenant-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }

  const host = normalizeHost(req.headers.host);
  if (host && host !== 'localhost') {
    return host;
  }

  if (req.user?.tenantId) {
    return req.user.tenantId;
  }

  const queryTenant = req.query.tenant;
  if (typeof queryTenant === 'string' && queryTenant.trim()) {
    return queryTenant.trim();
  }

  return null;
}
