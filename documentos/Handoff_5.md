# Handoff 5 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2026).  
Reemplaza y amplía `Handoff_4.md` con todo lo implementado hasta **web-client multi-tenant, QA validado, cobertura de tests ampliada y observabilidad Delivery IA**.

**Referencias:** `PRD_SaaS_Restaurantes.md` · `Handoff_4.md` · `Handoff_3.md`

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

**Nuevos tenants:** wizard en `http://localhost:3001/onboarding` → auto-login al panel → link menú QR con `?tenant=<slug>`.

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
  shared-types/     → Tipos TypeScript compartidos (incl. DeliveryOpsSnapshot)
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → Redis + MinIO únicamente (sin Mongo local)
e2e/
  playwright.config.ts, order-flow.spec.ts, onboarding-flow.spec.ts, global-setup.ts
.github/workflows/
  ci.yml            → unit siempre; integración + E2E si secret MONGODB_URI
scripts/
  whatsapp-tunnel.ps1
  apps/api/scripts/check-mongodb.mjs   → preflight Atlas
```

**Convenciones (PRD):** `tenantId` en queries · respuestas `{ data, error }` · sockets `entity:action` · JWT + RBAC · `encrypt()` para tokens de terceros.

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~97%** — observabilidad BullMQ hecha; falta prueba Meta/AFIP con cliente real |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA | ⚠️ **~55%** — multi-tenant web-client, tests validados (15 unit + 12 int + 2 E2E), CI GitHub; faltan dominio custom, OpenAPI, super-admin |

---

## Heredado de Handoff 4 (ya existía — no reimplementar)

Resumen — detalle en `Handoff_4.md`:

- `/orders` en admin (Kanban + Socket.IO en vivo)
- `TenantBootstrap` + `?tenant=` persistente en sessionStorage
- `requireTenantMatch` (hardening multi-tenant)
- Pedidos MP visibles en Kanban (no avanzables hasta pago)
- MongoDB solo Atlas (`MONGODB_URI` obligatoria)
- Refresh token automático (admin, kitchen, Flutter mozo)
- Suite base: Vitest + Playwright `order-flow`
- Onboarding, AFIP demo, Meta staging, geocoder, etc.

---

## Lo implementado en sesiones Handoff 5

### 1. web-client multi-tenant completo (opción C)

**Problema:** el cliente asumía `bistro-digital` por defecto; usuarios sin URL completa no podían elegir restaurante. `RequireTenant` redirigía a `/` antes de leer `?tenant=` (race condition).

**Solución:**

- Pantalla de selección en `/` si no hay tenant (`TenantSelectPage`)
- Resolución síncrona de slug: URL → subdominio → sessionStorage → `VITE_DEFAULT_TENANT_SLUG` (solo dev)
- Rutas protegidas con `RequireTenant` (acepta `?tenant=` en URL)
- Botón **Cambiar restaurante** en home
- Hook `useTenantSlug()` para rutas que exigen slug tipado

**Archivos:**

```
apps/web-client/src/pages/TenantSelectPage.tsx
apps/web-client/src/pages/RootPage.tsx
apps/web-client/src/components/RequireTenant.tsx
apps/web-client/src/utils/tenant-resolve.ts
apps/web-client/src/hooks/useTenantSlug.ts
apps/web-client/src/stores/tenant.store.ts      # slug nullable, resolveSlug(), clearSlug()
apps/web-client/src/App.tsx
apps/web-client/src/pages/HomePage.tsx
apps/web-client/.env.example                    # VITE_DEFAULT_TENANT_SLUG opcional
```

**Flujos:**

| Entrada | Comportamiento |
|---------|----------------|
| `http://localhost:5173/` sin tenant | Pantalla “¿En qué restaurante estás?” |
| `?table=...&tenant=parrilla-del-sur` | Menú directo (QR) |
| Onboarding → link `clientMenu` | Tenant en URL + sessionStorage |
| `VITE_DEFAULT_TENANT_SLUG=bistro-digital` | Salta selección en dev |

---

### 2. Infraestructura de tests y validación

**Scripts npm (raíz):**

| Comando | Qué hace |
|---------|----------|
| `npm run test:unit` | 15 tests Vitest (sin DB) |
| `npm run test:preflight` | Verifica conexión MongoDB Atlas |
| `npm run test:ci` | unit + integración (integración se omite si no hay Atlas) |
| `npm run test:ci:strict` | preflight obligatorio + test:ci |
| `npm run test:validate` | preflight → seed → test:ci → playwright install → test:e2e |
| `npm run test:e2e:install` | `playwright install chromium` |
| `npm run test:e2e` | 2 specs Playwright |

