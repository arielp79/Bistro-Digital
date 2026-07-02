import { connectDatabase, disconnectDatabase } from '../config/database.js';
import mongoose from 'mongoose';
import { AuthService } from '../modules/auth/auth.service.js';
import { User } from '../modules/auth/user.model.js';
import { MenuCategory } from '../modules/menu/category.model.js';
import { MenuItem } from '../modules/menu/menu-item.model.js';
import { Table } from '../modules/tables/table.model.js';
import { Ingredient } from '../modules/stock/ingredient.model.js';
import { Tenant } from '../modules/tenant/tenant.model.js';

const DEMO_TENANT = {
  slug: 'bistro-digital',
  name: 'Bistró Digital',
  domain: 'bistro-digital.local',
  plan: 'pro' as const,
  config: {
    branding: {
      logoUrl: '',
      primaryColor: '#1A1A2E',
      accentColor: '#E8C468',
      fontFamily: 'Inter, system-ui, sans-serif',
      theme: 'light' as const,
    },
    languages: ['es', 'en', 'pt'],
    defaultLanguage: 'es',
    currency: 'ARS' as const,
    timezone: 'America/Argentina/Buenos_Aires',
    paymentMethods: {
      cash: true,
      transfer: true,
      mercadopago: true,
      stripe: false,
    },
    location: {
      lat: -34.6037,
      lng: -58.3816,
      address: 'Av. Corrientes 1234, CABA',
    },
    deliveryZones: [
      { maxKm: 3, fee: 500 },
      { maxKm: 7, fee: 900 },
    ],
    deliveryFeeOutOfZone: 1500,
    afip: { enabled: false, cuit: '', pointOfSale: 1, certificate: '', privateKey: '' },
    whatsapp: { webhookToken: 'bistro-dev-verify', phoneNumberId: '', accessToken: '' },
    instagram: { pageId: '', accessToken: '' },
    mercadopago: { accessToken: '' },
  },
};

const DEMO_USERS = [
  { email: 'admin@bistro-digital.app', password: 'admin123', role: 'admin' as const, name: 'Admin Demo' },
  { email: 'mozo@bistro-digital.app', password: 'mozo123', role: 'waiter' as const, name: 'Mozo Demo' },
  { email: 'cocina@bistro-digital.app', password: 'cocina123', role: 'kitchen' as const, name: 'Cocina Demo' },
  { email: 'caja@bistro-digital.app', password: 'caja123', role: 'cashier' as const, name: 'Caja Demo' },
];

const PLATFORM_ADMIN = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@saas-base.com',
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? 'platform123',
  name: 'Super Admin Plataforma',
};

const DEMO_CATEGORIES = [
  {
    key: 'entradas',
    name: { es: 'Entradas', en: 'Starters', pt: 'Entradas' },
    sortOrder: 1,
  },
  {
    key: 'principales',
    name: { es: 'Platos principales', en: 'Main courses', pt: 'Pratos principais' },
    sortOrder: 2,
  },
  {
    key: 'bebidas',
    name: { es: 'Bebidas', en: 'Drinks', pt: 'Bebidas' },
    sortOrder: 3,
  },
  {
    key: 'postres',
    name: { es: 'Postres', en: 'Desserts', pt: 'Sobremesas' },
    sortOrder: 4,
  },
];

