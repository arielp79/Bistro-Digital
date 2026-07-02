# Handoff 4 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2026).  
Reemplaza y amplía `Handoff_3.md` con todo lo implementado hasta **tests automatizados + hardening multi-tenant + tiempo real entre apps**.

**Referencias:** `PRD_SaaS_Restaurantes.md` · `Handoff_3.md` · `RESUMEN_2.md`

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real).

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` (slug, no ObjectId) |
| API | `http://localhost:3000` |
| web-client | `http://localhost:5173` |
| web-admin | `http://localhost:3001` |
| web-kitchen | `http://localhost:3002` |

**Nuevos tenants:** se crean vía `/onboarding` en admin; cada uno tiene su propio `slug` (ej. `parrilla-del-sur`).

---

## Arquitectura del monorepo

```
apps/
  api/              → Express + TS + MongoDB Atlas + Socket.IO + BullMQ (:3000)
  web-client/       → React/Vite/Tailwind — cliente QR y delivery (:5173)
  web-kitchen/      → React — Kanban cocina (:3002)
  web-admin/        → React — panel admin (:3001)
  mobile-waiter/    → Flutter — app mozo
packages/
  shared-types/     → Tipos TypeScript compartidos
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → Redis + MinIO únicamente (sin Mongo local)
e2e/
  playwright.config.ts, order-flow.spec.ts, global-setup.ts
scripts/
  whatsapp-tunnel.ps1 → Túnel ngrok/cloudflared para webhooks Meta
```

**Convenciones (PRD):**

- `tenantId` en todas las queries MongoDB
- Respuestas API: `{ data, error }`
- Eventos Socket: `entity:action` (ej. `order:new`, `order:status_changed`)
- JWT + RBAC (`admin`, `waiter`, `kitchen`, `cashier`)
- Tokens de terceros cifrados con `encrypt()` en `apps/api/src/utils/encryption.ts`

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP (auth, menú, pedidos, cocina, mozo, pagos) | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~95%** — falta probar Meta/AFIP con credenciales reales de cliente |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA | ⚠️ **~35%** — onboarding hecho; suite de tests armada (falta validar E2E en máquina con Atlas); faltan dominios custom, OpenAPI, web-client multi-tenant completo |

---

## Lo heredado de Handoff 3 (ya existía)

Resumen breve — detalle en `Handoff_3.md`:

- Facturación AFIP demo/real (`/billing`)
- Geocoder Nominatim para envíos
- WhatsApp/Instagram staging (`/connect-meta`, webhooks, túnel)
- Onboarding multi-tenant (`/onboarding` en admin)
- Login admin por slug + tenant dinámico en `auth.store`

---

## Lo implementado en sesiones posteriores (Handoff 4)

### 1. Comunicación en tiempo real entre apps

**Problema resuelto:** pedidos desde web-client no aparecían en admin/cocina sin refrescar manualmente.

**web-admin — página `/orders`:**

- Kanban de pedidos activos con Socket.IO
- Polling de respaldo cada 30 s si el socket cae
- Indicador `● En vivo` / `○ Sin socket`
- Archivos:
  - `apps/web-admin/src/pages/OrdersPage.tsx`
  - `apps/web-admin/src/hooks/useOrdersSocket.ts`
  - `apps/web-admin/src/stores/order.store.ts`
  - `apps/web-admin/src/components/KanbanColumn.tsx`, `OrderCard.tsx`
  - Ruta en `App.tsx` + link en `AdminLayout.tsx`

**web-kitchen:**

- Socket ya existía (`useKanbanSocket.ts`); se mejoró indicador de conexión en UI
- Badge `● En vivo` en tablero

**Proxies Vite (Socket.IO):**

- `apps/web-admin/vite.config.ts` → `/socket.io` → `:3000`
- `apps/web-client/vite.config.ts` → `/socket.io` → `:3000`
- `apps/web-kitchen/vite.config.ts` → `/socket.io` → `:3000`

**web-client — tenant persistente:**

- `TenantBootstrap` envuelve la app y persiste `?tenant=` en `sessionStorage` para todas las rutas
- Archivo: `apps/web-client/src/components/TenantBootstrap.tsx`
- Store: `apps/web-client/src/stores/tenant.store.ts`

### 2. Hardening multi-tenant

**Middleware `requireTenantMatch`:**

