# Handoff 6 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2026).  
Reemplaza y amplía `Handoff_5.md` con **Super-admin SaaS completo, impersonación de admin, y documentación OpenAPI/Swagger**.

**Referencias:** `PRD_SaaS_Restaurantes.md` · `Handoff_5.md` · `Handoff_4.md`

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real), operador SaaS (super-admin).

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` (slug, no ObjectId) |
| API | `http://localhost:3000` |
| OpenAPI / Swagger | `http://localhost:3000/api/docs` |
| Spec JSON | `http://localhost:3000/api/v1/openapi.json` |
| web-client | `http://localhost:5173` |
| web-admin | `http://localhost:3001` |
| web-kitchen | `http://localhost:3002` |
| Super-admin | `http://localhost:3001/platform/login` |

**Nuevos tenants:** wizard en `http://localhost:3001/onboarding` → auto-login al panel → link menú QR con `?tenant=<slug>`.

---

## Arquitectura del monorepo

```
apps/
  api/              → Express + TS + MongoDB Atlas + Socket.IO + BullMQ (:3000)
  web-client/       → React/Vite/Tailwind — cliente QR y delivery (:5173)
  web-kitchen/      → React — Kanban cocina (:3002)
  web-admin/        → React — panel admin + super-admin (:3001)
  mobile-waiter/    → Flutter — app mozo
packages/
  shared-types/     → Tipos TS compartidos (Platform*, Impersonate*, DeliveryOps*, etc.)
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → Redis + MinIO únicamente (sin Mongo local)
e2e/
  order-flow.spec.ts, onboarding-flow.spec.ts, platform-flow.spec.ts
.github/workflows/
  ci.yml            → unit siempre; integración + E2E si secret MONGODB_URI
```

**Convenciones (PRD):** `tenantId` en queries · respuestas `{ data, error }` · sockets `entity:action` · JWT + RBAC · `encrypt()` para tokens de terceros.

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~97%** — falta cliente piloto Meta/AFIP real |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA + super-admin | ⚠️ **~80%** — super-admin, OpenAPI y QA ampliado hechos; faltan dominio custom, CI secret GitHub, billing SaaS |

---

## Heredado de Handoff 5 (ya existía — no reimplementar)

Resumen — detalle en `Handoff_5.md`:

- web-client multi-tenant (`TenantSelectPage`, `RequireTenant`, resolución slug sin race)
- QA: `test:preflight`, `test:ci:strict`, `test:validate`, CI GitHub Actions
- Tests Handoff 5: billing/MP/delivery-ops integración, E2E order-flow + onboarding-flow
- Observabilidad Delivery IA: `GET /api/v1/delivery/ops` + panel admin `/delivery`
- `SKIP_DELIVERY_WORKER=1` en E2E Playwright
- Todo lo de Handoff 4 (Kanban admin, onboarding, AFIP demo, Meta staging, etc.)

---

## Lo implementado en sesiones Handoff 6

### 1. Super-admin SaaS (API + panel)

**Rol nuevo:** `platform_admin` — usuario sin `tenantId`, creado en seed.

**API** — prefijo `/api/v1/platform`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login sin `X-Tenant-ID` |
| GET | `/metrics` | Métricas globales (tenants, ingresos, usuarios) |
| GET | `/tenants` | Listado paginado (`search`, `plan`, `includeInactive`) |
| GET | `/tenants/:tenantId` | Detalle (integraciones, admins, stats por canal) |
| PATCH | `/tenants/:tenantId/status` | Activar / suspender (`{ isActive }`) |
| PATCH | `/tenants/:tenantId/plan` | Cambiar plan (`starter` \| `pro` \| `enterprise`) |
| POST | `/tenants/:tenantId/impersonate` | Entrar como admin del restaurante |
| DELETE | `/tenants/e2e-cleanup` | Borrar tenants `e2e-*` y todos sus datos |

**Panel web-admin:**

| Ruta | Página |
|------|--------|
| `/platform/login` | Login super-admin (sin slug) |
| `/platform` | Listado + métricas + filtros + paginación |
| `/platform/tenants/:id` | Detalle, plan, integraciones, admins, enlaces |