const DEMO_MENU_ITEMS = [
  {
    categoryKey: 'entradas',
    sku: 'ENT-001',
    name: { es: 'Bruschetta clásica', en: 'Classic bruschetta', pt: 'Bruschetta clássica' },
    description: {
      es: 'Pan tostado con tomate, albahaca y aceite de oliva',
      en: 'Toasted bread with tomato, basil and olive oil',
      pt: 'Pão torrado com tomate, manjericão e azeite',
    },
    basePrice: 4500,
    preparationTimeMinutes: 10,
    tags: ['vegetariano'],
    sortOrder: 1,
  },
  {
    categoryKey: 'entradas',
    sku: 'ENT-002',
    name: { es: 'Empanadas de carne (3u)', en: 'Beef empanadas (3)', pt: 'Empanadas de carne (3)' },
    description: {
      es: 'Empanadas caseras horneadas con chimichurri',
      en: 'Homemade baked empanadas with chimichurri',
      pt: 'Empanadas caseiras assadas com chimichurri',
    },
    basePrice: 5200,
    preparationTimeMinutes: 12,
    tags: [],
    sortOrder: 2,
  },
  {
    categoryKey: 'principales',
    sku: 'PP-001',
    name: { es: 'Bife de chorizo', en: 'Sirloin steak', pt: 'Contrafilé' },
    description: {
      es: 'Corte premium a la parrilla con papas rústicas',
      en: 'Premium grilled cut with rustic potatoes',
      pt: 'Corte premium grelhado com batatas rústicas',
    },
    basePrice: 18500,
    preparationTimeMinutes: 25,
    tags: [],
    modifierGroups: [
      {
        name: { es: 'Punto de cocción', en: 'Doneness', pt: 'Ponto da carne' },
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: { es: 'Jugoso', en: 'Medium rare', pt: 'Mal passado' }, priceAdjustment: 0 },
          { name: { es: 'A punto', en: 'Medium', pt: 'Ao ponto' }, priceAdjustment: 0 },
          { name: { es: 'Cocido', en: 'Well done', pt: 'Bem passado' }, priceAdjustment: 0 },
        ],
      },
    ],
    sortOrder: 1,
  },
  {
    categoryKey: 'principales',
    sku: 'PP-002',
    name: { es: 'Risotto de hongos', en: 'Mushroom risotto', pt: 'Risoto de cogumelos' },
    description: {
      es: 'Arroz carnaroli con hongos de estación y parmesano',
      en: 'Carnaroli rice with seasonal mushrooms and parmesan',
      pt: 'Arroz carnaroli com cogumelos da estação e parmesão',
    },
    basePrice: 12800,
    preparationTimeMinutes: 20,
    tags: ['vegetariano', 'sin-gluten'],
    sortOrder: 2,
  },
  {
    categoryKey: 'bebidas',
    sku: 'BEB-001',
    name: { es: 'Limonada fresca', en: 'Fresh lemonade', pt: 'Limonada fresca' },
    description: {
      es: 'Limonada natural con menta',
      en: 'Natural lemonade with mint',
      pt: 'Limonada natural com hortelã',
    },
    basePrice: 3200,
    preparationTimeMinutes: 5,
    tags: ['sin-alcohol'],
    sortOrder: 1,
  },
  {
    categoryKey: 'bebidas',
    sku: 'BEB-002',
    name: { es: 'Vino Malbec copa', en: 'Malbec wine glass', pt: 'Taça de Malbec' },
    description: {
      es: 'Malbec de bodega seleccionada',
      en: 'Selected winery Malbec',
      pt: 'Malbec de vinícola selecionada',
    },
    basePrice: 4800,
    preparationTimeMinutes: 2,
    tags: [],
    sortOrder: 2,
  },
  {
    categoryKey: 'postres',
    sku: 'POS-001',
    name: { es: 'Flan casero', en: 'Homemade flan', pt: 'Pudim caseiro' },
    description: {
      es: 'Flan con dulce de leche y crema',
      en: 'Flan with dulce de leche and cream',
      pt: 'Pudim com doce de leite e creme',
    },
    basePrice: 4200,
    preparationTimeMinutes: 5,
    tags: [],
    sortOrder: 1,
  },
  {
    categoryKey: 'postres',
    sku: 'POS-002',
    name: { es: 'Brownie con helado', en: 'Brownie with ice cream', pt: 'Brownie com sorvete' },
    description: {
      es: 'Brownie tibio con helado de vainilla',
      en: 'Warm brownie with vanilla ice cream',
      pt: 'Brownie quente com sorvete de baunilha',
    },
    basePrice: 5500,
    preparationTimeMinutes: 8,
    tags: [],
    sortOrder: 2,
  },
];

/** Recetas demo: ítem SKU → ingredientes por porción */
const DEMO_RECIPES: Record<
  string,
  Array<{ ingredientName: string; quantity: number; unit: 'g' | 'ml' | 'unit' }>
