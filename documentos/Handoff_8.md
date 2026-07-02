# Handoff 8 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2026).  
Reemplaza y amplía `Handoff_7.md` con **CI operativo, hub cliente piloto (Meta + AFIP), integración Gemini y scripts de preflight**.

**Referencias:** `documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_7.md`

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
| Cliente piloto | `http://localhost:3001/pilot-setup` |
| Conectar Meta | `http://localhost:3001/connect-meta` |
| Conectar AFIP | `http://localhost:3001/connect-afip` |
| Audit impersonación | `http://localhost:3001/platform/audit` |

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~98%** — Gemini OK; falta piloto Meta/AFIP real + `API_PUBLIC_URL` |
| **Fase 4** | Onboarding + white-label + OpenAPI + QA + super-admin | ⚠️ **~92%** — hub piloto y CI scripts listos; faltan secret GitHub, Stripe, soft-delete |

---

## Lo implementado en sesiones Handoff 8

### 1. CI GitHub — scripts y workflow mejorado

- `.github/workflows/ci.yml`: `workflow_dispatch`, `concurrency`, Step Summary si falta `MONGODB_URI`
- `npm run ci:check` — simula job `unit` local (build packages + unit + openapi export)
- `npm run ci:setup-secret` — sube `MONGODB_URI` desde `apps/api/.env` vía `gh` CLI
- Playwright E2E en CI: pasa env explícitas a la API (`e2e/playwright.config.ts`)

**Pendiente operador:** configurar secret `MONGODB_URI` en GitHub (el workflow ya existe).

---

### 2. Hub cliente piloto (Meta + AFIP)

**Panel admin — rutas nuevas:**

| Ruta | Descripción |
|------|-------------|
| `/pilot-setup` | Checklist unificado con % progreso (Meta, AFIP, IA, túnel HTTPS) |
| `/connect-afip` | Guía homologación/producción + carga certificados + prueba conexión |

**API:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/billing/afip/test` | Valida CUIT + certificados contra AFIP (homologación o prod) |

**`GET /api/v1/tenant/settings`** incluye ahora:

```typescript
pilotStatus: {
  overallPercent: number;
  publicApiReady: boolean;
  aiConfigured: boolean;
  aiProvider: 'gemini' | 'openai' | null;
  metaWhatsApp: boolean;
  metaInstagram: boolean;
  afipConfigured: boolean;
  afipEnabled: boolean;
}
```

**Archivos clave:**
```
apps/web-admin/src/pages/PilotSetupPage.tsx
apps/web-admin/src/pages/ConnectAfipPage.tsx
apps/web-admin/src/components/PilotReadinessWidget.tsx
apps/api/src/modules/billing/billing.service.ts      # testAfipConnection
apps/api/src/modules/tenant/tenant.service.ts       # buildPilotStatus
packages/shared-types/src/index.ts                  # PilotReadinessStatus, AfipTestResult
```

**Settings:** la sección AFIP se movió a `/connect-afip` (en `/settings` queda enlace).

---

### 3. Delivery IA — Google Gemini (+ OpenAI alternativo)

- SDK `@google/generative-ai` en `apps/api`
- `AI_PROVIDER`: `gemini` | `openai` | `auto` (default `auto` → Gemini si hay key, si no OpenAI)
- Variables: `GEMINI_API_KEY` (o `GOOGLE_AI_API_KEY`), `DELIVERY_AI_GEMINI_MODEL`, `DELIVERY_AI_OPENAI_MODEL`
- **Modelo en uso (dev):** `gemini-2.5-flash` (`gemini-2.0-flash` dio 429 cuota free tier en pruebas)
- OpenAI sigue disponible como fallback (`OPENAI_API_KEY`)
- `AiService.getActiveProvider()` / `isConfigured()` para diagnóstico

**Scripts:**
```powershell
npm run gemini:setup    # guarda key en .env + prueba conexión
npm run gemini:test     # test rápido contra Gemini
```

**Archivos clave:**
```
apps/api/src/services/ai.service.ts
apps/api/src/config/env.ts
apps/api/scripts/test-gemini.mjs
scripts/setup-gemini-key.ps1
```

**Estado local (jun 2026):** `GEMINI_API_KEY` configurada en `apps/api/.env`, `npm run gemini:test` OK con `gemini-2.5-flash`.

---

### 4. Scripts operador SaaS (piloto)

```powershell
npm run pilot:preflight   # MONGODB_URI, GEMINI_API_KEY, API_PUBLIC_URL, etc.
npm run pilot:tunnel      # túnel HTTPS (cloudflared/ngrok) para webhooks Meta
```

---

## Heredado de Handoff 7 (ya existía — no reimplementar)

- Dominio custom (`/tenant/resolve`, PATCH `domain`, nginx template)
- OpenAPI enriquecido (schemas, ejemplos, `openapi:export`, artifact CI)
- Audit log impersonación (`/platform/audit`)
- Onboarding 6 pasos (planes + email bienvenida)
- `/connect-meta` (WhatsApp + Instagram guiado)
- Super-admin, impersonación, E2E platform-flow
- Ver `documentos/Handoff_7.md` para detalle completo

---

## API — rutas nuevas (resumen Handoff 8)

```
POST /api/v1/billing/afip/test       # admin — probar conexión AFIP