**Archivos API:**

```
apps/api/src/modules/platform/platform.service.ts
apps/api/src/modules/platform/platform.controller.ts
apps/api/src/modules/platform/platform.routes.ts
apps/api/src/modules/auth/user.model.ts          # platform_admin, tenantId opcional
apps/api/src/modules/auth/auth.service.ts        # platformLogin, impersonateTenantAdmin
apps/api/src/middlewares/auth.middleware.ts      # requirePlatformAdmin
apps/api/src/create-app.ts                       # mount /platform
packages/shared-types/src/index.ts               # PlatformTenantSummary, PlatformMetrics, etc.
```

**Archivos web-admin:**

```
apps/web-admin/src/stores/platform-auth.store.ts
apps/web-admin/src/pages/PlatformLoginPage.tsx
apps/web-admin/src/pages/PlatformDashboardPage.tsx
apps/web-admin/src/pages/PlatformTenantDetailPage.tsx
apps/web-admin/src/components/PlatformLayout.tsx
apps/web-admin/src/lib/api.ts                    # platformFetch, platformLogin
apps/web-admin/src/App.tsx                       # rutas /platform/*
apps/web-admin/src/pages/LoginPage.tsx           # link "Super-admin"
apps/web-admin/src/main.tsx                      # sync tokens refresh
```

**Seed — super-admin:**

```
Email:    platform@saas-base.com
Password: platform123
Vars:     PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD
```

---

### 2. Impersonación (“entrar como admin”)

**Flujo:**

1. Super-admin logueado en `/platform`
2. Detalle o listado → **Entrar como admin** / **Entrar**
3. `POST /api/v1/platform/tenants/:id/impersonate` → JWT del admin del tenant con claim `impersonatedBy`
4. Redirige a `/` (panel admin del restaurante)
5. Banner amarillo: *“Estás viendo el panel como administrador de…”*
6. **Volver a super-admin** → restaura sesión platform sin re-login

**Seguridad:**

- Token impersonado tiene `role: admin` pero **no** accede a `/api/v1/platform/*` (403)
- Refresh preserva `impersonatedBy`
- Sesión platform queda en `platform-auth.store` (persistida); memoria usa token admin durante impersonación
- Rutas `/platform/*` bloqueadas en UI mientras `isImpersonating()`

**Archivos:**

```
apps/api/src/modules/auth/auth.service.ts        # impersonateTenantAdmin
apps/api/src/utils/jwt.ts                        # impersonatedBy en payload
packages/shared-types/src/index.ts             # ImpersonateResponse, ImpersonationInfo
apps/web-admin/src/stores/auth.store.ts          # startImpersonation, exitImpersonation
apps/web-admin/src/components/ImpersonationBanner.tsx
apps/web-admin/src/components/AdminLayout.tsx
```

---

### 3. OpenAPI / Swagger

**URLs:**

- UI interactiva: `http://localhost:3000/api/docs`
- Spec JSON: `http://localhost:3000/api/v1/openapi.json`

**Cobertura:** ~50 endpoints en 15 tags (Auth, Tenant, Menú, Pedidos, Mesas, Stock, Analytics, Usuarios, Delivery, Pagos, Facturación, Platform, Webhooks, Onboarding, Sistema).

**Seguridad documentada:**

- `bearerAuth` — JWT
- `tenantHeader` — `X-Tenant-ID`

**Config:**

```env
API_DOCS_ENABLED=true   # false para ocultar en producción
```

**Archivos:**

```
apps/api/src/openapi/components.ts
apps/api/src/openapi/spec.ts
apps/api/src/openapi/setup-docs.ts
apps/api/src/openapi/spec.test.ts
apps/api/src/openapi/docs.routes.test.ts
apps/api/src/create-app.ts           # setupApiDocs antes de helmet
apps/api/package.json                # swagger-ui-express
```

**Nota:** Swagger se monta **antes** de `helmet()` para evitar bloqueo de assets.

---

### 4. Tests ampliados (Handoff 6)

#### Unitarios (21 tests, 8 archivos)