> = {
  'ENT-001': [
    { ingredientName: 'Tomate', quantity: 150, unit: 'g' },
    { ingredientName: 'Aceite de oliva', quantity: 30, unit: 'ml' },
  ],
  'ENT-002': [
    { ingredientName: 'Harina 000', quantity: 200, unit: 'g' },
    { ingredientName: 'Carne vacuna', quantity: 180, unit: 'g' },
  ],
  'PP-001': [{ ingredientName: 'Carne vacuna', quantity: 350, unit: 'g' }],
  'PP-002': [
    { ingredientName: 'Aceite de oliva', quantity: 40, unit: 'ml' },
    { ingredientName: 'Queso mozzarella', quantity: 80, unit: 'g' },
  ],
};

async function seedRecipes(
  tenantId: mongoose.Types.ObjectId,
  ingredientByName: Map<string, string>
): Promise<void> {
  for (const [sku, recipe] of Object.entries(DEMO_RECIPES)) {
    const ingredients = recipe
      .map((r) => {
        const ingredientId = ingredientByName.get(r.ingredientName);
        if (!ingredientId) return null;
        return {
          ingredientId: new mongoose.Types.ObjectId(ingredientId),
          quantity: r.quantity,
          unit: r.unit,
        };
      })
      .filter((i) => i !== null);

    const updated = await MenuItem.updateOne(
      { tenantId, sku, deletedAt: null },
      { $set: { ingredients } }
    );
    if (updated.modifiedCount > 0) {
      console.log(`[Seed] Receta actualizada: ${sku}`);
    }
  }
}

