# Handoff 9 — Bistró Digital

Documento de handoff para continuidad con otro agente (julio 2026).  
Reemplaza y amplía `Handoff_8.md` con **billing SaaS Stripe implementado (código listo)**, **CI verde en GitHub**, **QA ejecutado** y **modo AFIP homologación**.

**Referencias:** `documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_8.md`

> Toda la documentación markdown del proyecto vive en `documentos/`.

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real/homologación), operador SaaS (super-admin), **cobro de planes al restaurante vía Stripe**.

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| GitHub | `arielp79/Bistro-Digital` (rama `master`) |
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
| **Fase 4** | Onboarding + white-label + OpenAPI + QA + super-admin | ⚠️ **~95%** — Stripe **código listo**; falta configurar `.env` + probar flujo; soft-delete pendiente |

---

## ⚡ Próximo paso (para el agente entrante)

> **Objetivo inmediato:** instalar Stripe CLI, cargar keys en `apps/api/.env` y verificar el flujo checkout → webhook → `tenant.plan`.

### Checklist operador (en orden)

1. **Instalar Stripe CLI (Windows)**
   ```powershell
   winget install Stripe.StripeCli
   stripe login
   ```

2. **Crear productos en Stripe Dashboard (modo test)**
   - Ir a https://dashboard.stripe.com/test/products
   - Crear producto **Pro** (suscripción mensual) → copiar `price_...`
   - Crear producto **Enterprise** (suscripción mensual) → copiar `price_...`
   - Developers → API keys → copiar `sk_test_...` y `pk_test_...`

3. **Completar `apps/api/.env`** (descomentar sección Stripe en `.env.example`)
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   WEB_ADMIN_URL=http://localhost:3001
   # STRIPE_WEBHOOK_SECRET se obtiene en el paso 5
   ```

4. **Verificar preflight**
   ```powershell
   npm run stripe:preflight
   ```
   Debe quedar en verde todo excepto `STRIPE_WEBHOOK_SECRET` (aún no existe).

5. **Arrancar API + listener de webhooks**
   ```powershell
   # Terminal A
   npm run dev:api

   # Terminal B
   npm run stripe:listen
   ```
   Copiar el `whsec_...` que imprime el listener → pegar en `STRIPE_WEBHOOK_SECRET` en `.env` → **reiniciar API**.

6. **Probar flujo end-to-end**
   ```powershell
   # Terminal C
   npm run dev:admin
   ```
   - Ir a `http://localhost:3001/onboarding`
   - Registrar restaurante nuevo con plan **Pro**
   - Si Stripe está configurado: tenant arranca en `starter` y aparece botón **Pagar con Stripe**
   - Checkout con tarjeta test: `4242 4242 4242 4242`, cualquier fecha/CVC
   - Tras webhook: verificar en `/settings` que `plan` = `pro` y status Stripe = `active`
   - Alternativa: tenant existente → `/settings` → upgrade Pro/Enterprise o portal de facturación

7. **Entregable esperado**
   - Informe breve: preflight OK, checkout OK, webhook recibido, plan actualizado en MongoDB
   - Si algo falla: logs API (`[Stripe Webhook]`) + output de `stripe listen`

**No commitear** `.env` ni secrets. Los cambios de código Stripe **aún no están commiteados** — preguntar al usuario antes de commit/push.

---

## Lo implementado en sesiones Handoff 9

### 1. Billing SaaS con Stripe (código completo — sin configurar en `.env`)

**Distinción importante:** esto cobra al **restaurante** por el plan SaaS (Pro/Enterprise). Es distinto del flag `config.payments.stripe` que habilita Stripe como método de pago del menú QR al consumidor final.