- Tras `tenantMiddleware` + `authMiddleware`, exige que `req.user.tenantId` coincida con el tenant del header `X-Tenant-ID`
- Evita acceso cruzado entre restaurantes con un JWT válido de otro tenant
- Archivo: `apps/api/src/middlewares/tenant-access.middleware.ts`
- Aplicado en rutas autenticadas de: orders, tables, analytics, users, stock, delivery, billing, etc.

### 3. Pedidos MercadoPago en cocina/admin

**Antes:** pedidos MP pendientes se ocultaban del listado.

**Ahora:**

- Aparecen en Kanban con badge "Esperando pago MP"
- No se pueden avanzar de estado hasta pago verificado (`order.store.ts` en admin y kitchen)
- `emitToTenant('order:new')` se emite igual aunque el pago MP esté pendiente
- Lógica en `apps/api/src/modules/orders/order.service.ts`

### 4. MongoDB solo Atlas (sin Docker para datos)

- Eliminado servicio `mongo` de `infra/docker-compose.yml` (queda Redis + MinIO)
- `MONGODB_URI` **obligatoria** en `apps/api/src/config/env.ts` (sin fallback a localhost)
- Actualizados `apps/api/.env.example`, `infra/README.md`
- Script de diagnóstico: `cd apps/api && npm run audit:orders`

**Importante:** si Compass o los paneles no muestran pedidos, verificar que se mira **la misma URI de Atlas** que `MONGODB_URI`, no un Mongo local.

### 5. Refresh token automático (opción A — completada)

Interceptor 401 → `POST /api/v1/auth/refresh` → retry en:

| App | Archivo |
|-----|---------|
| web-admin | `apps/web-admin/src/lib/api.ts` + `auth.store.ts` (persiste `refreshToken`) |
| web-kitchen | `apps/web-kitchen/src/lib/api.ts` + `auth.store.ts` |
| mobile-waiter | `apps/mobile-waiter/lib/core/api_client.dart` + `app_providers.dart` |

**Nota:** sesiones iniciadas antes de este cambio no tienen `refreshToken` guardado — hace falta **re-login una vez** en cada cliente.

### 6. Tests automatizados (opción B — completada a nivel código)

#### Refactor API para testing

- `apps/api/src/create-app.ts` — exporta `createApp()` (Express sin listen)
- `apps/api/src/app.ts` — solo bootstrap del servidor (DB + Socket + worker)

#### Vitest — unitarios (sin DB)

Config: `apps/api/vitest.config.ts`

| Archivo | Qué prueba |
|---------|------------|
| `src/services/geocoder.service.test.ts` | Geocoder Nominatim + fallback |
| `src/services/ai.service.test.ts` | Fallback local sin OpenAI |
| `src/modules/onboarding/onboarding.service.test.ts` | Validación de slugs |
| `src/middlewares/tenant-access.middleware.test.ts` | `requireTenantMatch` |

**Comando:** `npm run test:unit` → **10 tests OK**

#### Vitest — integración (requiere Atlas + seed)

Config: `apps/api/vitest.integration.config.ts`  
Setup: `apps/api/src/test/integration-setup.ts` — si Mongo no conecta, **omite tests** con aviso (timeout 5 s)

| Archivo | Qué prueba |
|---------|------------|
| `src/modules/onboarding/onboarding.integration.test.ts` | Slugs reservados / demo |
| `src/modules/orders/orders.integration.test.ts` | Crear pedido QR → listar cocina → cambiar estado |
| `src/modules/auth/auth.integration.test.ts` | Login demo + rechazo cross-tenant |

Helpers: `apps/api/src/test/helpers.ts`

**Comando:** `npm run test:integration` → 7 tests (corren con Atlas; se omiten si no hay conexión)

#### Playwright — E2E

```
e2e/
  playwright.config.ts   → levanta api + web-client + kitchen
  global-setup.ts        → verifica /health + datos demo (seed)
  order-flow.spec.ts     → menú QR → pedido → tracking → login cocina → ver pedido
  helpers/api.ts         → login admin + obtener tableId del seed
```

**Comando:** `npm run test:e2e` (requiere Atlas accesible + `npm run seed`)  
**UI mode:** `npm run test:e2e:ui`

#### Scripts npm (raíz)

```json
"test":           "unitarios solamente"
"test:ci":        "unitarios + integración"
"test:all":       "unitarios + integración (workspace api)"
"test:integration": "integración Atlas"
"test:e2e":       "Playwright flujo pedido"
```

---

## web-admin — rutas (actualizado)

