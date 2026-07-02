# PRD: SaaS de Gestión de Restaurantes (Marca Blanca)
**Versión:** 1.0.0
**Fecha:** 2025-06-19
**Estado:** Draft — listo para consumo por agentes de IA (Cursor)
**Entorno de demo:** Bistró Digital

---

## Índice

1. [Visión General y Modelo de Negocio](#1-visión-general-y-modelo-de-negocio)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Modelo de Datos (MongoDB)](#4-modelo-de-datos-mongodb)
5. [Roles y Módulos de Acceso](#5-roles-y-módulos-de-acceso)
6. [Módulo Delivery con IA](#6-módulo-delivery-con-ia)
7. [Integraciones Externas](#7-integraciones-externas)
8. [Seguridad y Multi-tenancy](#8-seguridad-y-multi-tenancy)
9. [Infraestructura y DevOps](#9-infraestructura-y-devops)
10. [Roadmap y Fases de Implementación](#10-roadmap-y-fases-de-implementación)

---

## 1. Visión General y Modelo de Negocio

### 1.1 Descripción

Sistema SaaS multi-inquilino (multi-tenant) para la gestión integral de restaurantes, diseñado bajo el modelo de marca blanca (white-label). Cada tenant opera bajo su propia identidad visual, dominio personalizado y configuración de negocio, mientras comparte la infraestructura subyacente.

### 1.2 Entorno de Demo

| Parámetro | Valor |
|-----------|-------|
| Nombre | Bistró Digital |
| Dominio demo | `bistrо-digital.app` (o subdominio `bistrо-digital.saas-base.com`) |
| Tema visual | Light Mode, minimalista, tipografía sans-serif moderna |
| Paleta base demo | Primary `#1A1A2E`, Accent `#E8C468`, Background `#FAFAFA`, Surface `#FFFFFF` |
| Idioma demo | Español (es-AR) |

### 1.3 Modelo Multi-Tenant

```
SaaS Platform (shared infra)
├── Tenant: Bistró Digital  (demo)
│   ├── config: { logo, colors, menu, lang }
│   └── data: { orders, stock, staff }
├── Tenant: Restaurant B
└── Tenant: Restaurant C
```

**Estrategia de aislamiento de datos:** Shared database + tenant discriminator field (`tenantId`) en cada documento MongoDB. Índices compuestos siempre incluyen `tenantId` como primer campo.

### 1.4 Carga Dinámica de Configuración (White-Label)

Cada tenant tiene un documento `TenantConfig` que se resuelve en bootstrap:

- **Web App (React):** request a `/api/tenant/config` con header `X-Tenant-ID` → inyecta CSS variables y assets dinámicos.
- **Mobile App (Flutter):** llamada al endpoint de config en `AppState` inicial → almacenada en `SharedPreferences` para uso offline.

---

## 2. Stack Tecnológico

### 2.1 Backend

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.x |
| Base de datos | MongoDB | 7.x |
| ODM | Mongoose | 8.x |
| WebSockets | Socket.IO | 4.x |
| Queue / Jobs | BullMQ + Redis | Redis 7.x |
| Caché | Redis | 7.x |
| Auth | JWT + Refresh Tokens | — |
| Storage | S3-compatible (MinIO / AWS S3) | — |

### 2.2 Frontend Web

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Framework | React | 18.x |
| Build tool | Vite | 5.x |
| State management | Zustand | 4.x |
| Routing | React Router | 6.x |
| UI Kit | shadcn/ui + Tailwind CSS | Tailwind 3.x |
| WebSockets | Socket.IO Client | 4.x |
| i18n | i18next + react-i18next | — |
| Charts | Recharts | — |
| QR | qrcode.react | — |

### 2.3 Mobile App (Mozo)

| Capa | Tecnología | Versión mínima |
|------|-----------|----------------|
| Framework | Flutter | 3.x (Dart 3.x) |
| State management | Riverpod | 2.x |
| Caché local | Hive + Isar | — |
| HTTP | Dio | — |
| WebSockets | socket_io_client | — |
| Push notifications | Firebase Cloud Messaging | — |
| Deep links / QR | mobile_scanner | — |

### 2.4 Servicios IA

| Servicio | Proveedor | Uso |
|----------|-----------|-----|
| LLM principal | OpenAI GPT-4o / Anthropic Claude | Extracción de intenciones delivery |
| Visión artificial | OpenAI GPT-4o Vision / Google Vision AI | Validación de comprobantes |
| Embeddings / RAG | OpenAI text-embedding-3-small | Búsqueda semántica en menú |

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Alto Nivel

```
                          ┌─────────────────────────────────┐
                          │         CDN / Reverse Proxy      │
                          │         (Nginx / Cloudflare)     │
                          └────────────┬────────────────────┘
                                       │
           ┌───────────────────────────┼──────────────────────────┐
           │                           │                          │
    ┌──────▼──────┐           ┌────────▼────────┐        ┌───────▼───────┐
    │  React Web  │           │  Flutter Mobile │        │  React Kitchen│
    │  (Cliente   │           │  (Mozo App)     │        │  / Caja App   │
    │   + Admin)  │           │                 │        │               │
    └──────┬──────┘           └────────┬────────┘        └───────┬───────┘
           │  REST + WS                │ REST + WS               │ REST + WS
           └───────────────────────────┼─────────────────────────┘
                                       │
                          ┌────────────▼────────────────────┐
                          │       API Gateway (Express)      │
                          │  /api/v1 — Auth Middleware        │
                          │  Tenant Resolution Middleware     │
                          └───┬──────┬──────┬───────┬────────┘
                              │      │      │       │
                    ┌─────────▼┐  ┌──▼────┐ │  ┌───▼──────────┐
                    │  Orders  │  │ Menu  │ │  │  Auth Service │
                    │  Service │  │Service│ │  └──────────────┘
                    └────┬─────┘  └──────┘ │
                         │                 │
                    ┌────▼─────┐   ┌───────▼──────────┐
                    │ BullMQ   │   │  AI/Webhook       │
                    │  Queue   │   │  Service          │
                    └────┬─────┘   └───────┬──────────┘
                         │                 │
              ┌──────────┴───────┐  ┌──────▼──────────┐
              │   MongoDB Atlas  │  │  Redis (Cache +  │
              │   (Multi-tenant) │  │  BullMQ + WS)   │
              └──────────────────┘  └─────────────────┘
```

### 3.2 Estructura de Repositorio (Monorepo)

```
/
├── apps/
│   ├── api/                    # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── tenant.middleware.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenant/
│   │   │   │   ├── menu/
│   │   │   │   ├── orders/
│   │   │   │   ├── tables/
│   │   │   │   ├── stock/
│   │   │   │   ├── delivery/
│   │   │   │   ├── billing/     # AFIP integration
│   │   │   │   └── analytics/
│   │   │   ├── services/
│   │   │   │   ├── socket.service.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   └── printer.service.ts
│   │   │   └── app.ts
│   │   └── package.json
│   │
│   ├── web-client/             # React — App Cliente (QR)
│   ├── web-kitchen/            # React — Cocina & Caja (Kanban)
│   ├── web-admin/              # React — Panel Administrador
│   └── mobile-waiter/         # Flutter — App Mozo
│
├── packages/
│   ├── shared-types/           # TypeScript types compartidos
│   ├── ui-components/          # React component library base
│   └── validation-schemas/     # Zod schemas compartidos
│
└── infra/
    ├── docker-compose.yml
    ├── k8s/
    └── nginx/
```

### 3.3 Middlewares Globales del API

```typescript
// tenant.middleware.ts
// Resolución del tenant a partir de:
// 1. Header: X-Tenant-ID
// 2. Subdominio: tenant-slug.domain.com
// 3. JWT payload: req.user.tenantId

export const tenantMiddleware = async (req, res, next) => {
  const tenantId = extractTenantId(req); // prioridad: header > subdominio > JWT
  const tenant = await TenantService.findById(tenantId);
  if (!tenant || !tenant.isActive) return res.status(403).json({ error: 'Tenant inválido' });
  req.tenant = tenant;
  next();
};
```

---

## 4. Modelo de Datos (MongoDB)

### 4.1 Convenciones

- Todos los documentos incluyen `tenantId: ObjectId` (índice compuesto con todos los campos de búsqueda frecuente).
- Timestamps automáticos: `createdAt`, `updatedAt`.
- Soft delete: campo `deletedAt: Date | null`.

### 4.2 Colecciones Principales

#### `tenants`
```typescript
{
  _id: ObjectId,
  slug: string,               // "bistro-digital"
  name: string,               // "Bistró Digital"
  domain: string,             // custom domain o subdominio
  isActive: boolean,
  plan: 'starter' | 'pro' | 'enterprise',
  config: {
    branding: {
      logoUrl: string,
      primaryColor: string,   // hex
      accentColor: string,
      fontFamily: string,
      theme: 'light' | 'dark',
    },
    languages: ['es', 'en', 'pt'],
    defaultLanguage: 'es',
    currency: 'ARS' | 'USD' | 'BRL',
    timezone: string,         // "America/Argentina/Buenos_Aires"
    paymentMethods: {
      cash: boolean,
      transfer: boolean,
      mercadopago: boolean,
      stripe: boolean,
    },
    afip: {
      enabled: boolean,
      cuit: string,
      pointOfSale: number,
      certificate: string,    // encrypted
      privateKey: string,     // encrypted
    },
    whatsapp: {
      webhookToken: string,
      phoneNumberId: string,
      accessToken: string,    // encrypted
    },
    instagram: {
      pageId: string,
      accessToken: string,    // encrypted
    }
  },
  createdAt: Date,
  updatedAt: Date,
}
```

#### `users`
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  email: string,
  passwordHash: string,
  role: 'admin' | 'waiter' | 'kitchen' | 'cashier',
  name: string,
  phone: string,
  isActive: boolean,
  lastLogin: Date,
  refreshTokens: [{ token: string, expiresAt: Date, device: string }],
}
// Índice: { tenantId: 1, email: 1 } — unique
```

#### `tables`
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  number: number,
  label: string,              // "Mesa 5", "Barra 2"
  capacity: number,
  zone: string,               // "Salón", "Terraza"
  status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  currentOrderId: ObjectId | null,
  qrCodeUrl: string,          // URL QR generado — apunta a /menu?table=<tableId>&tenant=<slug>
}
```

#### `menu_items`
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  categoryId: ObjectId,
  sku: string,
  name: { es: string, en: string, pt: string },
  description: { es: string, en: string, pt: string },
  imageUrl: string,
  basePrice: number,
  isAvailable: boolean,
  preparationTimeMinutes: number,
  tags: string[],             // ['vegano', 'sin-gluten']
  modifierGroups: [{
    groupId: ObjectId,
    name: { es: string, en: string, pt: string },
    required: boolean,
    minSelections: number,
    maxSelections: number,
    options: [{
      optionId: ObjectId,
      name: { es: string, en: string, pt: string },
      priceAdjustment: number,
    }]
  }],
  ingredients: [{
    ingredientId: ObjectId,
    quantity: number,
    unit: 'g' | 'ml' | 'unit',
  }],
  sortOrder: number,
}
```

#### `orders`
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  orderNumber: string,        // "B-0042" (prefijo por tenant)
  type: 'dine-in' | 'delivery' | 'takeaway',
  source: 'qr' | 'waiter' | 'whatsapp' | 'instagram' | 'manual',
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'paid',
  tableId: ObjectId | null,
  waiterId: ObjectId | null,
  customer: {
    name: string,
    phone: string,
    address: string | null,   // solo delivery
    coords: { lat: number, lng: number } | null,
  },
  items: [{
    menuItemId: ObjectId,
    name: string,             // snapshot al momento del pedido
    quantity: number,
    unitPrice: number,
    selectedModifiers: [{
      groupName: string,
      optionName: string,
      priceAdjustment: number,
    }],
    notes: string,
    status: 'pending' | 'preparing' | 'ready' | 'delivered',
  }],
  subtotal: number,
  discounts: number,
  tip: number,
  deliveryFee: number,
  total: number,
  payment: {
    method: 'cash' | 'transfer' | 'mercadopago' | 'stripe' | null,
    status: 'pending' | 'verified' | 'failed',
    transactionId: string | null,
    voucherImageUrl: string | null, // comprobante de transferencia
    voucherVerifiedByAI: boolean,
    voucherVerifiedAt: Date | null,
  },
  billing: {
    invoiceType: 'A' | 'B' | 'C' | 'X' | null,
    cae: string | null,
    caeExpiry: Date | null,
    pdfUrl: string | null,
  },
  deliveryRoute: {
    estimatedMinutes: number | null,
    calculationMethod: 'haversine' | 'google_maps' | null,
    distanceKm: number | null,
  },
  aiContext: {
    rawMessage: string | null,     // mensaje original del usuario (delivery IA)
    parsedIntent: object | null,   // JSON parseado por LLM
    model: string | null,
  },
  timestamps: {
    createdAt: Date,
    confirmedAt: Date | null,
    preparingAt: Date | null,
    readyAt: Date | null,
    deliveredAt: Date | null,
    paidAt: Date | null,
  }
}
// Índices: { tenantId: 1, status: 1 }, { tenantId: 1, tableId: 1 }, { tenantId: 1, createdAt: -1 }
```

#### `ingredients` (Stock)
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  name: string,
  unit: 'g' | 'ml' | 'unit' | 'kg' | 'l',
  currentStock: number,
  minimumStock: number,       // umbral para alerta
  costPerUnit: number,
  supplier: string,
  lastRestockedAt: Date,
}
```

#### `stock_movements`
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  ingredientId: ObjectId,
  type: 'restock' | 'consumption' | 'adjustment' | 'waste',
  quantity: number,           // positivo = entrada, negativo = salida
  relatedOrderId: ObjectId | null,
  performedBy: ObjectId,
  notes: string,
  createdAt: Date,
}
```

---

## 5. Roles y Módulos de Acceso

### 5.1 Cliente — Web App (acceso vía QR)

**URL:** `https://<tenant-slug>.domain.com/menu?table=<tableId>`
**Auth:** Sin login. Token anónimo de sesión generado al escanear QR.

#### Flujo Principal

```
QR Scan → Resolve Tenant Config → Load Menu (i18n)
       → Select Items + Modifiers → Cart Review
       → Select Payment Method → Place Order
       → Order Tracking (polling / WS)
```

#### Especificaciones Técnicas

**i18n (multi-lenguaje):**
```typescript
// i18n.config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: {...}, en: {...}, pt: {...} },
    fallbackLng: tenant.config.defaultLanguage,
    ns: ['menu', 'checkout', 'common'],
    detection: { order: ['querystring', 'navigator'] }
  });
```

**Selección de modificadores:**
```typescript
// Validación en cliente antes de enviar al carrito
const validateModifiers = (item: MenuItem, selected: SelectedModifier[]): boolean => {
  return item.modifierGroups.every(group => {
    const groupSelected = selected.filter(s => s.groupId === group.groupId);
    if (group.required && groupSelected.length < group.minSelections) return false;
    if (groupSelected.length > group.maxSelections) return false;
    return true;
  });
};
```

**Pasarela de pagos — Cálculo de propina:**
```typescript
interface CheckoutState {
  subtotal: number;
  tipPercentage: 0 | 10 | 15 | 20 | 'custom';
  tipAmount: number;         // calculado
  paymentMethod: 'cash' | 'transfer' | 'mercadopago';
  total: number;
}
// Opciones de propina predefinidas: 0%, 10%, 15%, 20% + input libre
```

**API Endpoints (Cliente):**
```
GET    /api/v1/menu?lang=es                    → Menú completo del tenant
POST   /api/v1/orders                          → Crear pedido
GET    /api/v1/orders/:orderId/status          → Estado del pedido (polling)
POST   /api/v1/orders/:orderId/payment         → Registrar pago
POST   /api/v1/orders/:orderId/voucher         → Subir comprobante de transferencia
GET    /api/v1/payments/mercadopago/preference → Crear preferencia MP
```

---

### 5.2 Mozo — Mobile App (Flutter)

**Auth:** JWT con rol `waiter`. Login con email/password.

#### Arquitectura Offline-First

```dart
// Estrategia: Cache-first con sincronización background

class OrderRepository {
  final OrderLocalDataSource _local;   // Isar DB
  final OrderRemoteDataSource _remote; // API REST
  final ConnectivityService _connectivity;

  // Al recibir un pedido nuevo, persiste local inmediatamente
  // y encola sincronización cuando hay red
  Future<Order> createOrder(CreateOrderDto dto) async {
    final localOrder = await _local.save(dto.toLocalOrder());
    if (await _connectivity.isConnected()) {
      await _remote.createOrder(dto);
    } else {
      _syncQueue.add(SyncTask.createOrder(localOrder));
    }
    return localOrder;
  }
}
```

**Caché local con Isar:**
```dart
@Collection()
class LocalOrder {
  Id id = Isar.autoIncrement;
  late String serverId;       // ObjectId del backend
  late String status;
  late int tableNumber;
  late List<LocalOrderItem> items;
  late DateTime createdAt;
  late bool syncPending;      // true si no sincronizado con backend
}
```

#### Estado de Mesas

```dart
enum TableStatus { available, occupied, reserved, cleaning }

// Widget de cuadrícula de mesas con estado en tiempo real
// Actualización vía Socket.IO: evento 'table:status_changed'
// Fallback: polling cada 30s si WebSocket desconectado
```

#### Notificaciones Push

| Evento | Trigger | Payload |
|--------|---------|---------|
| Nuevo pedido asignado | `order:assigned` | `{ orderId, tableNumber, items[] }` |
| Pedido listo en cocina | `order:ready` | `{ orderId, tableNumber }` |
| Cliente llamó al mozo | `table:call_waiter` | `{ tableId, tableNumber }` |

**API Endpoints (Mozo):**
```
GET    /api/v1/tables                          → Lista de mesas con estado
PATCH  /api/v1/tables/:tableId/status          → Cambiar estado de mesa
GET    /api/v1/orders?status=pending,preparing → Pedidos activos
PATCH  /api/v1/orders/:orderId/items/:itemId   → Actualizar estado de ítem
POST   /api/v1/orders/:orderId/close           → Cerrar mesa / solicitar factura
```

---

### 5.3 Cocina / Caja — Web App (Kanban + Tiempo Real)

**Auth:** JWT con rol `kitchen` o `cashier`.

#### Dashboard Kanban (WebSockets)

**Columnas Kanban:**
```
[Pendiente] → [Confirmado] → [En Preparación] → [Listo] → [Entregado]
```

**Implementación Socket.IO (servidor):**
```typescript
// socket.service.ts
export const setupOrderSocket = (io: Server) => {
  io.on('connection', (socket) => {
    const { tenantId } = socket.handshake.auth;

    socket.join(`tenant:${tenantId}`);         // sala del tenant

    socket.on('order:update_status', async ({ orderId, status }) => {
      await OrderService.updateStatus(orderId, status, tenantId);
      io.to(`tenant:${tenantId}`).emit('order:status_changed', { orderId, status });
      // Trigger descuento de stock si status === 'preparing'
      await StockService.deductByOrder(orderId);
    });
  });
};
```

**Implementación Socket.IO (cliente React):**
```typescript
// useKanbanSocket.ts
const useKanbanSocket = (tenantId: string) => {
  const socket = useRef<Socket>();

  useEffect(() => {
    socket.current = io(WS_URL, { auth: { token: getJWT(), tenantId } });
    socket.current.on('order:status_changed', ({ orderId, status }) => {
      useOrderStore.getState().updateOrderStatus(orderId, status);
    });
    socket.current.on('order:new', (order) => {
      useOrderStore.getState().addOrder(order);
      playNotificationSound();
    });
    return () => socket.current?.disconnect();
  }, [tenantId]);
};
```

#### Integración Impresoras Térmicas

**Protocolo:** ESC/POS vía Node.js en servidor local del restaurante o WebUSB en el navegador.

```typescript
// printer.service.ts
import ThermalPrinter from 'node-thermal-printer';

export class PrinterService {
  static async printOrder(order: Order, printerConfig: PrinterConfig): Promise<void> {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: printerConfig.interface, // 'tcp://192.168.1.x:9100' o 'USB'
    });

    printer.bold(true);
    printer.println(`PEDIDO #${order.orderNumber}`);
    printer.bold(false);
    printer.println(`Mesa: ${order.tableId?.number ?? 'Delivery'}`);
    printer.drawLine();
    order.items.forEach(item => {
      printer.println(`${item.quantity}x ${item.name}`);
      if (item.notes) printer.println(`   → ${item.notes}`);
    });
    printer.drawLine();
    printer.println(`TOTAL: $${order.total.toFixed(2)}`);
    printer.cut();
    await printer.execute();
  }
}
```

**Endpoints:**
```
GET    /api/v1/orders?status=confirmed,preparing,ready → Pedidos en curso
PATCH  /api/v1/orders/:orderId/status                  → Mover en Kanban
POST   /api/v1/orders/:orderId/print                   → Reimprimir ticket
POST   /api/v1/billing/:orderId/invoice                → Emitir factura AFIP
```

---

### 5.4 Administrador — Web App

**Auth:** JWT con rol `admin`.

#### Analíticas de Ventas

**Métricas principales:**
```typescript
interface SalesAnalytics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    byDay: Array<{ date: string; amount: number }>;
  };
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    averageTicket: number;
    bySource: Record<OrderSource, number>;   // qr, whatsapp, etc.
  };
  topItems: Array<{ menuItemId: string; name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
  deliveryMetrics: {
    totalOrders: number;
    averageDeliveryTime: number;
  };
}
```

**Queries MongoDB para analíticas (con aggregation pipeline):**
```javascript
// Revenue por día (últimos 30 días)
db.orders.aggregate([
  { $match: {
    tenantId: ObjectId(tenantId),
    'timestamps.paidAt': { $gte: thirtyDaysAgo },
    status: 'paid'
  }},
  { $group: {
    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamps.paidAt' } },
    revenue: { $sum: '$total' },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

#### Sistema de Stock

**Descuento automático por ingredientes:**
```typescript
// stock.service.ts
export class StockService {
  static async deductByOrder(orderId: string): Promise<StockMovement[]> {
    const order = await Order.findById(orderId).populate('items.menuItemId');
    const movements: StockMovement[] = [];

    for (const item of order.items) {
      const menuItem = item.menuItemId as MenuItem;
      for (const ingredient of menuItem.ingredients) {
        const qty = ingredient.quantity * item.quantity;
        await Ingredient.findByIdAndUpdate(ingredient.ingredientId, {
          $inc: { currentStock: -qty }
        });
        movements.push(await StockMovement.create({
          tenantId: order.tenantId,
          ingredientId: ingredient.ingredientId,
          type: 'consumption',
          quantity: -qty,
          relatedOrderId: order._id,
        }));
        // Alerta si stock bajo mínimo
        await StockService.checkMinimumStock(ingredient.ingredientId);
      }
    }
    return movements;
  }

  static async checkMinimumStock(ingredientId: string): Promise<void> {
    const ingredient = await Ingredient.findById(ingredientId);
    if (ingredient.currentStock <= ingredient.minimumStock) {
      // Emitir evento via Socket.IO al panel admin
      // Enviar notificación push / email al admin
      NotificationService.lowStock(ingredient);
    }
  }
}
```

**Endpoints Admin:**
```
GET    /api/v1/analytics/sales?from=&to=        → Analíticas de ventas
GET    /api/v1/analytics/items/top              → Ítems más vendidos
GET    /api/v1/stock/ingredients                → Lista de ingredientes con stock
POST   /api/v1/stock/ingredients                → Crear ingrediente
PATCH  /api/v1/stock/ingredients/:id            → Editar ingrediente
POST   /api/v1/stock/movements                  → Registrar movimiento manual
GET    /api/v1/stock/alerts                     → Ingredientes bajo mínimo
GET    /api/v1/menu/items                       → CRUD completo de menú
POST   /api/v1/tenant/config                    → Actualizar configuración white-label
GET    /api/v1/users                            → Gestión de usuarios/staff
```

---

## 6. Módulo Delivery con IA

### 6.1 Arquitectura del Módulo

```
WhatsApp Webhook ──┐
                   ├──→ Webhook Controller → Message Queue (BullMQ)
Instagram Webhook ─┘          │
                               ▼
                     AI Processing Worker
                     ├── Intent Extraction (LLM)
                     ├── Order Structuring (LLM)
                     ├── Voucher Validation (Vision AI)
                     └── Shipping Calculation
                               │
                               ▼
                     Order Service → MongoDB → Socket.IO → Kitchen Dashboard
                               │
                               ▼
                     WhatsApp/Instagram Reply API
```

### 6.2 Webhook — Recepción de Mensajes

**Registro de Webhooks:**
```
POST /api/v1/webhooks/whatsapp          → WhatsApp Cloud API webhook
GET  /api/v1/webhooks/whatsapp          → Verificación de token
POST /api/v1/webhooks/instagram         → Instagram Messaging webhook
```

**Controlador de Webhook:**
```typescript
// webhooks/whatsapp.controller.ts
export const whatsappWebhook = async (req: Request, res: Response) => {
  // Responder 200 inmediatamente para evitar timeout de Meta
  res.status(200).json({ status: 'ok' });

  const { entry } = req.body;
  for (const e of entry) {
    for (const change of e.changes) {
      const message = change.value.messages?.[0];
      if (!message) continue;

      await deliveryQueue.add('process_message', {
        platform: 'whatsapp',
        tenantId: req.tenant._id,
        messageId: message.id,
        from: message.from,
        type: message.type,   // 'text' | 'image' | 'interactive'
        text: message.text?.body ?? null,
        imageId: message.image?.id ?? null,
        timestamp: new Date(Number(message.timestamp) * 1000),
      });
    }
  }
};
```

### 6.3 Worker — Procesamiento con IA

```typescript
// workers/delivery.worker.ts
deliveryQueue.process('process_message', async (job) => {
  const { platform, tenantId, from, type, text, imageId } = job.data;
  const tenant = await TenantService.findById(tenantId);
  const session = await DeliverySession.getOrCreate(tenantId, from);

  if (type === 'text' && text) {
    await processTextMessage({ tenant, session, from, text, platform });
  } else if (type === 'image' && imageId) {
    await processVoucherImage({ tenant, session, from, imageId, platform });
  }
});
```

### 6.4 Extracción de Intenciones con LLM

```typescript
// ai.service.ts — Intent extraction
export const extractDeliveryIntent = async (
  message: string,
  menuItems: MenuItem[],
  conversationHistory: Message[],
  lang: string = 'es'
): Promise<DeliveryIntent> => {

  const systemPrompt = `
Eres un asistente de pedidos para el restaurante "${tenant.name}".
Extrae la intención del cliente en formato JSON estricto.
El menú disponible es: ${JSON.stringify(menuItems.map(i => ({ id: i._id, name: i.name[lang], price: i.basePrice })))}

Responde SOLO con JSON válido con este schema:
{
  "intent": "new_order" | "add_item" | "remove_item" | "modify_order" | "check_status" | "cancel" | "confirm_payment" | "other",
  "items": [{ "menuItemId": string, "quantity": number, "modifiers": string[], "notes": string }],
  "customerInfo": { "name": string | null, "address": string | null, "phone": string | null },
  "clarificationNeeded": boolean,
  "clarificationQuestion": string | null,
  "responseToCustomer": string
}
  `.trim();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content) as DeliveryIntent;
};
```

### 6.5 Cálculo de Envío

```typescript
// delivery.service.ts
export const calculateShipping = async (
  tenantId: string,
  customerAddress: string,
  customerCoords?: { lat: number; lng: number }
): Promise<ShippingCalculation> => {
  const tenant = await TenantService.findById(tenantId);
  const restaurantCoords = tenant.config.location;

  // Método 1: Haversine (cálculo local, sin API externa)
  const distanceKm = haversine(restaurantCoords, customerCoords ?? await geocode(customerAddress));

  // Tabla de tarifas configurable por tenant
  const zones = tenant.config.deliveryZones; // [{ maxKm: 3, fee: 500 }, { maxKm: 7, fee: 900 }]
  const zone = zones.find(z => distanceKm <= z.maxKm);
  const fee = zone?.fee ?? tenant.config.deliveryFeeOutOfZone ?? null;

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    fee,
    estimatedMinutes: Math.round(15 + distanceKm * 4), // base + 4 min/km
    isDeliverable: fee !== null,
    calculationMethod: 'haversine',
  };
};
```

### 6.6 Validación de Comprobantes con Vision AI

```typescript
// ai.service.ts — Voucher validation
export const validateTransferVoucher = async (
  imageUrl: string,
  expectedAmount: number,
  tenantCbu: string
): Promise<VoucherValidationResult> => {

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl, detail: 'high' }
        },
        {
          type: 'text',
          text: `
Analiza este comprobante de transferencia bancaria.
Verifica:
1. ¿El monto transferido es aproximadamente $${expectedAmount}? (tolerancia: ±5%)
2. ¿El CBU/CVU/alias destino coincide con: ${tenantCbu}?
3. ¿La fecha del comprobante es de hoy o ayer?
4. ¿Es un comprobante auténtico (no una captura editada)?

Responde SOLO con JSON:
{
  "isValid": boolean,
  "detectedAmount": number | null,
  "amountMatches": boolean,
  "destinationMatches": boolean,
  "dateIsRecent": boolean,
  "suspectedFraud": boolean,
  "confidence": "high" | "medium" | "low",
  "notes": string
}
          `
        }
      ]
    }],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0].message.content) as VoucherValidationResult;

  // Auto-aprobación solo si confidence === 'high' && isValid && !suspectedFraud
  if (result.confidence === 'high' && result.isValid && !result.suspectedFraud) {
    result.autoApproved = true;
  }

  return result;
};
```

### 6.7 Sesión Conversacional de Delivery

```typescript
// delivery_sessions collection en MongoDB
interface DeliverySession {
  _id: ObjectId;
  tenantId: ObjectId;
  platform: 'whatsapp' | 'instagram';
  customerPhone: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentOrderDraft: Partial<CreateOrderDto> | null;
  state: 'greeting' | 'collecting_items' | 'collecting_address' | 'confirming' | 'awaiting_payment' | 'completed' | 'cancelled';
  expiresAt: Date;           // TTL: 2 horas de inactividad
}
```

---

## 7. Integraciones Externas

### 7.1 AFIP — Facturación Electrónica Argentina

**Librería:** `afip.js` (wrapper SOAP para WS de AFIP)

```typescript
// billing.service.ts
import Afip from '@afipsdk/afip.js';

export class BillingService {
  private static getAfipClient(tenant: Tenant) {
    return new Afip({
      CUIT: tenant.config.afip.cuit,
      cert: decrypt(tenant.config.afip.certificate),
      key: decrypt(tenant.config.afip.privateKey),
      production: process.env.NODE_ENV === 'production',
    });
  }

  static async createInvoice(orderId: string): Promise<Invoice> {
    const order = await Order.findById(orderId);
    const tenant = await TenantService.findById(order.tenantId);
    const afip = this.getAfipClient(tenant);

    // Obtener último número de comprobante
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
      tenant.config.afip.pointOfSale,
      order.billing.invoiceType === 'B' ? 6 : 11  // CBTE_TIPO
    );

    const voucherData = {
      CantReg: 1,
      PtoVta: tenant.config.afip.pointOfSale,
      CbteTipo: order.billing.invoiceType === 'B' ? 6 : 11,
      Concepto: 1,                // Productos
      DocTipo: 99,                // Consumidor Final
      DocNro: 0,
      CbteDesde: lastVoucher + 1,
      CbteHasta: lastVoucher + 1,
      CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal: order.total,
      ImpTotConc: 0,
      ImpNeto: order.total / 1.21,
      ImpOpEx: 0,
      ImpIVA: order.total - order.total / 1.21,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
      Iva: [{ Id: 5, BaseImp: order.total / 1.21, Importe: order.total - order.total / 1.21 }],
    };

    const result = await afip.ElectronicBilling.createVoucher(voucherData);

    await Order.findByIdAndUpdate(orderId, {
      'billing.cae': result.CAE,
      'billing.caeExpiry': new Date(result.CAEFchVto),
      'billing.pdfUrl': await this.generateInvoicePDF(order, result),
    });

    return result;
  }
}
```

### 7.2 MercadoPago

```typescript
// payments/mercadopago.service.ts
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const createPreference = async (order: Order, tenant: Tenant) => {
  const client = new MercadoPagoConfig({
    accessToken: decrypt(tenant.config.mercadopago.accessToken)
  });
  const preference = new Preference(client);

  return await preference.create({
    body: {
      items: order.items.map(item => ({
        id: item.menuItemId.toString(),
        title: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'ARS',
      })),
      back_urls: {
        success: `${tenant.config.domain}/payment/success?orderId=${order._id}`,
        failure: `${tenant.config.domain}/payment/failure?orderId=${order._id}`,
      },
      notification_url: `${API_URL}/api/v1/webhooks/mercadopago?tenantId=${tenant._id}`,
      external_reference: order._id.toString(),
    }
  });
};
```

### 7.3 WhatsApp Cloud API — Envío de Mensajes

```typescript
// messaging/whatsapp.service.ts
export const sendWhatsAppMessage = async (
  to: string,
  message: string,
  tenant: Tenant,
  interactive?: WhatsAppInteractiveMessage
) => {
  const payload = interactive
    ? { type: 'interactive', interactive }
    : { type: 'text', text: { body: message } };

  await fetch(
    `https://graph.facebook.com/v19.0/${tenant.config.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decrypt(tenant.config.whatsapp.accessToken)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        ...payload,
      })
    }
  );
};
```

---

## 8. Seguridad y Multi-tenancy

### 8.1 Autenticación y Autorización

**JWT Structure:**
```json
{
  "sub": "userId",
  "tenantId": "tenant_objectid",
  "role": "admin | waiter | kitchen | cashier",
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Refresh Token Rotation:** Tokens de acceso con TTL de 1h. Refresh tokens con TTL de 30 días, almacenados en HTTP-only cookie.

**RBAC Middleware:**
```typescript
export const requireRole = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
```

### 8.2 Aislamiento de Datos

```typescript
// Todos los queries DEBEN incluir tenantId
// Usar este helper para prevenir data leaks entre tenants:
export const tenantQuery = (tenantId: string, extra: object = {}) => ({
  tenantId: new mongoose.Types.ObjectId(tenantId),
  deletedAt: null,
  ...extra,
});

// Uso:
const orders = await Order.find(tenantQuery(req.tenant._id, { status: 'pending' }));
```

### 8.3 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit por tenant (no solo por IP)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => `${req.tenant._id}:${req.ip}`,
});