# En tenant/settings (campo nuevo, no ruta nueva):
pilotStatus { aiConfigured, aiProvider, ... }
```

---

## Variables de entorno nuevas / actualizadas

| Variable | Uso |
|----------|-----|
| `AI_PROVIDER` | `gemini` \| `openai` \| `auto` (default `auto`) |
| `GEMINI_API_KEY` | API key Google AI Studio |
| `GOOGLE_AI_API_KEY` | Alias de `GEMINI_API_KEY` |
| `DELIVERY_AI_GEMINI_MODEL` | Default `gemini-2.5-flash` |
| `DELIVERY_AI_OPENAI_MODEL` | Default `gpt-4o` |
| `DELIVERY_AI_MODEL` | Override explícito para el proveedor activo |

Ver `apps/api/.env.example` (sección Delivery IA + Cliente piloto).

---

## Cómo arrancar

```powershell
cd c:\Proyectos\Bistro_Digital
npm run docker:up          # Redis + MinIO
npm run seed
npm run dev:api
npm run dev:admin
# flujo completo demo:
npm run dev:web
npm run dev:kitchen
```

**Verificar antes del piloto:**
```powershell
npm run test:preflight
npm run gemini:test
npm run pilot:preflight    # puede fallar si falta API_PUBLIC_URL
```

**Compilar packages tras cambiar tipos:**
```powershell
npm run build --workspace=@bistro/shared-types
npm run build --workspace=@bistro/validation-schemas
```

---

## Cómo correr tests

```powershell
npm run test:unit                    # 32 tests (sin Atlas)
npm run test:preflight               # MongoDB Atlas
npm run test:ci:strict               # preflight + unit + integración (23)
npm run ci:check                     # job unit local (sin Atlas)
npm run test:e2e:install             # Playwright chromium
npm run test:e2e                     # order-flow, onboarding-flow, platform-flow
npm run test:validate                # pipeline completo local
npm run openapi:export
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
| **CI GitHub `MONGODB_URI`** | 4 | Workflow + `ci:setup-secret` listos; falta ejecutar en repo |
| **`API_PUBLIC_URL` HTTPS** | 3 | `npm run pilot:tunnel` → pegar en `.env` → reiniciar API |
| **Cliente piloto Meta real** | 3 | Infra OK en `/connect-meta`; falta app Meta del restaurante |
| **AFIP homologación real** | 3 | `/connect-afip` + `POST /billing/afip/test`; falta certificados cliente |
| **Billing SaaS (Stripe)** | 4 | Planes onboarding informativos |
| **Prueba general QA documentada** | 4 | Ver prompt sugerido abajo; no ejecutada como informe formal |
| **Invitación staff por email** | 4 | — |
| **E2E delivery con Redis/worker** | 4 | E2E usa `SKIP_DELIVERY_WORKER=1` |
| **Soft-delete tenant individual** | 4 | Solo cleanup `e2e-*` |
| **Gráfico crecimiento tenants** | 4 | — |
| **Push FCM Flutter** | PRD | — |
| **RAG / embeddings** menú | PRD | — |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Prueba general del proyecto (QA)**
   - Ejecutar `npm run test:validate` + smoke manual (QR → cocina, admin, super-admin, simulador `/delivery`)
   - Entregar informe: tests OK/fail, bugs, variables faltantes
   - Usar el bloque «Prompt QA» al final de este documento