**Otros:**

- `apps/api/scripts/check-mongodb.mjs` — diagnóstico Atlas + mensaje whitelist IP
- `apps/api/src/test/integration-teardown.ts` — modo estricto CI (`CI_INTEGRATION_STRICT`)
- `.github/workflows/ci.yml` — job `unit` siempre; `integration-e2e` si `secrets.MONGODB_URI`
- E2E API con `SKIP_DELIVERY_WORKER=1` (no requiere Redis para flujos QR)
- Playwright: `locale: 'es-AR'`, selectores bilingües, verificación de pedido por `#B-XXXX` exacto

**Estado validado en máquina dev (con Atlas en whitelist):**

```
test:preflight     → OK
seed               → OK
test:ci            → 15 unit + 12 integración OK
test:e2e           → 2/2 OK (order-flow + onboarding-flow)
```

---

### 3. Cobertura de tests ampliada

#### Unitarios (15 tests, 6 archivos)

| Archivo | Qué prueba |
|---------|------------|
| `order.service.test.ts` | `validatePaymentMethod` |
| `delivery-ops.service.test.ts` | Latencia avg/p95, `jobDurationMs` |
| (+ 4 archivos Handoff 4) | geocoder, AI fallback, onboarding slugs, tenant-access |

#### Integración (12 tests, 7 archivos)

| Archivo | Qué prueba |
|---------|------------|
| `billing.integration.test.ts` | Factura B demo + rechazo pedido pendiente |
| `mercadopago.integration.test.ts` | MP bloqueado en cocina → webhook mock → confirmado |
| `delivery.simulate.integration.test.ts` | POST `/delivery/simulate` encola job (mock BullMQ) |
| `delivery.ops.integration.test.ts` | GET `/delivery/ops` admin |
| (+ 3 archivos Handoff 4) | auth, onboarding, orders |

#### E2E Playwright (2 specs)

| Archivo | Flujo |
|---------|-------|
| `order-flow.spec.ts` | Menú QR demo → pedido → cocina ve `#B-XXXX` |
| `onboarding-flow.spec.ts` | Wizard `/onboarding` → restaurante nuevo → primer pedido |

**Playwright levanta:** api (:3000), web-client (:5173), web-kitchen (:3002), web-admin (:3001).

---

### 4. Observabilidad Delivery IA

**Endpoint:** `GET /api/v1/delivery/ops` (admin, autenticado)

**Respuesta (`DeliveryOpsSnapshot` en `shared-types`):**

- `redisAvailable`, `workerRunning` (`isDeliveryWorkerActive()`)
- `counts` — waiting, active, completed, failed, delayed (filtrado por `tenantId` del job)
- `latencyMs` — avg, p95, sampleSize (jobs completados del tenant)
- `failedJobs` — últimos 20 con `failedReason`, preview mensaje
- `recentJobs` — actividad reciente con duración

**UI:** panel en `apps/web-admin/src/pages/DeliveryPage.tsx` (polling 10 s).

**Archivos:**

```
apps/api/src/modules/delivery/delivery-ops.service.ts
apps/api/src/modules/delivery/delivery.controller.ts   → getDeliveryOps
apps/api/src/modules/delivery/delivery.routes.ts       → GET /ops
apps/api/src/workers/delivery.worker.ts                → isDeliveryWorkerActive()
packages/shared-types/src/index.ts                     → DeliveryOpsSnapshot, etc.
```

**Nota:** con `SKIP_DELIVERY_WORKER=1` (E2E) el panel muestra worker inactivo; Redis + cola siguen visibles si `docker:up`.

---

### 5. Otros ajustes API

- `env.skipDeliveryWorker` / `SKIP_DELIVERY_WORKER=1` — omite worker BullMQ al arrancar (`app.ts`)

---

## API — rutas relevantes (actualizado)

```
/api/v1/delivery
  POST /simulate
  GET  /sessions
  GET  /ops                    ← nuevo (observabilidad)
  GET  /sessions/:sessionId
  GET  /shipping
  POST /whatsapp/test
  POST /instagram/test

/api/v1/webhooks/mercadopago   → usado en test integración (mock getPayment)
```

Rutas completas: ver `Handoff_4.md` (sin cambios estructurales en el resto).

---

## web-admin — rutas

| Ruta | Página |
|------|--------|
| `/delivery` | Simulador Delivery IA + **panel observabilidad** |
| `/orders` | Kanban pedidos en vivo |
| `/onboarding` | Alta restaurante (público) |
| (resto) | Ver Handoff_4 |

---