**API — rutas nuevas:**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/onboarding/plans` | Público | Planes con `stripeConfigured` y `billing.checkoutAvailable` |
| GET | `/api/v1/subscriptions/plans` | Público | Misma info (panel admin post-login) |
| POST | `/api/v1/subscriptions/checkout` | Admin + tenant | Crea sesión Stripe Checkout → `{ url, sessionId }` |
| POST | `/api/v1/subscriptions/portal` | Admin + tenant | Customer portal Stripe → `{ url }` |
| POST | `/api/v1/webhooks/stripe` | Firma Stripe | Eventos: `checkout.session.completed`, `customer.subscription.updated/deleted` |

**Onboarding:**

- `GET /api/v1/onboarding/plans` ahora devuelve `{ stripeConfigured, plans[] }` (antes era solo array)
- `POST /api/v1/onboarding/register` con plan pago + Stripe configurado:
  - Tenant se crea en plan `starter` hasta confirmar pago
  - Respuesta incluye `billing: { requestedPlan, checkoutRequired: true }`
- Sin Stripe configurado: asigna el plan directamente (`checkoutRequired: false`)

**Modelo tenant — campos nuevos:**

```typescript
stripeCustomerId: string;
stripeSubscriptionId: string;
stripeSubscriptionStatus: string;  // ej. active, canceled
```

**Webhook → lógica de plan:**

| Evento | Acción |
|--------|--------|
| `checkout.session.completed` | Activa plan solicitado (`pro`/`enterprise`) |
| `customer.subscription.updated` | Sincroniza plan; si `canceled`/`unpaid` → downgrade a `starter` |
| `customer.subscription.deleted` | Downgrade a `starter` |

**Frontend (`web-admin`):**

| Pantalla | Cambio |
|----------|--------|
| `OnboardingPage.tsx` | Planes enriquecidos; botón "Pagar con Stripe" post-registro si `checkoutRequired` |
| `SettingsPage.tsx` | Sección "Plan SaaS": upgrade Pro/Enterprise, portal Stripe, estado suscripción |

**Archivos clave:**
```
apps/api/src/modules/subscriptions/stripe-saas.service.ts
apps/api/src/modules/subscriptions/subscriptions.controller.ts
apps/api/src/modules/subscriptions/subscriptions.routes.ts
apps/api/src/modules/delivery/webhooks/stripe.controller.ts
apps/api/src/modules/onboarding/onboarding.service.ts      # checkoutRequired logic
apps/api/src/modules/onboarding/onboarding.controller.ts   # plans response
apps/api/src/modules/tenant/tenant.service.ts                # buildSaasBilling()
apps/api/src/config/env.ts                                   # STRIPE_* vars
packages/shared-types/src/index.ts                             # SaasBillingStatus, StripeCheckoutSession
packages/validation-schemas/src/index.ts                       # saasCheckoutSchema
apps/web-admin/src/pages/OnboardingPage.tsx
apps/web-admin/src/pages/SettingsPage.tsx
```

**Scripts npm nuevos:**
```powershell
npm run stripe:preflight   # verifica STRIPE_* en apps/api/.env
npm run stripe:listen      # stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

**Dependencia:** `stripe` en `apps/api/package.json`

**OpenAPI:** rutas `/subscriptions/*` y `/webhooks/stripe` documentadas; schemas `SaasBillingStatus`, `StripeCheckoutSession`, `OnboardingPlansResponse`.

---

### 2. CI GitHub — operativo

- Secret `MONGODB_URI` configurado en `arielp79/Bistro-Digital`
- Fix en `.github/workflows/ci.yml`: env vars en job `unit`
- Push inicial realizado; CI verde (`unit` + `integration-e2e`)

---

### 3. QA general (Handoff 8) — ejecutado

| Check | Resultado |
|-------|-----------|
| `npm run ci:check` | 34/34 unit OK |
| `npm run test:integration` | 25/25 OK |
| Fix `ai.service.test.ts` | Mock de `env` para aislar `GEMINI_API_KEY` |
| Build `web-admin` | OK |

---

### 4. Meta piloto — infra lista

- `cloudflared` instalado; túnel de prueba configurado
- `API_PUBLIC_URL` en `.env`; webhook Meta verificado (`CHALLENGE_OK`)
- **Pendiente:** app Meta del restaurante (responsabilidad del tenant)

---

### 5. AFIP homologación (código — sin certificados)

- Modo `homologacion` en facturas (`billing.service.ts`, PDF, `BillingPage`)
- Script `npm run afip:homologacion` + `apps/api/scripts/afip-homologacion.mjs`
- **Pausado:** operador no tiene certificados de homologación

---

## Variables de entorno — Stripe SaaS

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Sí | `sk_test_...` — API server-side |
| `STRIPE_PUBLISHABLE_KEY` | Recomendada | `pk_test_...` — expuesta al panel admin vía `saasBilling.publishableKey` |
| `STRIPE_WEBHOOK_SECRET` | Sí (para webhooks) | `whsec_...` — de `npm run stripe:listen` o Dashboard webhook |
| `STRIPE_PRICE_PRO` | Sí | Price ID del plan Pro |
| `STRIPE_PRICE_ENTERPRISE` | Sí | Price ID del plan Enterprise |
| `WEB_ADMIN_URL` | Sí | URLs success/cancel del checkout (default `http://localhost:3001`) |

Ver sección comentada en `apps/api/.env.example`.

---

## Cómo arrancar (dev)

```powershell
cd c:\Proyectos\Bistro_Digital
npm run docker:up          # Redis + MinIO
npm run seed
npm run dev:api
npm run dev:admin
```

**Antes de probar Stripe:**
```powershell
npm run stripe:preflight
npm run stripe:listen      # en terminal separada
```

**Compilar packages tras cambiar tipos:**
```powershell
npm run build --workspace=@bistro/shared-types
npm run build --workspace=@bistro/validation-schemas
```

---

## Cómo correr tests

```powershell
npm run test:unit                    # 34 tests (sin Atlas)
npm run test:integration             # 25 tests (requiere MONGODB_URI)
npm run ci:check                     # build packages + unit + openapi export
npm run test:ci:strict               # preflight + unit + integración
npm run test:e2e                     # order-flow, onboarding-flow, platform-flow
npm run openapi:export
```

Tests Stripe relevantes:
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