// Rate limit más estricto para webhooks AI
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.tenant._id.toString(),
});
```

### 8.4 Cifrado de Datos Sensibles

```typescript
// Todos los tokens de terceros (MP, WhatsApp, AFIP) se almacenan cifrados
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (encryptedText: string): string => {
  const [ivHex, tagHex, encryptedHex] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8');
};
```

---

## 9. Infraestructura y DevOps

### 9.1 Docker Compose (Desarrollo Local)

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: ./apps/api
    ports: ['3000:3000']
    environment:
      - MONGODB_URI=mongodb://mongo:27017/restaurant-saas
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    depends_on: [mongo, redis]
    volumes: ['./apps/api:/app', '/app/node_modules']

  web-admin:
    build: ./apps/web-admin
    ports: ['3001:3001']

  web-kitchen:
    build: ./apps/web-kitchen
    ports: ['3002:3002']

  mongo:
    image: mongo:7
    ports: ['27017:27017']
    volumes: ['mongo_data:/data/db']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  minio:
    image: minio/minio
    ports: ['9000:9000', '9001:9001']
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"

volumes:
  mongo_data:
```

### 9.2 Variables de Entorno Requeridas (API)

```env
# Core
NODE_ENV=production
PORT=3000
MONGODB_URI=
REDIS_URL=

# Auth
JWT_SECRET=                    # 256-bit random
JWT_REFRESH_SECRET=
ENCRYPTION_KEY=                # 32 bytes hex para AES-256

# Storage
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

# AI
OPENAI_API_KEY=

# Optional: Anthropic como fallback LLM
ANTHROPIC_API_KEY=
```

