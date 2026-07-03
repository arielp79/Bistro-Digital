export type UserRole = 'admin' | 'waiter' | 'kitchen' | 'cashier' | 'platform_admin';

export type TenantPlan = 'starter' | 'pro' | 'enterprise';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'paid';

export type OrderType = 'dine-in' | 'delivery' | 'takeaway';

export type OrderSource = 'qr' | 'waiter' | 'whatsapp' | 'instagram' | 'manual';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export type PaymentMethod = 'cash' | 'transfer' | 'mercadopago' | 'stripe';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface TenantBranding {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  theme: 'light' | 'dark';
}

export interface TenantConfigPublic {
  slug: string;
  name: string;
  branding: TenantBranding;
  languages: string[];
  defaultLanguage: string;
  currency: 'ARS' | 'USD' | 'BRL';
  timezone: string;
  paymentMethods: {
    cash: boolean;
    transfer: boolean;
    mercadopago: boolean;
    stripe: boolean;
  };
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  impersonatedBy?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string | null;
  };
  tokens: AuthTokens;
}

export interface ImpersonationInfo {
  auditLogId: string;
  platformAdminId: string;
  platformAdminEmail: string;
  tenantSlug: string;
  tenantName: string;
}

export interface ImpersonationAuditLog {
  id: string;
  platformAdminId: string;
  platformAdminEmail: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  targetAdminId: string;
  targetAdminEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

export interface ImpersonateResponse extends LoginResponse {
  tenant: { slug: string; name: string };
  impersonation: ImpersonationInfo;
}

export interface PlatformTenantSummary {
  id: string;
  slug: string;
  name: string;
  plan: TenantPlan;
  isActive: boolean;
  createdAt: string;
  stats: {
    users: number;
    orders: number;
    revenueThisMonth: number;
  };
}

export interface PlatformMetrics {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    byPlan: Record<TenantPlan, number>;
  };
  orders: {
    total: number;
    paidThisMonth: number;
    revenueThisMonth: number;
  };
  users: {
    total: number;
  };
}

export interface PlatformE2eCleanupResult {
  deletedTenants: number;
  deletedSlugs: string[];
}

export interface PlatformTenantSoftDeleteResult {
  id: string;
  slug: string;
  deletedAt: string;
}

export interface PlatformTenantAdminUser {
  id: string;
  email: string;
  name: string;
  lastLogin: string | null;
}

export interface PlatformTenantDetail extends PlatformTenantSummary {
  domain: string;
  updatedAt: string;
  metaStatus: MetaIntegrationStatus;
  integrations: {
    mercadopagoConfigured: boolean;
    afipEnabled: boolean;
    afipConfigured: boolean;
  };
  admins: PlatformTenantAdminUser[];
  stats: PlatformTenantSummary['stats'] & {
    menuItems: number;
    tables: number;
    deliverySessions: number;
    ordersByStatus: Record<string, number>;
    ordersBySource: Record<string, number>;
  };
  urls: {
    clientBase: string;
    adminLogin: string;
  };
}

export type SupportedLang = 'es' | 'en' | 'pt';

export interface LocalizedText {
  es: string;
  en: string;
  pt: string;
}

export interface MenuModifierOption {
  optionId: string;
  name: LocalizedText;
  priceAdjustment: number;
}

export interface MenuModifierGroup {
  groupId: string;
  name: LocalizedText;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: MenuModifierOption[];
}

export interface MenuCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItemPublic {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  isAvailable: boolean;
  preparationTimeMinutes: number;
  tags: string[];
  modifierGroups: Array<{
    groupId: string;
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      optionId: string;
      name: string;
      priceAdjustment: number;
    }>;
  }>;
  sortOrder: number;
}

export interface MenuCategoryWithItems {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemPublic[];
}

export interface MenuResponse {
  lang: SupportedLang;
  currency: 'ARS' | 'USD' | 'BRL';
  categories: MenuCategoryWithItems[];
}