## web-client — rutas

| Ruta | Comportamiento |
|------|----------------|
| `/` | `TenantSelectPage` o `HomePage` según tenant |
| `/menu`, `/checkout`, `/order/:id` | Requieren tenant (`RequireTenant`) |

---

## Variables de entorno relevantes

| Variable | Uso |
|----------|-----|
| `MONGODB_URI` | Atlas **obligatorio** |
| `REDIS_URL` | BullMQ + worker Delivery IA |
| `SKIP_DELIVERY_WORKER` | `1` en E2E Playwright; omitir en dev si querés worker |
| `VITE_DEFAULT_TENANT_SLUG` | web-client dev: saltar pantalla selección |
| `VITE_DEMO_TABLE_ID` | Link “Ver menú” en home demo |
| `CI_INTEGRATION_STRICT` | Falla CI si Mongo no conecta |

Ver `apps/api/.env.example` y `apps/web-client/.env.example`.

---

## Cómo arrancar

```powershell
cd c:\Proyectos\Bistro_Digital

# 1. MONGODB_URI en apps/api/.env + IP en whitelist Atlas
npm run seed
npm run docker:up          # Redis + MinIO
npm run dev:api
npm run dev:web
npm run dev:admin
npm run dev:kitchen
```

**Compilar packages tras cambiar tipos:**

```powershell
cd packages/shared-types && npm run build
cd ../validation-schemas && npm run build
```

---

## Cómo correr tests

```powershell
# Solo unitarios (sin Atlas)
npm run test:unit                    # 15 tests

# Con Atlas
npm run test:preflight
npm run test:ci:strict               # 15 unit + 12 integración
npm run test:e2e:install             # primera vez / tras update Playwright
npm run test:e2e                     # 2 specs

# Pipeline completo local
npm run test:validate
```

**Requisitos E2E:** Atlas accesible · `npm run seed` · Chromium instalado · API sin conflicto en :3000 (Playwright levanta servidores o reusa existentes).

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
- Cliente sin QR: `http://localhost:5173/` → ingresar `bistro-digital`
- Admin delivery: `http://localhost:3001/delivery`
- Onboarding: `http://localhost:3001/onboarding`

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **E2E delivery simulador end-to-end** | 4 | Integración con mock de cola OK; E2E real requiere Redis + worker activo |
| **E2E en CI con secret configurado** | 4 | Workflow listo; falta configurar `MONGODB_URI` en GitHub |
| **WhatsApp/Instagram producción** | 3 | Infra staging lista; sin cliente piloto |
| **AFIP homologación/producción** | 3 | Modo demo OK |
| **Super-admin SaaS** | 4 | Listar/suspender tenants, métricas globales |
| **Dominio custom** por tenant | 4 | — |
| **OpenAPI / Swagger** | 4 | — |
| **Planes y billing SaaS (Stripe)** | 4 | — |
| **Push FCM** Flutter mozo | PRD | — |
| **RAG / embeddings** menú | PRD IA | — |
| **Onboarding:** email invitación, planes | 4 | Solo self-service básico |
| **Unitarios billing.service puro** | 4 | Cubierto por integración demo; sin tests aislados de `emitAfipVoucher` |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Super-admin SaaS**
   - Rol `platform_admin` o API `/api/v1/platform/*`
   - Listar tenants, activar/suspender, métricas agregadas
   - Panel separado o ruta `/platform` (solo operador SaaS)
   - Considerar limpieza de tenants E2E (`e2e-*` slugs) en Atlas

2. **Configurar CI en GitHub**
   - Secret `MONGODB_URI` en el repo
   - Verificar que `.github/workflows/ci.yml` pase integration + E2E
   - Opcional: job con Redis para tests delivery reales

3. **Cliente piloto Meta + AFIP real**
   - Checklist desde `/connect-meta`
   - Certificados AFIP del cliente en settings
   - `npm run tunnel:whatsapp` + `API_PUBLIC_URL`

### Prioridad media

4. **E2E delivery con Redis**
   - `test:validate` con `docker:up` antes de E2E
   - Spec: simulador admin → sesión → pedido creado (sin mock)
   - Quitar `SKIP_DELIVERY_WORKER` en ese job de CI opcional

5. **OpenAPI** — documentar `/api/v1` (Swagger UI o spec estática)

6. **Dominio custom** — proxy dinámico, SSL por tenant; resolver tenant por subdominio en producción (ya hay `extractSlugFromHostname` en web-client)

### Prioridad baja