### 9.3 Índices MongoDB Críticos

```javascript
// Ejecutar en setup/migration
db.orders.createIndex({ tenantId: 1, status: 1 });
db.orders.createIndex({ tenantId: 1, 'timestamps.createdAt': -1 });
db.orders.createIndex({ tenantId: 1, tableId: 1, status: 1 });
db.orders.createIndex({ tenantId: 1, 'customer.phone': 1 }); // para delivery

db.menu_items.createIndex({ tenantId: 1, categoryId: 1, isAvailable: 1 });
db.ingredients.createIndex({ tenantId: 1, currentStock: 1 }); // para alertas

db.delivery_sessions.createIndex({ tenantId: 1, customerPhone: 1 }, { unique: true });
db.delivery_sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

db.users.createIndex({ tenantId: 1, email: 1 }, { unique: true });
db.tables.createIndex({ tenantId: 1, number: 1 }, { unique: true });
```

---

## 10. Roadmap y Fases de Implementación

### Fase 1 — Core MVP (Semanas 1–6)

| Sprint | Módulo | Entregables |
|--------|--------|-------------|
| S1–S2 | Infraestructura + Auth | Setup monorepo, Docker, MongoDB, JWT multi-tenant, middleware de tenant |
| S2–S3 | Menú + Pedidos base | CRUD menú, creación de pedidos vía QR, carrito, i18n (es/en/pt) |
| S3–S4 | Cocina Kanban | WebSockets, board Kanban, cambio de estado, notificaciones |
| S4–S5 | App Mozo (Flutter) | Login, lista de mesas, gestión de pedidos, offline básico |
| S5–S6 | Pagos base | Cash, transferencia manual, MercadoPago preference |

