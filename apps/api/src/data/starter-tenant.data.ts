export const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'app',
  'www',
  'mail',
  'support',
  'help',
  'login',
  'register',
  'onboarding',
  'platform',
  'health',
  'static',
  'assets',
]);

export const STARTER_CATEGORIES = [
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
] as const;

export const STARTER_MENU_ITEMS = [
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
    tags: ['vegetariano'] as string[],
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
    tags: [] as string[],
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
    tags: [] as string[],
    sortOrder: 1,
  },
  {
    categoryKey: 'principales',
    sku: 'PP-002',
    name: { es: 'Pizza margarita', en: 'Margherita pizza', pt: 'Pizza margherita' },
    description: {
      es: 'Masa artesanal, salsa de tomate, mozzarella y albahaca',
      en: 'Artisan dough, tomato sauce, mozzarella and basil',
      pt: 'Massa artesanal, molho de tomate, mussarela e manjericão',
    },
    basePrice: 9800,
    preparationTimeMinutes: 20,
    tags: ['vegetariano'] as string[],
    sortOrder: 2,
  },
  {
    categoryKey: 'bebidas',
    sku: 'BEB-001',
    name: { es: 'Agua mineral', en: 'Mineral water', pt: 'Água mineral' },
    description: { es: '500 ml', en: '500 ml', pt: '500 ml' },
    basePrice: 1200,
    preparationTimeMinutes: 1,
    tags: [] as string[],
    sortOrder: 1,
  },
  {
    categoryKey: 'bebidas',
    sku: 'BEB-002',
    name: { es: 'Cerveza artesanal', en: 'Craft beer', pt: 'Cerveja artesanal' },
    description: { es: 'Pinta 473 ml', en: 'Pint 473 ml', pt: 'Pinta 473 ml' },
    basePrice: 3500,
    preparationTimeMinutes: 2,
    tags: [] as string[],
    sortOrder: 2,
  },
] as const;

export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function buildStarterTenantConfig(input: {
  primaryColor: string;
  accentColor: string;
  defaultLanguage: 'es' | 'en' | 'pt';
  currency: 'ARS' | 'USD' | 'BRL';
}) {
  return {
    branding: {
      logoUrl: '',
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      theme: 'light' as const,
    },
    languages: ['es', 'en', 'pt'],
    defaultLanguage: input.defaultLanguage,
    currency: input.currency,
    timezone: 'America/Argentina/Buenos_Aires',
    paymentMethods: {
      cash: true,
      transfer: true,
      mercadopago: false,
      stripe: false,
    },
    location: {
      lat: -34.6037,
      lng: -58.3816,
      address: '',
    },
    deliveryZones: [
      { maxKm: 3, fee: 500 },
      { maxKm: 7, fee: 900 },
    ],
    deliveryFeeOutOfZone: 1500,
    afip: { enabled: false, cuit: '', pointOfSale: 1, certificate: '', privateKey: '' },
    whatsapp: { webhookToken: '', phoneNumberId: '', accessToken: '' },
    instagram: { pageId: '', accessToken: '' },
    mercadopago: { accessToken: '' },
  };
}