async function seed(): Promise<void> {
  await connectDatabase();

  let tenant = await Tenant.findOne({ slug: DEMO_TENANT.slug });
  if (!tenant) {
    tenant = await Tenant.create(DEMO_TENANT);
    console.log(`[Seed] Tenant creado: ${tenant.name} (${tenant._id})`);
  } else {
    console.log(`[Seed] Tenant existente: ${tenant.name} (${tenant._id})`);
  }

  const tenantId = tenant._id;

  for (const demoUser of DEMO_USERS) {
    const exists = await User.findOne({ tenantId, email: demoUser.email });
    if (exists) {
      console.log(`[Seed] Usuario existente: ${demoUser.email}`);
      continue;
    }

    const passwordHash = await AuthService.hashPassword(demoUser.password);
    await User.create({
      tenantId,
      email: demoUser.email,
      passwordHash,
      role: demoUser.role,
      name: demoUser.name,
      phone: '',
      isActive: true,
    });
    console.log(`[Seed] Usuario creado: ${demoUser.email} / ${demoUser.password}`);
  }

  const platformExists = await User.findOne({ email: PLATFORM_ADMIN.email, role: 'platform_admin' });
  if (!platformExists) {
    const passwordHash = await AuthService.hashPassword(PLATFORM_ADMIN.password);
    await User.create({
      tenantId: null,
      email: PLATFORM_ADMIN.email,
      passwordHash,
      role: 'platform_admin',
      name: PLATFORM_ADMIN.name,
      phone: '',
      isActive: true,
    });
    console.log(`[Seed] Super-admin creado: ${PLATFORM_ADMIN.email} / ${PLATFORM_ADMIN.password}`);
  } else {
    console.log(`[Seed] Super-admin existente: ${PLATFORM_ADMIN.email}`);
  }

  const categoryMap = new Map<string, string>();

  for (const cat of DEMO_CATEGORIES) {
    let category = await MenuCategory.findOne({ tenantId, 'name.es': cat.name.es, deletedAt: null });
    if (!category) {
      category = await MenuCategory.create({
        tenantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      });
      console.log(`[Seed] Categoría creada: ${cat.name.es}`);
    } else {
      console.log(`[Seed] Categoría existente: ${cat.name.es}`);
    }
    categoryMap.set(cat.key, category._id.toString());
  }

  for (const item of DEMO_MENU_ITEMS) {
    const exists = await MenuItem.findOne({ tenantId, sku: item.sku, deletedAt: null });
    if (exists) {
      console.log(`[Seed] Ítem existente: ${item.sku}`);
      continue;
    }

    const categoryId = categoryMap.get(item.categoryKey);
    if (!categoryId) continue;

    await MenuItem.create({
      tenantId,
      categoryId,
      sku: item.sku,
      name: item.name,
      description: item.description,
      imageUrl: '',
      basePrice: item.basePrice,
      isAvailable: true,
      preparationTimeMinutes: item.preparationTimeMinutes,
      tags: item.tags,
      modifierGroups: item.modifierGroups ?? [],
      ingredients: [],
      sortOrder: item.sortOrder,
    });
    console.log(`[Seed] Ítem creado: ${item.name.es}`);
  }

  const DEMO_TABLES = [
    { number: 1, label: 'Mesa 1', zone: 'Salón', capacity: 4 },
    { number: 2, label: 'Mesa 2', zone: 'Salón', capacity: 4 },
    { number: 3, label: 'Mesa 3', zone: 'Terraza', capacity: 6 },
    { number: 4, label: 'Barra 1', zone: 'Barra', capacity: 2 },
    { number: 5, label: 'Mesa 5', zone: 'Salón', capacity: 4 },
  ];

  let demoTableId: string | null = null;

  for (const tableData of DEMO_TABLES) {
    let table = await Table.findOne({ tenantId, number: tableData.number, deletedAt: null });
    if (!table) {
      table = await Table.create({
        tenantId,
        ...tableData,
        status: 'available',
        qrCodeUrl: `/menu?table=TABLE_ID&tenant=${tenant.slug}`,
      });
      table.qrCodeUrl = `/menu?table=${table._id}&tenant=${tenant.slug}`;
      await table.save();
      console.log(`[Seed] Mesa creada: ${table.label} (${table._id})`);
    } else {
      console.log(`[Seed] Mesa existente: ${table.label} (${table._id})`);
    }
    if (tableData.number === 1) demoTableId = table._id.toString();
  }

  const DEMO_INGREDIENTS = [
    { name: 'Carne vacuna', unit: 'kg' as const, currentStock: 25, minimumStock: 10, costPerUnit: 4500, supplier: 'Carnicería Central' },
    { name: 'Tomate', unit: 'kg' as const, currentStock: 8, minimumStock: 5, costPerUnit: 800, supplier: 'Verdulería Sur' },
    { name: 'Harina 000', unit: 'kg' as const, currentStock: 15, minimumStock: 5, costPerUnit: 600, supplier: 'Distribuidora Norte' },
    { name: 'Aceite de oliva', unit: 'l' as const, currentStock: 3, minimumStock: 4, costPerUnit: 3200, supplier: 'Gourmet SA' },
    { name: 'Queso mozzarella', unit: 'kg' as const, currentStock: 6, minimumStock: 3, costPerUnit: 2800, supplier: 'Lácteos del Valle' },
  ];

  const ingredientByName = new Map<string, string>();

  for (const ing of DEMO_INGREDIENTS) {
    let existing = await Ingredient.findOne({ tenantId, name: ing.name, deletedAt: null });
    if (!existing) {
      existing = await Ingredient.create({ tenantId, ...ing, lastRestockedAt: new Date() });
      console.log(`[Seed] Ingrediente creado: ${ing.name}`);
    } else {
      console.log(`[Seed] Ingrediente existente: ${ing.name}`);
    }
    ingredientByName.set(ing.name, existing._id.toString());
  }

  await seedRecipes(tenantId, ingredientByName);

  console.log('\n[Seed] Completado.');
  console.log(`  Tenant slug: ${tenant.slug}`);
  console.log(`  Tenant ID:   ${tenantId}`);
  console.log('  Header:      X-Tenant-ID: bistro-digital');
  console.log('  Menú:        GET /api/v1/menu?lang=es');
  console.log(`  Super-admin: ${PLATFORM_ADMIN.email} / ${PLATFORM_ADMIN.password} → /platform/login`);
  if (demoTableId) {
    console.log(`  QR demo:     http://localhost:5173/menu?table=${demoTableId}&tenant=bistro-digital\n`);
  }

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