Tarjeta Stripe test: `4242 4242 4242 4242` · exp cualquier futura · CVC cualquier 3 dígitos.

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **Stripe `.env` + prueba E2E** | 4 | **← PRÓXIMO PASO** — código listo |
| **Commit/push cambios Stripe** | 4 | Cambios locales sin commitear; pedir al usuario |
| **Cliente piloto Meta real** | 3 | Infra OK; falta app Meta del restaurante |
| **AFIP homologación real** | 3 | Falta certificados del operador |
| **Invitación staff por email** | 4 | — |
| **E2E delivery con Redis/worker** | 4 | E2E usa `SKIP_DELIVERY_WORKER=1` |
| **Soft-delete tenant individual** | 4 | Solo cleanup `e2e-*` |
| **Push FCM Flutter** | PRD | — |
| **RAG / embeddings** menú | PRD | — |

---

## Próximos pasos (priorizados)

### Prioridad alta — agente entrante

1. **Stripe CLI + keys en `.env` + flujo checkout** (ver checklist arriba)
2. **Informe de verificación** con evidencia (logs webhook, plan en DB)
3. **Commit/push** si el usuario lo pide (excluir `.env`, `Mongo DB.txt`)

### Prioridad media

4. **Meta piloto** — app Meta del restaurante + `API_PUBLIC_URL` túnel
5. **AFIP homologación** — cuando haya certificados
6. **Soft-delete tenant** — super-admin
7. **E2E delivery con Redis** — sin `SKIP_DELIVERY_WORKER`

### Prioridad baja

8. **Invitación staff por email**
9. **Flutter mozo** — FCM, tema dinámico
10. **Node 22 en CI** (actualmente Node 20)

---

## Deuda técnica / gotchas

- **Stripe sin keys:** onboarding asigna plan directamente; checkout devuelve 503; `stripe:preflight` lista qué falta
- **`STRIPE_WEBHOOK_SECRET`:** debe ser el del `stripe listen` local, no el del Dashboard (son distintos en dev)
- **Reiniciar API** después de pegar `whsec_...` en `.env`
- **Onboarding con Stripe:** tenant arranca en `starter` aunque el usuario eligió Pro — es intencional hasta el webhook
- **Dos Stripe distintos:** billing SaaS (`STRIPE_SECRET_KEY` operador) vs pagos menú QR (`config.payments.stripe` tenant)
- **Secrets en `.env`:** nunca commitear; `apps/api/.env` en `.gitignore`
- **Compilar `shared-types`** tras cambios en `packages/`
- **Scripts PowerShell:** usar ASCII, no Unicode (`→`, `—`) — rompe en algunos entornos
- **Cambios sin commit:** Stripe + AFIP homologación + OpenAPI subscriptions están en working tree

---

## Prompt — configurar Stripe (para otro agente)

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
Handoff: documentos/Handoff_9.md
PRD: documentos/PRD_SaaS_Restaurantes.md

Estado: billing SaaS Stripe IMPLEMENTADO en código; NO configurado en apps/api/.env.
Tests: 34 unit + 25 integration OK. CI GitHub verde.

Tu tarea:
1. winget install Stripe.StripeCli && stripe login
2. Crear productos Pro y Enterprise en https://dashboard.stripe.com/test/products
3. Completar STRIPE_* y WEB_ADMIN_URL en apps/api/.env
4. npm run stripe:preflight (debe pasar salvo webhook secret)
5. npm run dev:api + npm run stripe:listen → copiar whsec a .env → reiniciar API
6. npm run dev:admin → /onboarding plan Pro → checkout tarjeta 4242... → verificar plan=pro en /settings
7. Entregar informe breve en español

Archivos clave:
  apps/api/src/modules/subscriptions/stripe-saas.service.ts
  scripts/stripe-preflight.ps1
  scripts/stripe-listen.ps1

No commitear .env. Preguntar antes de commit/push.
```

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_9.md

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~98%: Gemini OK; infra Meta lista; falta app Meta restaurante + certs AFIP
- Fase 4 ~95%: Stripe SaaS CÓDIGO LISTO; falta instalar CLI + cargar keys .env + probar checkout

Nuevo en Handoff 9:
- Billing SaaS Stripe: checkout, portal, webhook → tenant.plan
- Onboarding: checkoutRequired si plan pago + Stripe configurado
- Settings + Onboarding UI con botones Stripe
- npm run stripe:preflight, stripe:listen
- OpenAPI subscriptions documentado
- CI GitHub verde (MONGODB_URI secret OK)
- QA: 34 unit + 25 integration OK

PRÓXIMO PASO: instalar Stripe CLI, cargar STRIPE_* en apps/api/.env, probar flujo onboarding Pro → checkout → webhook.

Demo: platform@saas-base.com / platform123; admin@bistro-digital.app / admin123
Tarjeta test: 4242 4242 4242 4242

Cambios sin commit — preguntar al usuario antes de push.
```

---

*Última actualización: julio 2026 — Stripe SaaS billing implementado (pendiente config .env), CI verde, QA OK, AFIP homologación en código.*