| Archivo | Qué prueba |
|---------|------------|
| `openapi/spec.test.ts` | Metadatos y rutas clave en spec |
| `openapi/docs.routes.test.ts` | GET `/api/v1/openapi.json` y `/api/docs` |
| (+ 6 archivos Handoff 5) | geocoder, AI, onboarding, orders, delivery-ops, tenant-access |

#### Integración (18 tests, 8 archivos)

| Archivo | Qué prueba |
|---------|------------|
| `platform/platform.integration.test.ts` | Login platform, métricas, listado, detalle, plan, impersonación, 403 cross-role |
| (+ 7 archivos Handoff 5) | auth, orders, onboarding, billing, MP, delivery simulate/ops |

#### E2E Playwright (3 specs)

| Archivo | Flujo |
|---------|-------|
| `order-flow.spec.ts` | Menú QR → pedido → cocina |
| `onboarding-flow.spec.ts` | Wizard → primer pedido |
| `platform-flow.spec.ts` | **Nuevo:** super-admin login → detalle → impersonar → volver |

---

## Delivery IA — qué IA se necesita (referencia)

WhatsApp e Instagram **no usan IA de Meta** para pedidos. El flujo es:

```
Meta Webhook → BullMQ → Worker → OpenAI → respuesta vía Meta API
```

| Uso | Tecnología | Variable |
|-----|------------|----------|
| Entender mensajes de texto | **OpenAI GPT-4o** (default) | `OPENAI_API_KEY`, `DELIVERY_AI_MODEL` |
| Validar comprobantes (imagen) | **GPT-4o Vision** (mismo modelo) | Misma key |
| Fallback sin API key | Regex / keywords del menú | Automático en `ai.service.ts` |

**No implementado aún:** Anthropic fallback, Google Vision, RAG/embeddings (`text-embedding-3-small` del PRD).

**Infra adicional para producción:** Redis (BullMQ), `API_PUBLIC_URL`, tokens Meta en settings del tenant, `npm run tunnel:whatsapp` en dev.

---

## API — rutas platform (resumen)

```
/api/v1/platform
  POST /auth/login
  GET  /metrics
  GET  /tenants
  GET  /tenants/:tenantId
  PATCH /tenants/:tenantId/status
  PATCH /tenants/:tenantId/plan
  POST /tenants/:tenantId/impersonate
  DELETE /tenants/e2e-cleanup
```

Rutas tenant/delivery/webhooks: ver `Handoff_5.md` y OpenAPI en `/api/docs`.

---

## web-admin — rutas (actualizado)

| Ruta | Página |
|------|--------|
| `/platform/login` | Login super-admin |
| `/platform` | Dashboard SaaS (listado tenants) |
| `/platform/tenants/:id` | Detalle + impersonar |
| `/login` | Login restaurante (requiere slug) |
| `/onboarding` | Alta restaurante (público) |
| `/delivery` | Simulador + observabilidad BullMQ |
| `/orders` | Kanban en vivo |
| (resto) | Ver Handoff_4/5 |

---

## Variables de entorno relevantes

| Variable | Uso |
|----------|-----|
| `MONGODB_URI` | Atlas **obligatorio** |
| `REDIS_URL` | BullMQ + worker Delivery IA |
| `SKIP_DELIVERY_WORKER` | `1` en E2E Playwright |
| `OPENAI_API_KEY` | Delivery IA (opcional en dev — hay fallback) |
| `DELIVERY_AI_MODEL` | Default `gpt-4o` |
| `PLATFORM_ADMIN_EMAIL` | Seed super-admin |
| `PLATFORM_ADMIN_PASSWORD` | Seed super-admin |
| `API_DOCS_ENABLED` | `false` deshabilita `/api/docs` |
| `API_URL` | URL base en spec OpenAPI |

Ver `apps/api/.env.example`.

---

## Cómo arrancar

```powershell
cd c:\Proyectos\Bistro_Digital

npm run seed
npm run docker:up          # Redis + MinIO
npm run dev:api
npm run dev:admin
# opcional: dev:web, dev:kitchen
```

