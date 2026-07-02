# Handoff 7 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2026).  
Reemplaza y amplía `Handoff_6.md` con **dominio custom, OpenAPI enriquecido, audit log impersonación y onboarding ampliado (planes + email)**.

**Referencias:** `documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_6.md`

> Toda la documentación markdown del proyecto vive en `documentos/`.

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real), operador SaaS (super-admin).

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` |
| API | `http://localhost:3000` |
| OpenAPI / Swagger | `http://localhost:3000/api/docs` |
| Spec JSON | `http://localhost:3000/api/v1/openapi.json` |
| web-client | `http://localhost:5173` |
| web-admin | `http://localhost:3001` |
| web-kitchen | `http://localhost:3002` |
| Super-admin | `http://localhost:3001/platform/login` |
| Onboarding | `http://localhost:3001/onboarding` |
| Audit impersonación | `http://localhost:3001/platform/audit` |

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~97%** — falta cliente piloto Meta/AFIP real |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA + super-admin | ⚠️ **~90%** — dominio custom, OpenAPI, audit, onboarding planes/email hechos; faltan CI secret, billing Stripe, soft-delete tenant |

---

## Lo implementado en sesiones Handoff 7

### 1. Dominio custom por tenant

- Resolución tenant por `Host` (dominio custom o subdominio `{slug}.saas-base.com` / `{slug}.local`)
- `GET /api/v1/tenant/resolve?host=...` — público, usado por web-client
- `PATCH /api/v1/tenant/config` acepta `domain`
- UI en admin **Configuración → Dominio y menú QR** (CNAME target)
- Plantilla Nginx: `infra/nginx/tenant-proxy.conf.example`

**Env:** `PLATFORM_BASE_DOMAIN`, `CLIENT_BASE_URL`, `PLATFORM_CNAME_TARGET`

**Archivos clave:**
```
apps/api/src/utils/tenant-host.ts
apps/api/src/modules/tenant/tenant.service.ts
apps/web-client/src/utils/tenant-resolve.ts
apps/web-client/src/stores/tenant.store.ts
apps/web-admin/src/pages/SettingsPage.tsx
```

---

### 2. OpenAPI enriquecido

- **57 schemas**, **52 rutas** con request/response tipados y ejemplos
- Módulos: `openapi/schemas.ts`, `examples.ts`, `helpers.ts`
- Export CI: `npm run openapi:export` → artifact `openapi-spec` en GitHub Actions

---

### 3. Audit log de impersonación

- Colección MongoDB `ImpersonationAuditLog`
- Al impersonar: crea registro con `auditLogId` en respuesta
- Al salir: `POST /api/v1/platform/impersonation-logs/:id/end`
- `GET /api/v1/platform/impersonation-logs` — listado paginado (filtro `tenantSlug`)
- UI: `/platform/audit`

**Archivos clave:**
```
apps/api/src/modules/platform/impersonation-audit.model.ts
apps/api/src/modules/platform/impersonation-audit.service.ts
apps/web-admin/src/pages/PlatformAuditPage.tsx
apps/web-admin/src/stores/auth.store.ts          # exitImpersonation → end audit
```

---

### 4. Onboarding ampliado (planes + email bienvenida)

**API:**
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/onboarding/plans` | Planes starter / pro / enterprise con features |
| POST | `/api/v1/onboarding/register` | Acepta `plan`; envía email de bienvenida |

**Email (`EmailService`):**
- Dev: modo `console` (log en terminal)
- Prod: `RESEND_API_KEY` + `EMAIL_FROM` → Resend API
- Deshabilitar: `ONBOARDING_WELCOME_EMAIL=false`

**Wizard web-admin** (`/onboarding`) — 6 pasos:
1. Restaurante + slug
2. Marca (colores, idioma, moneda)
3. **Plan** (nuevo)
4. Administrador
5. Contenido inicial (menú demo, mesas)
6. Listo (muestra plan + estado email)

**Respuesta register** incluye: `tenant.plan`, `welcomeEmail`, `urls.login`

**Archivos clave:**
```
apps/api/src/data/onboarding-plans.data.ts
apps/api/src/services/email.service.ts
apps/api/src/modules/onboarding/onboarding.service.ts
apps/web-admin/src/pages/OnboardingPage.tsx
```

---

## Heredado de Handoff 6 (ya existía)

- Super-admin SaaS + impersonación (JWT `impersonatedBy`)
- OpenAPI base + E2E `platform-flow.spec.ts`
- Tests: preflight, CI workflow, delivery ops
- Ver `documentos/Handoff_6.md` para detalle completo

---

## API — rutas nuevas (resumen Handoff 7)

```
GET  /api/v1/tenant/resolve
PATCH /api/v1/tenant/config          # campo domain

GET  /api/v1/platform/impersonation-logs
POST /api/v1/platform/impersonation-logs/:auditLogId/end