2. **Túnel + Meta piloto**
   - `npm run pilot:tunnel` → `API_PUBLIC_URL=https://...` en `apps/api/.env`
   - Reiniciar API; completar `/connect-meta` con credenciales del restaurante
   - Probar mensaje WhatsApp → pedido en cocina

3. **AFIP homologación piloto**
   - Restaurante carga certificados en `/connect-afip`
   - `POST /billing/afip/test` → emitir factura B de prueba en `/billing`

4. **CI en GitHub**
   - `npm run ci:setup-secret` o secret manual `MONGODB_URI`
   - Atlas Network Access `0.0.0.0/0` para runners
   - Verificar jobs `unit` + `integration-e2e` + artifact `openapi-spec`

### Prioridad media

5. **Billing SaaS (Stripe)** — webhook → `tenant.plan`
6. **Soft-delete tenant individual** — super-admin
7. **E2E delivery con Redis** — sin `SKIP_DELIVERY_WORKER`
8. **Invitación staff por email**

### Prioridad baja

9. **Flutter mozo** — FCM, tema dinámico
10. **RAG / embeddings** en menú Delivery IA
11. **Dominio custom en prod** — Nginx/Cloudflare + SSL

---

## Deuda técnica / gotchas

- **Gemini modelo:** usar `gemini-2.5-flash`; `gemini-2.0-flash` puede dar 429 (cuota free tier)
- **`gemini:test` en Windows:** a veces exit code raro tras mensaje OK (assertion Node); la conexión igual funciona
- **`pilot-preflight.ps1`:** evitar caracteres Unicode (`→`, `—`) — usar ASCII en scripts PowerShell
- **IA sin key:** fallback por keywords en `AiService`; simulador `/delivery` funciona; WhatsApp real necesita Gemini u OpenAI
- **Secrets en `.env`:** nunca commitear; `apps/api/.env` está en `.gitignore`
- **Onboarding E2E** acumula tenants `e2e-*` — limpiar en super-admin
- **Compilar `shared-types`** tras cambios de tipos en `packages/`

---

## Prompt QA — prueba general (para otro agente)

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
Handoff: documentos/Handoff_8.md · PRD: documentos/PRD_SaaS_Restaurantes.md

Objetivo: prueba general / QA — tests automatizados + smoke manual + informe en español.

Preflight:
  npm run test:preflight && npm run gemini:test && npm run ci:check
  npm run test:ci:strict && npm run test:e2e:install && npm run test:e2e

Arranque: docker:up, seed, dev:api, dev:admin, dev:web, dev:kitchen

Smoke: pedido QR→cocina; admin (/delivery simulador, /billing, /pilot-setup);
       super-admin (impersonar, /platform/audit)

Credenciales: platform@saas-base.com/platform123; admin@bistro-digital.app/admin123

Entregable: resumen ejecutivo, tabla tests, bugs con severidad, qué falta en .env.
No commitear sin pedido explícito.
```

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_8.md

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~98%: Gemini OK (gemini-2.5-flash); falta API_PUBLIC_URL + piloto Meta/AFIP real
- Fase 4 ~92%: hub piloto, CI scripts; falta secret GitHub MONGODB_URI + Stripe

Nuevo en Handoff 8:
- /pilot-setup, /connect-afip, POST /billing/afip/test, pilotStatus en settings
- Gemini como proveedor IA (AI_PROVIDER=gemini); OpenAI alternativo
- npm run gemini:test, gemini:setup, pilot:preflight, pilot:tunnel, ci:check, ci:setup-secret
- CI workflow: workflow_dispatch, concurrency, step summary

Demo: platform@saas-base.com / platform123
Piloto: http://localhost:3001/pilot-setup
Gemini: configurado en apps/api/.env — npm run gemini:test

Siguiente sugerido: QA general (test:validate + smoke), túnel API_PUBLIC_URL + Meta piloto, o CI MONGODB_URI secret.
```

---

*Última actualización: junio 2026 — CI scripts, hub cliente piloto Meta+AFIP, integración Gemini, preflight operador.*