**Compilar packages tras cambiar tipos:**

```powershell
cd packages/shared-types && npm run build
cd ../validation-schemas && npm run build
```

---

## Cómo correr tests

```powershell
# Solo unitarios (sin Atlas) — 21 tests
npm run test:unit

# Con Atlas
npm run test:preflight
npm run test:ci:strict               # 21 unit + 18 integración
npm run test:e2e:install             # primera vez
npm run test:e2e                     # 3 specs

# Pipeline completo
npm run test:validate
```

**Solo E2E platform:**

```powershell
npx playwright test -c e2e/playwright.config.ts e2e/platform-flow.spec.ts
```

---

## Credenciales demo (seed)

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| **Super-admin** | `platform@saas-base.com` | `platform123` | `/platform/login` |
| Admin restaurante | `admin@bistro-digital.app` | `admin123` | `/login` slug `bistro-digital` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` | app mozo |
| Cocina | `cocina@bistro-digital.app` | `cocina123` | web-kitchen |
| Caja | `caja@bistro-digital.app` | `caja123` | web-kitchen |

**URLs demo:**

- Super-admin: `http://localhost:3001/platform/login`
- OpenAPI: `http://localhost:3000/api/docs`
- Menú QR: `http://localhost:5173/menu?table=<tableId>&tenant=bistro-digital`
- Onboarding: `http://localhost:3001/onboarding`

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **CI en GitHub con `MONGODB_URI`** | 4 | Workflow listo; falta secret en repo |
| **E2E delivery con Redis/worker real** | 4 | Simulador mock OK; E2E end-to-end pendiente |
| **Dominio custom** por tenant | 4 | Proxy SSL, resolver subdominio en prod |
| **Planes y billing SaaS (Stripe)** | 4 | Cobrar al restaurante |
| **WhatsApp/Instagram producción** | 3 | Infra staging lista; sin cliente piloto |
| **AFIP homologación/producción** | 3 | Modo demo OK |
| **OpenAPI: schemas detallados** | 4 | Spec con summaries; faltan request/response bodies completos |
| **Push FCM** Flutter mozo | PRD | — |
| **RAG / embeddings** menú | PRD IA | — |
| **Onboarding:** email invitación, planes | 4 | Solo self-service básico |
| **Audit log impersonación** | 4 | JWT tiene `impersonatedBy`; sin tabla de auditoría |
| **Eliminar tenant individual** (no solo e2e-*) | 4 | Solo cleanup masivo `e2e-*` |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Configurar CI en GitHub**
   - Secret `MONGODB_URI` en el repo
   - Verificar job `integration-e2e` en `.github/workflows/ci.yml`
   - Incluir `platform-flow.spec.ts` en el pipeline E2E

2. **Cliente piloto Meta + AFIP real**
   - Checklist desde `/connect-meta`
   - Certificados AFIP en settings
   - `npm run tunnel:whatsapp` + `API_PUBLIC_URL`
   - `OPENAI_API_KEY` para Delivery IA en producción

3. **Dominio custom por tenant**
   - Proxy dinámico + SSL
   - Resolver tenant por subdominio (base en `extractSlugFromHostname` web-client)

### Prioridad media

4. **Enriquecer OpenAPI**
   - Request/response schemas completos desde `shared-types`
   - Ejemplos reales (login, crear pedido, impersonate)
   - Exportar spec en CI como artifact

5. **E2E delivery con Redis**
   - `docker:up` antes de E2E
   - Spec: simulador admin → sesión → pedido (sin `SKIP_DELIVERY_WORKER`)
   - Job CI opcional con Redis

6. **Super-admin: mejoras**
   - Audit log de impersonaciones
   - Eliminar tenant individual (soft delete)
   - Gráfico crecimiento tenants en el tiempo

### Prioridad baja

7. **Planes y billing SaaS** — Stripe  
8. **Flutter mozo** — FCM, tema dinámico  
9. **RAG / embeddings** en menú para Delivery IA  
10. **Onboarding** — invitación email, selección de plan  

---

## Archivos clave añadidos/modificados (Handoff 6)

