# Handoff 10 — Bistró Digital

Documento de handoff para continuidad con otro agente (julio 2026).  
Reemplaza `Handoff_9.md` con **billing SaaS Stripe configurado, probado E2E en local, commiteado y pusheado**, **CI GitHub verde** tras el push.

**Referencias:** `documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_9.md`

> Toda la documentación markdown del proyecto vive en `documentos/`.

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real/homologación), operador SaaS (super-admin), **cobro de planes al restaurante vía Stripe**.

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| GitHub | `arielp79/Bistro-Digital` (rama `master`) |
| Último commit | `a92b3aa` — `feat(billing): integrar suscripciones SaaS con Stripe` |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` |
| API | `http://localhost:3000` |
| OpenAPI / Swagger | `http://localhost:3000/api/docs` |
| web-admin | `http://localhost:3001` |
| Onboarding | `http://localhost:3001/onboarding` |
| Settings (plan Stripe) | `http://localhost:3001/settings` |
| Super-admin | `http://localhost:3001/platform/login` |
| Cliente piloto | `http://localhost:3001/pilot-setup` |

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~98%** — Gemini OK; infra túnel Meta lista; falta app Meta del restaurante + certs AFIP |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA + super-admin + Stripe | ⚠️ **~99%** — Stripe E2E OK; **soft-delete tenant OK**; E2E Playwright billing opcional |

---

## ⚡ Próximo paso (para el agente entrante)

> **Objetivo inmediato:** avanzar **cliente piloto Meta** (Fase 3) o **E2E delivery con Redis** (Fase 4).

### Opción A — Meta piloto real (Fase 3)

1. `npm run pilot:preflight` + `npm run pilot:tunnel`
2. Restaurante crea app en Meta Business Suite (WhatsApp Cloud API).
3. Configurar webhook con `API_PUBLIC_URL` del túnel.
4. Probar mensaje → worker delivery → respuesta IA.

### Opción B — E2E delivery con Redis (Fase 4)

1. `npm run docker:up` (Redis)
2. Quitar `SKIP_DELIVERY_WORKER` en tests E2E
3. Validar flujo delivery en Playwright

---

## Lo logrado en sesión Handoff 9 → 10

### 1. Stripe SaaS — configurado y verificado E2E ✅

| Check | Resultado |
|-------|-----------|
| Stripe CLI instalado (`winget`) + `npm run stripe:login` | OK |
| `apps/api/.env` con `STRIPE_*` + `WEB_ADMIN_URL` | OK (local, no commiteado) |
| `npm run stripe:preflight` | 100% verde |
| Checkout → pago test → webhook → `tenant.plan = pro` | OK |
| Commit + push `a92b3aa` | OK |
| CI GitHub run `28670826924` | ✅ unit + integration-e2e |
| `npm run ci:check` local | 34/34 unit OK |

**Productos Stripe (modo test — cuenta operador):**

| Plan | Producto | Price ID activo | Monto |
|------|----------|-----------------|-------|
| Pro | Bistro Digital - Pro | `price_1Tp7kuQWltBTtsV9lSZctIsy` | USD $2/mes |
| Enterprise | Bistro Digital - Enterprise | `price_1Tp2hFQWltBTtsV97u1INjKZ` | USD $1/mes |

> Los Price IDs viven en `apps/api/.env` (local). Si se crean precios nuevos en Dashboard, actualizar `.env` y reiniciar API.

**Precios ARS viejos** (`price_1Tp2g...` $100.000 ARS) están **inactivos** — causaban bloqueo por Stripe Radar.

### 2. Scripts y tooling nuevos

| Comando | Descripción |
|---------|-------------|
| `npm run stripe:preflight` | Verifica variables en `apps/api/.env` |
| `npm run stripe:login` | Login CLI (funciona sin PATH tras winget) |
| `npm run stripe:listen` | Reenvía webhooks a `localhost:3000/api/v1/webhooks/stripe` |

Archivos: `scripts/stripe-preflight.ps1`, `stripe-listen.ps1`, `stripe-cli.ps1`, `resolve-stripe-cli.ps1`

### 3. Mejoras de código en checkout (commit `a92b3aa`)

- `wallet_options.link.display = 'never'` — evita Stripe Link en checkout SaaS
- `adaptive_pricing.enabled = false` — evita conversiones de moneda inesperadas
- `error.middleware.ts` — expone mensajes de error Stripe al frontend (ej. `No such price`)

### 5. Soft-delete tenant (super-admin) — Handoff 10 sesión 2 ✅

| Componente | Detalle |
|------------|---------|
| API | `DELETE /api/v1/platform/tenants/:tenantId` |
| Efecto | `tenant.deletedAt` + `isActive=false`; usuarios del tenant soft-deleted + refresh tokens limpiados |
| Protegido | `bistro-digital` (demo) → 403 |
| UI | Botón **Eliminar** en `/platform/tenants/:id` |
| Tests | 8/8 platform integration OK |

`DELETE /api/v1/platform/tenants/e2e-cleanup` sigue haciendo **hard-delete** solo de slugs `e2e-*`.

---

```
Preflight:     [OK] todas las variables Stripe
Checkout:      redirect a checkout.stripe.com (cs_test_...)
Pago:          4242 4242 4242 4242 · USD $2/mes
Webhook:       checkout.session.completed → 200 en stripe:listen
Plan MongoDB:  tenant.plan = pro, stripeSubscriptionStatus = active
Settings UI:   plan Pro visible en /settings
```

---

## Cómo arrancar Stripe en local (referencia rápida)

