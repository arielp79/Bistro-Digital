import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export const tenantIdHeaderSchema = z.object({
  'x-tenant-id': z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

const localizedTextSchema = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
  pt: z.string().min(1),
});

export const menuLangSchema = z.enum(['es', 'en', 'pt']).default('es');

export const createCategorySchema = z.object({
  name: localizedTextSchema,
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

const modifierOptionSchema = z.object({
  optionId: z.string().optional(),
  name: localizedTextSchema,
  priceAdjustment: z.number().default(0),
});

const modifierGroupSchema = z.object({
  groupId: z.string().optional(),
  name: localizedTextSchema,
  required: z.boolean().default(false),
  minSelections: z.number().int().min(0).default(0),
  maxSelections: z.number().int().min(1).default(1),
  options: z.array(modifierOptionSchema).min(1),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1),
  sku: z.string().min(1),
  name: localizedTextSchema,
  description: localizedTextSchema,
  imageUrl: z.string().default(''),
  basePrice: z.number().min(0),
  isAvailable: z.boolean().default(true),
  preparationTimeMinutes: z.number().int().min(0).default(15),
  tags: z.array(z.string()).default([]),
  modifierGroups: z.array(modifierGroupSchema).default([]),
  sortOrder: z.number().int().min(0).default(0),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().min(0),
        unit: z.enum(['g', 'ml', 'unit']),
      })
    )
    .default([]),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().min(0),
        unit: z.enum(['g', 'ml', 'unit']),
      })
    )
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

const selectedModifierSchema = z.object({
  groupId: z.string().min(1),
  optionId: z.string().min(1),
});

export const createOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  selectedModifiers: z.array(selectedModifierSchema).default([]),
  notes: z.string().max(500).default(''),
});

export const createOrderSchema = z.object({
  type: z.enum(['dine-in', 'delivery', 'takeaway']).default('dine-in'),
  source: z.enum(['qr', 'waiter', 'whatsapp', 'instagram', 'manual']).default('qr'),
  tableId: z.string().optional(),
  items: z.array(createOrderItemSchema).min(1, 'El pedido debe tener al menos un ítem'),
  tip: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0).optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'mercadopago', 'stripe']),
  customer: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
    'paid',
  ]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updateTableStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
});

export const createTableSchema = z.object({
  number: z.number().int().min(1),
  label: z.string().min(1),
  zone: z.string().default('Salón'),
  capacity: z.number().int().min(1).default(4),
});

export const updateTableSchema = createTableSchema.partial();

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'waiter', 'kitchen', 'cashier']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'waiter', 'kitchen', 'cashier']),
  phone: z.string().default(''),
});

export const createIngredientSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(['g', 'ml', 'unit', 'kg', 'l']),
  currentStock: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(0),
  costPerUnit: z.number().min(0).default(0),
  supplier: z.string().default(''),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const updateTenantConfigSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z
    .string()
    .min(4, 'Dominio inválido')
    .max(253)
    .refine(
      (value) => {
        const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0] ?? '';
        if (!normalized || normalized === 'localhost') return false;
        if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) return false;
        return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(normalized);
      },
      { message: 'Dominio inválido (ej. menu.mirestaurante.com)' }
    )
    .optional(),
  branding: z
    .object({
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      fontFamily: z.string().optional(),
      theme: z.enum(['light', 'dark']).optional(),
    })
    .optional(),
  defaultLanguage: z.enum(['es', 'en', 'pt']).optional(),
  paymentMethods: z
    .object({
      cash: z.boolean().optional(),
      transfer: z.boolean().optional(),
      mercadopago: z.boolean().optional(),
      stripe: z.boolean().optional(),
    })
    .optional(),
  integrations: z
    .object({
      mercadopagoAccessToken: z.string().optional(),
      whatsappPhoneNumberId: z.string().optional(),
      whatsappAccessToken: z.string().optional(),
      whatsappWebhookToken: z.string().optional(),
      instagramPageId: z.string().optional(),
      instagramAccessToken: z.string().optional(),
    })
    .optional(),
  afip: z
    .object({
      enabled: z.boolean().optional(),
      cuit: z.string().optional(),
      pointOfSale: z.number().int().min(1).max(99999).optional(),
      certificate: z.string().optional(),
      privateKey: z.string().optional(),
    })
    .optional(),
});

export const createInvoiceSchema = z.object({
  invoiceType: z.enum(['B', 'C']).default('B'),
});

export const saasCheckoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise'], {
    errorMap: () => ({ message: 'Plan debe ser pro o enterprise' }),
  }),
});

export const saasConfirmCheckoutSchema = z.object({
  sessionId: z.string().min(1, 'sessionId requerido'),
});

export const simulateDeliverySchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
});

export const testWhatsAppSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1).max(1000).default('Hola, prueba de WhatsApp desde Bistró Digital'),
});

export const testInstagramSchema = z.object({
  recipientId: z.string().min(1, 'ID de destinatario requerido'),
  message: z.string().min(1).max(1000).default('Hola, prueba de Instagram desde Bistró Digital'),
});

export const mercadoPagoPreferenceSchema = z.object({
  orderId: z.string().min(1, 'orderId requerido'),
});

export const createStockMovementSchema = z.object({
  ingredientId: z.string().min(1),
  type: z.enum(['restock', 'consumption', 'adjustment', 'waste']),
  quantity: z.number().refine((n) => n !== 0, 'La cantidad no puede ser cero'),
  notes: z.string().max(500).default(''),
});

export const registerTenantSchema = z.object({
  restaurantName: z.string().min(2, 'Nombre del restaurante requerido').max(80),
  slug: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones')
    .optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1A1A2E'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E8C468'),
  defaultLanguage: z.enum(['es', 'en', 'pt']).default('es'),
  currency: z.enum(['ARS', 'USD', 'BRL']).default('ARS'),
  adminName: z.string().min(2, 'Nombre del administrador requerido'),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  plan: z.enum(['starter', 'pro', 'enterprise']).default('starter'),
  includeStarterMenu: z.boolean().default(true),
  tableCount: z.number().int().min(1).max(20).default(4),
});

export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;