### Fase 2 — Stock + Delivery Manual (Semanas 7–10)

| Sprint | Módulo | Entregables |
|--------|--------|-------------|
| S7 | Stock | Ingredientes, movimientos, descuento automático por pedido, alertas |
| S8 | Admin Analytics | Dashboard ventas, top ítems, horas pico, Recharts |
| S9–S10 | Delivery manual | Módulo delivery web, cálculo de envío Haversine, tracking básico |

### Fase 3 — IA + Facturación (Semanas 11–16)

| Sprint | Módulo | Entregables |
|--------|--------|-------------|
| S11–S12 | Delivery IA WhatsApp | Webhook, BullMQ worker, LLM intent extraction, sesión conversacional |
| S13 | Vision AI | Validación de comprobantes de transferencia |
| S14 | Instagram Delivery | Webhook Instagram, integración con mismo worker de IA |
| S15–S16 | AFIP | Integración factura B/C, CAE, generación PDF, impresora térmica |

### Fase 4 — White-Label Avanzado (Semanas 17–20)

| Sprint | Módulo | Entregables |
|--------|--------|-------------|
| S17 | Onboarding Tenant | Panel de configuración white-label, carga de logo/colores/menú |
| S18 | Dominio custom | Proxy dinámico, certificados SSL por tenant |
| S19–S20 | QA + Performance | Load testing, optimización de queries, documentación API (OpenAPI) |