```powershell
cd c:\Proyectos\Bistro_Digital

# Terminal A
npm run dev:api

# Terminal B
npm run stripe:listen
# Copiar whsec_... a STRIPE_WEBHOOK_SECRET en .env → reiniciar API

# Terminal C
npm run dev:admin
# http://localhost:3001/onboarding o /settings
```

**Tarjeta test:** `4242 4242 4242 4242` · País **United States** recomendado · CVC `123`

**Importante:** ejecutar solo el comando npm, sin pegar texto extra de la documentación:
```powershell
npm run stripe:listen    # correcto
npm run dev:admin        # correcto
```

---

## Variables de entorno — Stripe SaaS

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Sí | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Recomendada | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Sí (webhooks) | `whsec_...` de `npm run stripe:listen` en dev |
| `STRIPE_PRICE_PRO` | Sí | Price ID activo del plan Pro |
| `STRIPE_PRICE_ENTERPRISE` | Sí | Price ID activo del plan Enterprise |
| `WEB_ADMIN_URL` | Sí | `http://localhost:3001` |

Ver sección en `apps/api/.env.example`. **Nunca commitear** `apps/api/.env`.

---

## API billing SaaS (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/onboarding/plans` | Público | Planes + `stripeConfigured` |
| GET | `/api/v1/subscriptions/plans` | Público | Igual post-login |
| POST | `/api/v1/subscriptions/checkout` | Admin | → `{ url, sessionId }` |
| POST | `/api/v1/subscriptions/portal` | Admin | Portal facturación Stripe |
| POST | `/api/v1/webhooks/stripe` | Firma Stripe | Actualiza `tenant.plan` |

**Archivos clave:**
```
apps/api/src/modules/subscriptions/stripe-saas.service.ts
apps/api/src/modules/delivery/webhooks/stripe.controller.ts
apps/web-admin/src/pages/OnboardingPage.tsx
apps/web-admin/src/pages/SettingsPage.tsx
```

---

## Cómo correr tests

```powershell
npm run ci:check              # build packages + 34 unit + openapi
npm run test:integration      # 25 tests (requiere MONGODB_URI)
npm run test:ci:strict        # preflight + unit + integración
npm run test:e2e              # order-flow, onboarding-flow, platform-flow
```

Tests Stripe:
```
apps/api/src/modules/subscriptions/stripe-saas.service.test.ts
apps/api/src/modules/subscriptions/subscriptions.integration.test.ts
apps/api/src/modules/onboarding/onboarding.register.integration.test.ts
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
| **Soft-delete tenant individual** | 4 | ✅ Implementado |
| **E2E Playwright flujo Stripe** | 4 | Opcional |
| **Cliente piloto Meta real** | 3 | Infra túnel OK; falta app Meta del restaurante |
| **AFIP homologación real** | 3 | Código + script listos; falta certificados operador |
| **Invitación staff por email** | 4 | — |
| **E2E delivery con Redis/worker** | 4 | E2E usa `SKIP_DELIVERY_WORKER=1` |
| **Push FCM Flutter** | PRD | — |
| **RAG / embeddings** menú | PRD | — |
| **Node 22 en CI** | DevOps | Warning Node 20 deprecated en runners |

---

## Deuda técnica / gotchas (actualizado)

- **Price ID ≠ monto:** copiar `price_1...` del Dashboard, no el número en pesos/dólares
- **Stripe Radar:** montos altos en ARS + tarjeta US → bloqueo `highest_risk_level`; usar USD bajos en test o desactivar regla Radar en test
- **`test_mode_live_card`:** tarjetas reales rechazadas en modo test (esperado)
- **Stripe Link:** desactivado en código; si reaparece, revisar Dashboard → Link settings
- **`STRIPE_WEBHOOK_SECRET`:** en dev usar el de `stripe listen`, no el del Dashboard
- **Reiniciar API** tras cambiar `.env` o Price IDs
- **PATH Stripe CLI:** si `stripe` no se reconoce, usar `npm run stripe:login` o refrescar PATH
- **Redis ECONNREFUSED:** Docker apagado; no bloquea Stripe; opcional `SKIP_DELIVERY_WORKER=1` en `.env`
- **Dos Stripe distintos:** billing SaaS (operador) vs pagos menú QR (tenant `config.payments.stripe`)
- **`Mongo DB.txt`:** archivo local con credenciales — no commitear

---

## Prompt para nuevo agente

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_10.md

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~98%: Gemini OK; infra Meta lista; falta app Meta restaurante + certs AFIP
- Fase 4 ~98%: Stripe SaaS E2E OK en local; commit a92b3aa pusheado; CI verde

Completado en Handoff 10:
- Stripe CLI + .env configurado + checkout 4242 OK + plan pro activo
- Scripts npm run stripe:preflight|login|listen
- Fix Link, adaptive_pricing, errores Stripe en API
- CI GitHub run 28670826924 verde (unit + integration-e2e)

PRÓXIMO PASO: soft-delete tenant en super-admin (Fase 4)
  O: Meta piloto real con app WhatsApp del restaurante (Fase 3)

Demo: platform@saas-base.com / platform123
Tarjeta test Stripe: 4242 4242 4242 4242 (US)
```

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_10.md

Stripe SaaS: configurado, E2E local OK, pusheado (a92b3aa), CI verde.
PRÓXIMO: soft-delete tenant (super-admin) o Meta piloto.

npm run dev:api + npm run stripe:listen + npm run dev:admin
Tarjeta: 4242 4242 4242 4242
```

---

*Última actualización: 3 julio 2026 — Stripe E2E verificado, commit pusheado, CI verde, Handoff 10.*