GET  /api/v1/onboarding/plans
POST /api/v1/onboarding/register     # campo plan + welcomeEmail en response
```

---

## Variables de entorno nuevas

| Variable | Uso |
|----------|-----|
| `PLATFORM_BASE_DOMAIN` | Subdominios `{slug}.saas-base.com` |
| `CLIENT_BASE_URL` | URL menú QR por defecto |
| `PLATFORM_CNAME_TARGET` | Destino CNAME dominio custom |
| `ONBOARDING_WELCOME_EMAIL` | `false` deshabilita email bienvenida |
| `RESEND_API_KEY` | API Resend para email prod |
| `EMAIL_FROM` | Remitente (ej. `onboarding@tudominio.com`) |

Ver `apps/api/.env.example`.

---

## Cómo arrancar

```powershell
cd c:\Proyectos\Bistro_Digital
npm run seed
npm run docker:up
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
npm run test:unit                    # 31 tests (sin Atlas)
npm run test:preflight
npm run test:ci:strict               # unit + integración
npm run test:e2e                     # 3 specs Playwright
npm run test:validate                # pipeline completo
npm run openapi:export               # genera apps/api/dist/openapi.json
```

---

## Credenciales demo

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| Super-admin | `platform@saas-base.com` | `platform123` | `/platform/login` |
| Admin restaurante | `admin@bistro-digital.app` | `admin123` | `/login` slug `bistro-digital` |

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **CI GitHub `MONGODB_URI`** | 4 | Workflow listo; usar `npm run ci:setup-secret` o secret manual en GitHub |
| **Billing SaaS (Stripe)** | 4 | Planes en onboarding son informativos; sin cobro |
| **Invitación staff por email** | 4 | Solo email bienvenida al admin en onboarding |
| **E2E delivery con Redis/worker** | 4 | Simulador OK; E2E end-to-end pendiente |
| **Soft-delete tenant individual** | 4 | Solo cleanup `e2e-*` |
| **Gráfico crecimiento tenants** | 4 | — |
| **Meta/AFIP cliente real** | 3 | Staging listo |
| **Push FCM Flutter** | PRD | — |
| **RAG / embeddings** menú | PRD | — |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Configurar CI en GitHub**
   - Secret `MONGODB_URI`: `npm run ci:setup-secret` (gh CLI) o manual en Settings → Secrets
   - Atlas Network Access: `0.0.0.0/0` para runners de GitHub
   - Verificar jobs unit + integration-e2e + artifact `openapi-spec`

2. **Cliente piloto Meta + AFIP real**
   - Checklist `/connect-meta`, certificados AFIP, `API_PUBLIC_URL`, tunnel WhatsApp

3. **Billing SaaS (Stripe)**
   - Cobrar según plan elegido en onboarding
   - Webhook Stripe → actualizar `tenant.plan`

### Prioridad media

4. **Soft-delete tenant individual** — super-admin, no solo `e2e-*`
5. **E2E delivery con Redis** — worker real sin `SKIP_DELIVERY_WORKER`
6. **Invitación de staff por email** — admin invita mozo/cocina desde panel
7. **Gráfico crecimiento tenants** — dashboard `/platform`

### Prioridad baja

8. **Flutter mozo** — FCM, tema dinámico
9. **RAG / embeddings** en menú para Delivery IA
10. **Dominio custom en prod** — desplegar Nginx/Cloudflare con SSL real

---

## Deuda técnica / gotchas

- **Email onboarding:** sin `RESEND_API_KEY` solo loguea en consola (`mode: console`)
- **Planes pro/enterprise en onboarding:** se asignan al tenant pero sin billing; super-admin puede cambiar plan en `/platform`
- **Dominio custom en dev:** usar `hosts` + `GET /tenant/resolve` o `?tenant=slug`
- **Onboarding E2E** acumula tenants `e2e-*` — limpiar en super-admin
- **Compilar `shared-types`** tras cambios de tipos
- **Docs del proyecto:** solo en `documentos/` (no en raíz)

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_7.md

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~97%: falta Meta/AFIP cliente real
- Fase 4 ~90%: dominio custom, OpenAPI, audit impersonación, onboarding planes+email

Nuevo en Handoff 7:
- Dominio custom: /tenant/resolve, PATCH domain, nginx template
- OpenAPI: 57 schemas, ejemplos, npm run openapi:export, CI artifact
- Audit impersonación: /platform/audit, auditLogId, end session
- Onboarding: paso Plan, GET /onboarding/plans, email bienvenida (Resend/console)

Demo: platform@saas-base.com / platform123 → /platform/login
Onboarding: http://localhost:3001/onboarding
Tests: npm run test:validate

Siguiente sugerido: CI MONGODB_URI secret, Stripe billing, o soft-delete tenant.
```

---

*Última actualización: junio 2026 — Dominio custom, OpenAPI enriquecido, audit impersonación, onboarding planes + email bienvenida.*