---

## Apéndice A — Convenciones de Código para Cursor Agent

```markdown
# Reglas para agentes de IA generando código en este proyecto

1. Siempre incluir `tenantId` en cada query de MongoDB. Sin excepción.
2. Nunca exponer datos de un tenant a otro — usar `tenantQuery()` helper.
3. Todos los tokens/secrets de terceros: cifrar con `encrypt()` antes de persistir.
4. Respuestas de API: siempre usar el formato `{ data: T, error: null }` o `{ data: null, error: string }`.
5. Errores operacionales: usar clase `AppError extends Error` con `statusCode` y `isOperational: true`.
6. Schemas Mongoose: siempre `{ timestamps: true }` y campo `tenantId` requerido.
7. WebSocket events: namespacing `entity:action` (ej: `order:status_changed`, `table:call_waiter`).
8. Flutter: Riverpod como única solución de state. No usar Provider ni setState excepto en widgets hoja.
9. Traduciones i18n: siempre usar claves namespaced `menu.item.name`, `checkout.payment.total`.
10. AI prompts: siempre con `response_format: { type: 'json_object' }` y validación de schema post-parse.
```

## Apéndice B — Estructura de Respuesta API Estándar

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Uso en controllers:
export const apiSuccess = <T>(data: T, meta?: object): ApiResponse<T> =>
  ({ data, error: null, ...(meta && { meta }) });

export const apiError = (message: string): ApiResponse<null> =>
  ({ data: null, error: message });
```

---

*Documento generado para consumo por agentes de IA. Versión 1.0.0 — Bistró Digital Demo.*