export interface MenuItemAdmin extends Omit<MenuItemPublic, 'name' | 'description' | 'modifierGroups'> {
  name: LocalizedText;
  description: LocalizedText;
  modifierGroups: MenuModifierGroup[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export interface CartLineItem {
  lineId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  notes: string;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  selectedModifiers?: Array<{ groupId: string; optionId: string }>;
  notes?: string;
}

export interface CreateOrderInput {
  type: OrderType;
  source: OrderSource;
  tableId?: string;
  items: CreateOrderItemInput[];
  tip?: number;
  deliveryFee?: number;
  paymentMethod: PaymentMethod;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
}

export interface OrderItemSnapshot {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedModifiers: Array<{
    groupName: string;
    optionName: string;
    priceAdjustment: number;
  }>;
  notes: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
}

export interface OrderPublic {
  id: string;
  orderNumber: string;
  type: OrderType;
  source: OrderSource;
  status: OrderStatus;
  tableId: string | null;
  tableLabel: string | null;
  items: OrderItemSnapshot[];
  subtotal: number;
  discounts: number;
  tip: number;
  deliveryFee: number;
  total: number;
  payment: {
    method: PaymentMethod | null;
    status: 'pending' | 'verified' | 'failed';
  };
  createdAt: string;
}

export interface OrderStatusResponse {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  items: Array<{ name: string; quantity: number; status: string }>;
  payment: {
    method: PaymentMethod | null;
    status: 'pending' | 'verified' | 'failed';
  };
  deliveryFee: number;
  customerAddress: string | null;
  updatedAt: string;
}

export interface MercadoPagoPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
}

export { validateModifiers } from './modifiers.js';
export type { ModifierSelection, ModifierGroupLike } from './modifiers.js';

export interface SalesAnalytics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    byDay: Array<{ date: string; amount: number }>;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    averageTicket: number;
    bySource: Record<string, number>;
  };
  topItems: Array<{ menuItemId: string; name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'unit' | 'kg' | 'l';
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  supplier: string;
  isLowStock: boolean;
}

export type StockMovementType = 'restock' | 'consumption' | 'adjustment' | 'waste';

export interface StockMovementPublic {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: StockMovementType;
  quantity: number;
  relatedOrderId: string | null;
  notes: string;
  createdAt: string;
}

export interface StockLowAlert {
  ingredientId: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: Ingredient['unit'];
}

export interface DeliverySessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DeliverySessionPublic {
  id: string;
  platform: 'whatsapp' | 'instagram' | 'simulate';
  customerPhone: string;
  state: DeliverySessionState;
  conversationHistory: DeliverySessionMessage[];
  currentOrderDraft: {
    items: Array<{ menuItemId: string; quantity: number; notes: string }>;
    customerName: string;
    customerAddress: string;
    deliveryFee: number;
    shippingDistanceKm: number;
    paymentMethod: string;
  } | null;
  orderId: string | null;
  updatedAt: string;
}

export interface DeliveryQueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface DeliveryFailedJobPublic {
  id: string;
  platform: string;
  from: string;
  messagePreview: string | null;
  failedReason: string;
  attemptsMade: number;
  finishedAt: string;
}

export interface DeliveryRecentJobPublic {
  id: string;
  platform: string;
  status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  durationMs: number | null;
  finishedAt: string | null;
  messagePreview: string | null;
}

export interface DeliveryOpsSnapshot {
  redisAvailable: boolean;
  workerRunning: boolean;
  counts: DeliveryQueueCounts;
  latencyMs: {
    avg: number | null;
    p95: number | null;
    sampleSize: number;
  };
  failedJobs: DeliveryFailedJobPublic[];
  recentJobs: DeliveryRecentJobPublic[];
  lastUpdated: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  lastLogin: string | null;
}

export type InvoiceType = 'B' | 'C';

export type InvoiceMode = 'production' | 'homologacion' | 'demo';

export interface OrderBillingPublic {
  invoiceType: InvoiceType;
  cae: string;
  caeExpiry: string;
  voucherNumber: number;
  pointOfSale: number;
  pdfUrl: string;
  mode: InvoiceMode;
  issuedAt: string;
}

export interface InvoicePublic {
  orderId: string;
  orderNumber: string;
  invoiceType: InvoiceType;
  cae: string;
  caeExpiry: string;
  voucherNumber: number;
  pointOfSale: number;
  mode: InvoiceMode;
  pdfUrl: string;
}

export interface BillableOrderPublic {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paidAt: string | null;
  billing: OrderBillingPublic | null;
}

export interface TenantDomainSettings {
  domain: string;
  defaultSubdomain: string;
  isCustomDomain: boolean;
  clientUrl: string;
  dnsCnameTarget: string | null;
}

export interface TenantResolveResponse {
  slug: string;
  config: TenantConfigPublic;
}

export interface TenantConfigUpdate {
  name?: string;
  domain?: string;
  branding?: Partial<TenantBranding>;
  defaultLanguage?: string;
  paymentMethods?: Partial<TenantConfigPublic['paymentMethods']>;
  integrations?: {
    mercadopagoAccessToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappAccessToken?: string;
    whatsappWebhookToken?: string;
    instagramPageId?: string;
    instagramAccessToken?: string;
  };
  afip?: {
    enabled?: boolean;
    cuit?: string;
    pointOfSale?: number;
    certificate?: string;
    privateKey?: string;
  };
}

