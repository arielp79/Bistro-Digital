import mongoose from 'mongoose';
import type { RegisterTenantInput } from '@bistro/validation-schemas';
import type { OnboardingRegisterResponse } from '@bistro/shared-types';
import { AppError } from '../../utils/api-response.js';
import { env } from '../../config/env.js';
import { defaultTenantDomain } from '../../utils/tenant-host.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import { AuthService } from '../auth/auth.service.js';
import { User } from '../auth/user.model.js';
import { MenuCategory } from '../menu/category.model.js';
import { MenuItem } from '../menu/menu-item.model.js';
import { Table } from '../tables/table.model.js';
import { Tenant } from '../tenant/tenant.model.js';
import {
  RESERVED_SLUGS,
  STARTER_CATEGORIES,
  STARTER_MENU_ITEMS,
  buildStarterTenantConfig,
  slugifyName,
} from '../../data/starter-tenant.data.js';
import { isOnboardingPlan } from '../../data/onboarding-plans.data.js';
import { EmailService } from '../../services/email.service.js';
import { resolvePriceIdForPlan } from '../subscriptions/stripe-saas.service.js';

export class OnboardingService {
  static normalizeSlug(raw: string): string {
    return slugifyName(raw);
  }

  static async isSlugAvailable(slug: string): Promise<{ available: boolean; slug: string; reason?: string }> {
    const normalized = OnboardingService.normalizeSlug(slug);
    if (normalized.length < 3) {
      return { available: false, slug: normalized, reason: 'Mínimo 3 caracteres' };
    }
    if (RESERVED_SLUGS.has(normalized)) {
      return { available: false, slug: normalized, reason: 'Identificador reservado' };
    }
    const exists = await Tenant.findOne({ slug: normalized, deletedAt: null });
    if (exists) {
      return { available: false, slug: normalized, reason: 'Ya está en uso' };
    }
    return { available: true, slug: normalized };
  }

  static async register(input: RegisterTenantInput): Promise<OnboardingRegisterResponse> {
    const slugCheck = await OnboardingService.isSlugAvailable(input.slug ?? slugifyName(input.restaurantName));
    if (!slugCheck.available) {
      throw new AppError(slugCheck.reason ?? 'Identificador no disponible', 409);
    }

    const slug = slugCheck.slug;
    const requestedPlan = input.plan ?? 'starter';
    if (!isOnboardingPlan(requestedPlan)) {
      throw new AppError('Plan inválido', 400);
    }

    const checkoutRequired =
      requestedPlan !== 'starter' && Boolean(resolvePriceIdForPlan(requestedPlan));
    const plan = checkoutRequired ? 'starter' : requestedPlan;

    const clientWebUrl = env.corsOrigin[0] ?? 'http://localhost:5173';
    const adminBase = env.corsOrigin.find((o) => o.includes('3001')) ?? 'http://localhost:3001';

    const tenant = await Tenant.create({
      slug,
      name: input.restaurantName.trim(),
      domain: defaultTenantDomain(slug),
      isActive: true,
      plan,
      config: buildStarterTenantConfig({
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        defaultLanguage: input.defaultLanguage,
        currency: input.currency,
      }),
    });

    try {
      const passwordHash = await AuthService.hashPassword(input.adminPassword);
      const user = await User.create({
        tenantId: tenant._id,
        email: input.adminEmail.toLowerCase(),
        passwordHash,
        role: 'admin',
        name: input.adminName.trim(),
        phone: '',
        isActive: true,
      });

      let firstTableId: string | null = null;

      if (input.includeStarterMenu) {
        const categoryMap = new Map<string, mongoose.Types.ObjectId>();
        for (const cat of STARTER_CATEGORIES) {
          const category = await MenuCategory.create({
            tenantId: tenant._id,
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: true,
          });
          categoryMap.set(cat.key, category._id);
        }

        for (const item of STARTER_MENU_ITEMS) {
          const categoryId = categoryMap.get(item.categoryKey);
          if (!categoryId) continue;
          await MenuItem.create({
            tenantId: tenant._id,
            categoryId,
            sku: item.sku,
            name: item.name,
            description: item.description,
            imageUrl: '',
            basePrice: item.basePrice,
            isAvailable: true,
            preparationTimeMinutes: item.preparationTimeMinutes,
            tags: item.tags,
            modifierGroups: [],
            ingredients: [],
            sortOrder: item.sortOrder,
          });
        }
      }

      const tableCount = input.tableCount;
      for (let n = 1; n <= tableCount; n++) {
        const table = await Table.create({
          tenantId: tenant._id,
          number: n,
          label: `Mesa ${n}`,
          zone: n <= 2 ? 'Salón' : 'Terraza',
          capacity: n <= 2 ? 4 : 6,
          status: 'available',
          qrCodeUrl: '',
        });
        table.qrCodeUrl = `${clientWebUrl}/menu?table=${table._id}&tenant=${slug}`;
        await table.save();
        if (n === 1) firstTableId = table._id.toString();
      }

      const payload = {
        sub: user._id.toString(),
        tenantId: tenant._id.toString(),
        role: user.role,
      };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      user.refreshTokens.push({ token: refreshToken, expiresAt, device: 'onboarding' });
      await user.save();

      console.log(`[Onboarding] Tenant creado: ${slug} (${tenant._id}) plan=${plan}${checkoutRequired ? ` (checkout pendiente: ${requestedPlan})` : ''}`);

      const adminUrl = `${adminBase.replace(/\/$/, '')}/`;
      const clientMenu = firstTableId
        ? `${clientWebUrl}/menu?table=${firstTableId}&tenant=${slug}`
        : `${clientWebUrl}/menu?tenant=${slug}`;
      const loginUrl = `${adminBase.replace(/\/$/, '')}/login`;

      const welcomeEmail = await EmailService.sendWelcomeOnboarding({
        to: user.email,
        adminName: user.name,
        restaurantName: tenant.name,
        slug: tenant.slug,
        plan,
        adminUrl,
        menuUrl: clientMenu,
      });

      return {
        tenant: {
          id: tenant._id.toString(),
          slug: tenant.slug,
          name: tenant.name,
          plan,
        },
        billing: checkoutRequired
          ? {
              requestedPlan,
              checkoutRequired: true,
              checkoutPlan: requestedPlan,
            }
          : { requestedPlan, checkoutRequired: false },
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: tenant._id.toString(),
        },
        tokens: { accessToken, refreshToken },
        welcomeEmail,
        urls: {
          admin: adminUrl,
          clientMenu,
          connectMeta: `${adminBase.replace(/\/$/, '')}/connect-meta`,
          login: loginUrl,
        },
      };
    } catch (err) {
      await User.deleteMany({ tenantId: tenant._id });
      await MenuItem.deleteMany({ tenantId: tenant._id });
      await MenuCategory.deleteMany({ tenantId: tenant._id });
      await Table.deleteMany({ tenantId: tenant._id });
      await Tenant.findByIdAndDelete(tenant._id);
      if (err instanceof AppError) throw err;
      if ((err as { code?: number }).code === 11000) {
        throw new AppError('El email ya está registrado en este restaurante', 409);
      }
      throw err;
    }
  }
}