| Ruta | Página |
|------|--------|
| `/login` | Login (slug + email + password) |
| `/onboarding` | Alta de nuevo restaurante (público) |
| `/` | Dashboard (+ widget Meta si pendiente) |
| `/orders` | **Pedidos en vivo (Kanban + Socket.IO)** ← nuevo |
| `/menu` | CRUD menú |
| `/tables` | CRUD mesas + QR |
| `/stock` | Stock |
| `/users` | Usuarios |
| `/delivery` | Simulador Delivery IA |
| `/connect-meta` | Guía WhatsApp + Instagram |
| `/billing` | Facturación AFIP |
| `/settings` | General, pagos, AFIP, MercadoPago |

---

## API — mapa de rutas (sin cambios estructurales)

```
/api/v1/auth          → login, refresh, me
/api/v1/tenant        → config, settings, patch config
/api/v1/menu          → público + categories/items CRUD
/api/v1/orders        → crear, listar, estado, cerrar
/api/v1/tables        → CRUD + estado
/api/v1/analytics     → sales, items/top
/api/v1/stock         → ingredients, alerts, movements
/api/v1/users         → list, create, patch
/api/v1/delivery      → simulate, sessions, shipping, whatsapp/test, instagram/test
/api/v1/payments      → mercadopago/preference
/api/v1/billing       → orders, :orderId/invoice, :orderId/invoice/pdf
/api/v1/onboarding    → check-slug, suggest-slug, register
/api/v1/webhooks      → whatsapp, instagram, mercadopago
GET  /health          → healthcheck (usado por Playwright y E2E)
```

---

## Variables de entorno relevantes (`apps/api/.env`)

| Variable | Uso |
|----------|-----|
| `MONGODB_URI` | **MongoDB Atlas (obligatorio)** — no usar Docker para datos |
| `REDIS_URL` | BullMQ + worker Delivery IA (obligatorio para IA) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth |
| `ENCRYPTION_KEY` | Cifrado tokens tenant (32 bytes hex) |
| `OPENAI_API_KEY` | IA real (opcional; hay fallback local) |
| `API_PUBLIC_URL` | URL HTTPS pública para webhooks Meta |
| `WHATSAPP_VERIFY_TOKEN` | Verify token global fallback |
| `WHATSAPP_APP_SECRET` | Validación firma webhooks Meta |
| `ONBOARDING_ENABLED` | `true`/`false` — registro público de tenants |

Ver plantilla: `apps/api/.env.example`

---

## Cómo arrancar

```powershell
cd c:\Proyectos\Bistro_Digital

# 1. MongoDB Atlas: configurar MONGODB_URI en apps/api/.env
# 2. Whitelist de IP actual en Atlas (Network Access)
npm run seed           # Tenant demo bistro-digital (contra Atlas)
npm run docker:up      # Solo Redis + MinIO
npm run dev:api        # :3000 (+ worker delivery si Redis activo)
npm run dev:web        # :5173
npm run dev:admin      # :3001
npm run dev:kitchen    # :3002
npm run dev:mozo       # Flutter (opcional)
```

**Compilar packages tras cambiar tipos/schemas:**

```powershell
cd packages/shared-types && npm run build
cd ../validation-schemas && npm run build
cd ../../apps/api && npm run build
```

---

## Cómo correr tests

```powershell
# Sin Atlas (solo unitarios)
npm run test:unit          # 10 tests

# Con Atlas + seed
npm run test:ci            # 10 unit + 7 integración
npm run test:e2e           # Playwright: web → pedido → cocina

# Diagnóstico de pedidos en DB
cd apps/api && npm run audit:orders
```

**Requisitos E2E:**

1. `MONGODB_URI` válida y IP en whitelist de Atlas
2. `npm run seed` ejecutado
3. Chromium de Playwright: `npx playwright install chromium` (ya instalado en el repo)

---

## Credenciales demo (seed)

| Rol | Email | Password | Slug login |
|-----|-------|----------|------------|
| Admin | `admin@bistro-digital.app` | `admin123` | `bistro-digital` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` | `bistro-digital` |
| Cocina | `cocina@bistro-digital.app` | `cocina123` | `bistro-digital` |
| Caja | `caja@bistro-digital.app` | `caja123` | `bistro-digital` |

**URLs demo:**

- Menú QR: `http://localhost:5173/menu?table=<tableId>&tenant=bistro-digital`
- Admin pedidos: `http://localhost:3001/orders`
- Cocina: `http://localhost:3002` (credenciales pre-cargadas en login)