```
# Super-admin API
apps/api/src/modules/platform/platform.service.ts
apps/api/src/modules/platform/platform.controller.ts
apps/api/src/modules/platform/platform.routes.ts
apps/api/src/modules/platform/platform.integration.test.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/user.model.ts
apps/api/src/middlewares/auth.middleware.ts
apps/api/src/utils/jwt.ts
apps/api/src/scripts/seed.ts
apps/api/src/data/starter-tenant.data.ts          # slug 'platform' reservado
apps/api/src/config/env.ts                        # apiDocsEnabled
apps/api/src/create-app.ts

# OpenAPI
apps/api/src/openapi/components.ts
apps/api/src/openapi/spec.ts
apps/api/src/openapi/setup-docs.ts
apps/api/src/openapi/spec.test.ts
apps/api/src/openapi/docs.routes.test.ts
apps/api/package.json                             # swagger-ui-express
apps/api/.env.example                             # PLATFORM_*, API_DOCS_ENABLED

# Super-admin web-admin
apps/web-admin/src/stores/platform-auth.store.ts
apps/web-admin/src/stores/auth.store.ts           # impersonation
apps/web-admin/src/pages/PlatformLoginPage.tsx
apps/web-admin/src/pages/PlatformDashboardPage.tsx
apps/web-admin/src/pages/PlatformTenantDetailPage.tsx
apps/web-admin/src/components/PlatformLayout.tsx
apps/web-admin/src/components/ImpersonationBanner.tsx
apps/web-admin/src/components/AdminLayout.tsx
apps/web-admin/src/lib/api.ts
apps/web-admin/src/App.tsx
apps/web-admin/src/main.tsx
apps/web-admin/src/pages/LoginPage.tsx

# Tipos compartidos
packages/shared-types/src/index.ts                # platform_admin, Platform*, Impersonate*

# E2E
e2e/platform-flow.spec.ts
```

---

## Deuda técnica / gotchas

- **Dos sesiones en web-admin:** `platform-auth.store` y `auth.store` comparten `setAccessToken` en memoria — durante impersonación solo el token admin está en memoria; platform persiste en zustand.
- **Salir de impersonación:** `exitImpersonation()` es async; restaura tokens platform antes de navegar.
- **`/platform` bloqueado** mientras `isImpersonating()` — evita llamadas API con token incorrecto.
- **Login admin** sigue requiriendo slug + email + password (distinto de super-admin).
- **OpenAPI:** montada antes de helmet; deshabilitar con `API_DOCS_ENABLED=false` en prod si no se quiere exponer.
- **Compilar `shared-types`** tras cambios de tipos.
- **Onboarding E2E** acumula tenants `e2e-*` — usar **Limpiar tenants E2E** en super-admin o `DELETE /platform/tenants/e2e-cleanup`.
- **Atlas whitelist** necesaria para integración/E2E completos.
- **Delivery IA sin `OPENAI_API_KEY`:** fallback básico por keywords — no apto para producción conversacional.

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: Handoff_6.md (reemplaza Handoff_5.md)

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~97%: Delivery IA + observabilidad; falta Meta/AFIP cliente real
- Fase 4 ~80%: super-admin, impersonación, OpenAPI, QA ampliado; faltan dominio custom, CI secret, billing SaaS

Nuevo en Handoff 6:
- Super-admin: rol platform_admin, API /api/v1/platform/*, panel /platform
- Impersonar admin de restaurante (JWT impersonatedBy + banner UI)
- OpenAPI: /api/docs + /api/v1/openapi.json (~50 endpoints)
- Tests: 21 unit + 18 integración + 3 E2E (platform-flow.spec.ts)

Demo super-admin: platform@saas-base.com / platform123 → /platform/login
Demo restaurante: bistro-digital | admin@bistro-digital.app / admin123
OpenAPI: http://localhost:3000/api/docs
Tests: npm run test:validate

Siguiente tarea sugerida: configurar MONGODB_URI en GitHub CI, o dominio custom por tenant.
```

---

*Última actualización: junio 2026 — Super-admin SaaS, impersonación, OpenAPI/Swagger, E2E platform-flow.*
