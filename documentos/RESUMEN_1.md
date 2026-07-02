# Resumen 1 — Bistró Digital

Documento de handoff del estado actual del monorepo en `c:\Proyectos\Bistro_Digital`, basado en `PRD_SaaS_Restaurantes.md`.

---

## Qué es el proyecto

SaaS multi-tenant para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin y delivery con IA por WhatsApp/Instagram.

**Tenant demo:** `bistro-digital`  
**Header obligatorio:** `X-Tenant-ID: bistro-digital`

---

## Arquitectura actual

```
apps/
  api/              → Express + TS + MongoDB + Socket.IO + BullMQ (puerto 3000)
  web-client/       → React/Vite/Tailwind — cliente QR (puerto 5173)
  web-kitchen/      → React — tablero Kanban cocina (puerto 3002)
  web-admin/        → React — panel admin (puerto 3001)
  mobile-waiter/    → Flutter — app mozo
packages/
  shared-types/     → Tipos TypeScript compartidos
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → MongoDB, Redis, MinIO
```

**Convenciones del PRD que ya se aplican:**

- `tenantId` en todas las queries
- Respuestas API: `{ data, error }`
- Eventos Socket: `entity:action` (ej. `order:new`, `order:status_changed`)
- JWT + roles RBAC

---

## Lo que está hecho (por fase del PRD)

### Fase 1 — Core MVP ✅ (casi completa)

| Módulo | Estado |
|--------|--------|
| Infra monorepo + Docker + seed | ✅ |
| Auth JWT multi-tenant + roles | ✅ |
| Menú (CRUD admin + menú público) | ✅ |
| Pedidos (crear, estado, listar, cerrar) | ✅ |
| Mesas | ✅ |
| **web-client**: carrito, checkout, tracking, i18n es/en/pt, QR `?table=&tenant=` | ✅ |
| **web-kitchen**: login, Kanban 4 columnas, Socket.IO | ✅ |
| **mobile-waiter**: login, mesas, pedidos, socket, caché offline básico | ✅ |
| Pagos cash + transferencia + MercadoPago | ✅ |
| **MercadoPago preference** | ✅ |

### Fase 2 — Stock + Delivery manual ✅ (completa)

| Módulo | Estado |
|--------|--------|
| Stock: ingredientes CRUD + alertas bajo mínimo | ✅ |
| Descuento automático de stock al confirmar pedido | ✅ |
| Admin analytics (ventas, top ítems, Recharts) | ✅ |
| Delivery manual en **web-client** (checkout delivery, tracking) | ✅ |
| Cálculo envío Haversine | ✅ (en API `delivery.service.ts`) |

### Fase 3 — IA + Facturación ⚠️ Parcial

| Módulo | Estado |
|--------|--------|
| BullMQ + Redis + worker | ✅ |
| Sesiones conversacionales (`delivery_sessions`, TTL 2h) | ✅ |
| Extracción intenciones LLM (+ fallback sin API key) | ✅ |
| Validación comprobantes Vision AI | ✅ (requiere `OPENAI_API_KEY`) |
| Webhooks WhatsApp + Instagram | ✅ |
| `POST /api/v1/delivery/simulate` (admin) | ✅ |
| Integración pedidos delivery → cocina | ✅ |
| UI admin para probar delivery | ❌ |
| Tokens WhatsApp/Instagram reales en tenant | ❌ (solo logs `[WhatsApp:DEV]`) |
| **AFIP** (factura B/C, CAE, PDF) | ❌ |

### Fase 4 — White-label avanzado ❌

Onboarding tenant, dominio custom, OpenAPI, load testing: **no iniciado**.

---

## API — módulos registrados

```
/api/v1/auth
/api/v1/tenant
/api/v1/menu
/api/v1/orders
/api/v1/tables
/api/v1/analytics
/api/v1/stock
/api/v1/users
/api/v1/delivery      ← simulate, sessions, shipping
/api/v1/webhooks      ← whatsapp, instagram
```

**Servicios internos:** `socket.service`, `queue.service`, `ai.service`, `delivery.worker`

---

## Credenciales demo (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@bistro-digital.app` | `admin123` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` |
| Cocina | `cocina@bistro-digital.app` | `cocina123` |
| Caja | `caja@bistro-digital.app` | `caja123` |

---

## Cómo arrancar todo

```powershell
npm run docker:up    # MongoDB + Redis + MinIO
npm run seed
npm run dev:api      # :3000 (+ worker delivery)
npm run dev:web      # :5173
npm run dev:kitchen  # :3002
npm run dev:admin    # :3001
npm run dev:mozo     # Flutter
```

**Variables relevantes** (`apps/api/.env`):

- `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`
- `OPENAI_API_KEY` (opcional, para IA real)
- `WHATSAPP_VERIFY_TOKEN`, `DELIVERY_AI_MODEL`

---

## Qué falta (priorizado según PRD)

1. **Pulir Delivery IA** — pantalla en admin, WhatsApp real, geocoder
2. **AFIP** — facturación electrónica Argentina (Fase 3)
3. **Fase 4** — white-label avanzado, dominios custom, OpenAPI

---

## Siguiente tarea a seguir: Delivery IA (admin) o AFIP

**Opciones prioritarias (Fase 3):**

1. Pantalla admin para simular/probar delivery IA (`POST /delivery/simulate`)
2. AFIP — facturación electrónica Argentina
3. Hardening: refresh token, OpenAPI, tests E2E

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: RESUMEN_1.md

Ya implementado:
- Fase 1 completa: incluye MercadoPago (preference + webhook + web-client)
- Fase 2 completa: stock CRUD + alertas, analytics, delivery web-client, descuento automático de stock
- Fase 3 parcial: delivery IA (BullMQ, worker, sesiones, OpenAI/fallback, webhooks WA/IG, simulate); falta AFIP y UI admin delivery

Tenant demo: bistro-digital | Header: X-Tenant-ID: bistro-digital
Credenciales: admin@bistro-digital.app / admin123

Arranque: docker:up → seed → dev:api/dev:web/dev:kitchen/dev:admin

Siguiente tarea: Admin CRUD completo (menú, mesas, config).
```