export interface TenantWebhookInfo {
  whatsappUrl: string;
  instagramUrl: string;
  metaVerifyToken: string;
  publicApiUrl: string;
  tunnelRequired: boolean;
  signatureVerification: boolean;
}

export interface MetaIntegrationStatus {
  metaAppReady: boolean;
  whatsappConnected: boolean;
  instagramConnected: boolean;
  deliveryReady: boolean;
}

export interface SaasBillingStatus {
  plan: TenantPlan;
  stripeConfigured: boolean;
  subscriptionStatus: string | null;
  subscriptionActive: boolean;
  canCheckout: boolean;
  canManagePortal: boolean;
  publishableKey: string | null;
}

export interface StripeCheckoutSession {
  url: string;
  sessionId: string;
}

export interface TenantAdminSettings extends TenantConfigPublic {
  plan: TenantPlan;
  saasBilling: SaasBillingStatus;
  domainSettings: TenantDomainSettings;
  integrations: {
    mercadopagoConfigured: boolean;
    whatsappConfigured: boolean;
    whatsappPhoneNumberId: string;
    whatsappWebhookToken: string;
    instagramConfigured: boolean;
    instagramPageId: string;
  };
  webhooks: TenantWebhookInfo;
  metaStatus: MetaIntegrationStatus;
  afip: {
    enabled: boolean;
    cuit: string;
    pointOfSale: number;
    certificateConfigured: boolean;
    privateKeyConfigured: boolean;
  };
  pilotStatus: PilotReadinessStatus;
}

/** Estado de preparación para cliente piloto (Meta + AFIP + infra). */
export interface PilotReadinessStatus {
  overallPercent: number;
  publicApiReady: boolean;
  aiConfigured: boolean;
  aiProvider: 'gemini' | 'openai' | null;
  metaWhatsApp: boolean;
  metaInstagram: boolean;
  afipConfigured: boolean;
  afipEnabled: boolean;
}

export interface AfipTestResult {
  ok: boolean;
  environment: 'homologacion' | 'produccion';
  cuit: string;
  pointOfSale: number;
  lastVoucherB: number;
  message: string;
}

export interface TablePublic {
  id: string;
  number: number;
  label: string;
  zone: string;
  status: TableStatus;
  capacity: number;
  currentOrderId: string | null;
  qrCodeUrl: string;
}

export type DeliverySessionState =
  | 'greeting'
  | 'collecting_items'
  | 'collecting_address'
  | 'confirming'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled';

export interface DeliveryIntentItem {
  menuItemId: string;
  quantity: number;
  modifiers: string[];
  notes: string;
}

export interface DeliveryIntent {
  intent:
    | 'new_order'
    | 'add_item'
    | 'remove_item'
    | 'modify_order'
    | 'check_status'
    | 'cancel'
    | 'confirm_payment'
    | 'other';
  items: DeliveryIntentItem[];
  customerInfo: { name: string | null; address: string | null; phone: string | null };
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
  responseToCustomer: string;
}

export interface ShippingCalculation {
  distanceKm: number;
  fee: number | null;
  estimatedMinutes: number;
  isDeliverable: boolean;
  calculationMethod: 'haversine' | 'google_maps';
}

export interface WhatsAppTestResult {
  ok: boolean;
  mode: 'live' | 'dev';
  messageId?: string;
  error?: string;
}

export interface InstagramTestResult {
  ok: boolean;
  mode: 'live' | 'dev';
  error?: string;
}

export interface VoucherValidationResult {
  isValid: boolean;
  detectedAmount: number | null;
  amountMatches: boolean;
  destinationMatches: boolean;
  dateIsRecent: boolean;
  suspectedFraud: boolean;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  autoApproved?: boolean;
}

export interface SlugAvailability {
  available: boolean;
  slug: string;
  reason?: string;
}

export interface OnboardingPlanOption {
  id: TenantPlan;
  name: string;
  description: string;
  priceLabel: string;
  features: string[];
  recommended?: boolean;
  billing?: {
    requiresPayment: boolean;
    checkoutAvailable: boolean;
  };
}

export interface OnboardingWelcomeEmailStatus {
  sent: boolean;
  mode: 'console' | 'resend' | 'disabled';
  error?: string;
}

export interface OnboardingRegisterResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: TenantPlan;
  };
  billing: {
    requestedPlan: TenantPlan;
    checkoutRequired: boolean;
    checkoutPlan?: TenantPlan;
  };
  user: LoginResponse['user'];
  tokens: AuthTokens;
  welcomeEmail: OnboardingWelcomeEmailStatus;
  urls: {
    admin: string;
    clientMenu: string;
    connectMeta: string;
    login: string;
  };
}