---

## Flujos clave para probar

### Pedido en tiempo real (flujo principal)

1. `npm run dev:api` + `dev:web` + `dev:admin` + `dev:kitchen`
2. Abrir menú con `?table=...&tenant=bistro-digital`
3. Agregar ítem → Confirmar pedido
4. Verificar en admin `/orders` y cocina que aparece con `● En vivo`
5. Avanzar estado desde cocina o admin

### Onboarding nuevo restaurante

1. `http://localhost:3001/onboarding`
2. Completar wizard → auto-login al panel
3. Menú QR: link en pantalla final (`?table=...&tenant=<slug>`)
4. Login posterior: slug + email + password en `/login`

### Delivery IA sin Meta

1. Redis activo + API
2. Admin → Delivery IA → simulador de chat

### Meta real (requiere cliente piloto)

1. `npm run tunnel:whatsapp` → copiar URL HTTPS
2. `API_PUBLIC_URL=<url>` en `.env` → reiniciar API
3. Cliente configura app Meta → pegar URLs en `/connect-meta`

### Factura demo

1. Pedido en estado `paid` o `delivered`
2. Admin → Facturación → Factura B/C → Ver PDF

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **E2E validado en CI/máquina dev** | 4 | Suite armada; falta correr `test:e2e` con Atlas accesible y fijar en pipeline |
| **Tests unitarios billing** | 4 | Sugerido en Handoff 3; no implementado aún |
| **E2E onboarding + delivery** | 4 | Solo existe flujo pedido QR → cocina |
| **web-client multi-tenant completo** | 4 | `?tenant=` funciona y persiste; falta landing/selector UI sin depender de `VITE_TENANT_SLUG` |
| **Observabilidad Delivery IA** | 3 | Jobs fallidos, latencia worker, errores OpenAI |
| **WhatsApp/Instagram probados en producción** | 3 | Infra lista; falta cliente con Meta real |
| **AFIP homologación/producción** | 3 | Modo demo OK; certificados reales del cliente |
| **Dominio custom** por tenant | 4 | — |
| **OpenAPI / Swagger** | 4 | — |
| **Push FCM** Flutter mozo | PRD | No implementado |
| **RAG / embeddings** menú | PRD IA | No implementado |
| **Super-admin** plataforma | 4 | No hay panel para operador SaaS |
| **Onboarding:** invitación email, pago/plan | 4 | Solo registro self-service básico |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Validar tests en entorno real**
   - Correr `npm run test:ci` y `npm run test:e2e` con Atlas + seed
   - Corregir flakes o selectores Playwright si fallan
   - Opcional: GitHub Actions con `test:ci` (integración puede skip si no hay secret `MONGODB_URI`)

2. **web-client multi-tenant completo (opción C)**
   - Landing o pantalla de bienvenida que pida/resuelva el slug
   - No depender de `VITE_TENANT_SLUG` en build para nuevos restaurantes
   - Link post-onboarding ya genera `?tenant=<slug>` — falta UX para usuarios sin URL completa
   - Archivos clave: `tenant.store.ts`, `TenantBootstrap.tsx`, `HomePage.tsx`

3. **Ampliar cobertura de tests**
   - Unitarios: `billing.service` (modo demo), `order.service` (lógica MP)
   - E2E: onboarding wizard → primer pedido; simulador delivery → pedido
   - Integración: webhook MercadoPago mock

### Prioridad media

4. **Observabilidad Delivery IA**
   - Endpoint admin: jobs fallidos BullMQ, últimos errores, latencia
   - UI en `/delivery` o `/ops`

5. **Super-admin SaaS**
   - Listar tenants, activar/suspender, métricas globales
   - Rol `platform_admin` o API separada

6. **Cliente piloto Meta**
   - Checklist desde `/connect-meta`
   - Probar flujo completo con restaurante real

### Prioridad baja — Fase 4

7. **OpenAPI** — documentar `/api/v1`
8. **Dominio custom** — proxy dinámico, SSL por tenant
9. **Planes y billing SaaS** — Stripe para cobrar al restaurante
10. **Flutter mozo** — FCM, tema dinámico desde `/tenant/config`

---

## Archivos clave añadidos/modificados (Handoff 4)