7. **Planes y billing SaaS** — Stripe para cobrar al restaurante  
8. **Flutter mozo** — FCM, tema dinámico desde `/tenant/config`  
9. **RAG / embeddings** en menú para Delivery IA  
10. **Onboarding** — invitación por email, selección de plan  

---

## Archivos clave añadidos/modificados (Handoff 5)

```
# web-client multi-tenant
apps/web-client/src/pages/TenantSelectPage.tsx
apps/web-client/src/pages/RootPage.tsx
apps/web-client/src/components/RequireTenant.tsx
apps/web-client/src/utils/tenant-resolve.ts
apps/web-client/src/hooks/useTenantSlug.ts
apps/web-client/src/stores/tenant.store.ts
apps/web-client/src/App.tsx
apps/web-client/src/pages/HomePage.tsx
apps/web-client/.env.example

# Tests infra
apps/api/scripts/check-mongodb.mjs
apps/api/src/test/integration-teardown.ts
.github/workflows/ci.yml
package.json                          # test:preflight, test:ci:strict, test:validate, test:e2e:install
e2e/playwright.config.ts              # locale es-AR, web-admin, SKIP_DELIVERY_WORKER
e2e/global-setup.ts
e2e/order-flow.spec.ts                # selectores i18n, pedido exacto en cocina
e2e/onboarding-flow.spec.ts           # nuevo

# Tests API
apps/api/src/modules/orders/order.service.test.ts
apps/api/src/modules/billing/billing.integration.test.ts
apps/api/src/modules/delivery/webhooks/mercadopago.integration.test.ts
apps/api/src/modules/delivery/delivery.simulate.integration.test.ts
apps/api/src/modules/delivery/delivery.ops.integration.test.ts
apps/api/src/modules/delivery/delivery-ops.service.test.ts

# Observabilidad Delivery IA
apps/api/src/modules/delivery/delivery-ops.service.ts
apps/api/src/modules/delivery/delivery.controller.ts
apps/api/src/modules/delivery/delivery.routes.ts
apps/api/src/workers/delivery.worker.ts
apps/api/src/config/env.ts              # skipDeliveryWorker
apps/api/src/app.ts
apps/web-admin/src/pages/DeliveryPage.tsx
packages/shared-types/src/index.ts    # DeliveryOpsSnapshot, etc.
```

---

## Deuda técnica / gotchas

- **Login admin** requiere `slug` + email + password.
- **web-client:** sin tenant → pantalla de selección; QR con `?tenant=` sigue siendo el flujo principal en producción.
- **Race tenant URL:** resuelto leyendo `?tenant=` de forma síncrona en `readInitialSlug()` y en `RequireTenant`.
- **Playwright en inglés:** config usar `locale: 'es-AR'`; tests usan regex bilingüe por si acaso.
- **E2E + Redis:** `SKIP_DELIVERY_WORKER=1` evita ruido ECONNREFUSED :6379; worker inactivo en panel ops durante E2E.
- **Atlas whitelist:** sin IP autorizada, `test:preflight` falla con mensaje explícito; `test:ci` omite integración (no falla).
- **Onboarding E2E** crea tenants `e2e-<timestamp>` en Atlas — acumulan datos; considerar cleanup.
- **Compilar `shared-types`** tras cambios de tipos antes de build API/admin.
- **Socket proxy Vite:** `ECONNABORTED` en consola es ruido si el badge muestra `● En vivo`.
- **Re-login** una vez en clientes tras cambio refresh token (sesiones viejas sin `refreshToken`).

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: Handoff_5.md (reemplaza Handoff_4.md)

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~97%: Delivery IA + observabilidad BullMQ; falta Meta/AFIP cliente real
- Fase 4 ~55%: multi-tenant web-client, QA validado, tests ampliados, CI workflow

Nuevo en Handoff 5:
- TenantSelectPage + RequireTenant (web-client multi-tenant completo)
- test:preflight / test:ci:strict / test:validate + GitHub Actions ci.yml
- Tests: 15 unit + 12 integración + E2E order-flow + onboarding-flow
- Observabilidad: GET /api/v1/delivery/ops + panel en /delivery
- SKIP_DELIVERY_WORKER para E2E; fixes Playwright i18n y tenant URL race

Demo: slug bistro-digital | admin@bistro-digital.app / admin123
Tests: npm run test:validate (Atlas + seed + Chromium)
Delivery ops: npm run docker:up + dev:api (sin SKIP) → admin /delivery

Siguiente tarea sugerida: super-admin SaaS o configurar MONGODB_URI en GitHub CI.
```

---

*Última actualización: junio 2026 — web-client multi-tenant, suite QA validada, observabilidad Delivery IA, cobertura tests ampliada.*