```
# Tiempo real + admin pedidos
apps/web-admin/src/pages/OrdersPage.tsx
apps/web-admin/src/hooks/useOrdersSocket.ts
apps/web-admin/src/stores/order.store.ts
apps/web-admin/src/components/KanbanColumn.tsx
apps/web-admin/src/components/OrderCard.tsx
apps/web-admin/vite.config.ts                    # proxy /socket.io

# web-client tenant
apps/web-client/src/components/TenantBootstrap.tsx
apps/web-client/vite.config.ts                   # proxy /socket.io

# Multi-tenant hardening
apps/api/src/middlewares/tenant-access.middleware.ts
apps/api/src/middlewares/tenant-access.middleware.test.ts

# Refresh token
apps/web-admin/src/lib/api.ts
apps/web-admin/src/stores/auth.store.ts
apps/web-kitchen/src/lib/api.ts
apps/web-kitchen/src/stores/auth.store.ts
apps/mobile-waiter/lib/core/api_client.dart

# Mongo solo Atlas
apps/api/src/config/env.ts                       # MONGODB_URI obligatoria
apps/api/src/config/database.ts                  # connectDatabase(options?)
infra/docker-compose.yml                         # sin mongo
apps/api/scripts/audit-orders.mjs

# Tests
apps/api/src/create-app.ts
apps/api/src/app.ts                              # refactor bootstrap
apps/api/vitest.config.ts
apps/api/vitest.integration.config.ts
apps/api/src/test/setup.ts
apps/api/src/test/integration-setup.ts
apps/api/src/test/helpers.ts
apps/api/src/**/*.test.ts
apps/api/src/**/*.integration.test.ts
e2e/playwright.config.ts
e2e/global-setup.ts
e2e/order-flow.spec.ts
e2e/helpers/api.ts
package.json                                     # scripts test:*
```

---

## Deuda técnica / gotchas

- **Login admin** requiere conocer el `slug` del restaurante (no solo email).
- **web-client** en dev puede usar `VITE_TENANT_SLUG`; nuevos tenants necesitan `?tenant=<slug>` en la URL (persistido por `TenantBootstrap`).
- **Re-login** necesario una vez en admin/kitchen/mozo tras el cambio de refresh token automático.
- **Pedidos no visibles:** verificar mismo tenant (`X-Tenant-ID`), misma DB Atlas (`MONGODB_URI`), filtros de estado, y si es MP pendiente (ahora visible pero no avanzable).
- **MercadoPago pendiente:** aparece en Kanban con badge; no avanza hasta pago verificado.
- **Socket proxy Vite:** errores `ws proxy socket error: ECONNABORTED` en consola son ruido de Vite; no bloquean si el badge muestra `● En vivo`.
- **Tests integración/E2E:** requieren IP en whitelist de Atlas; sin conexión los tests de integración se **omiten** (no fallan).
- **Onboarding rollback:** si falla a mitad, se borran tenant + users + menú + mesas del intento.
- **Instagram test:** necesita PSID del destinatario (solo tras primer DM entrante).
- **Compilar `shared-types` y `validation-schemas`** antes de build API/admin tras cambios de tipos.
- **`createApp()`** no conecta DB ni levanta Socket — usar solo en tests; producción usa `app.ts`.

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: Handoff_4.md (reemplaza Handoff_3.md)

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~95%: AFIP demo, Meta staging, geocoder, sin prueba real cliente
- Fase 4 ~35%: onboarding, tests (Vitest + Playwright armados), tiempo real entre apps

Nuevo en Handoff 4:
- /orders en admin (Kanban + Socket.IO en vivo)
- TenantBootstrap en web-client (?tenant= persistente)
- requireTenantMatch (hardening multi-tenant)
- Pedidos MP visibles en cocina/admin (no avanzables hasta pago)
- MongoDB solo Atlas (sin Docker mongo)
- Refresh token automático en admin, kitchen y Flutter mozo
- Suite tests: 10 unit + 7 integración + E2E order-flow

Demo: slug bistro-digital | admin@bistro-digital.app / admin123
Arranque: MONGODB_URI en .env → seed → dev:api + dev:admin + dev:kitchen
Tests: npm run test:unit | npm run test:ci (Atlas) | npm run test:e2e (Atlas+seed)

Siguiente tarea sugerida: opción C (web-client multi-tenant completo) o validar test:e2e en máquina con Atlas.
```

---

*Última actualización: junio 2026 — incluye tiempo real entre apps, hardening multi-tenant, refresh token, Mongo solo Atlas y suite de tests (Vitest + Playwright).*
