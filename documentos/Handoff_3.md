# Handoff 3 — Bistró Digital

Documento de handoff para continuidad con otro agente (junio 2025).  
Reemplaza y amplía `RESUMEN_2.md` con todo lo implementado hasta **onboarding multi-tenant**.

**Referencias:** `PRD_SaaS_Restaurantes.md` · `RESUMEN_2.md` · `RESUMEN_1.md`

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
  api/              → Express + TS + MongoDB + Socket.IO + BullMQ (:3000)
  web-client/       → React/Vite/Tailwind — cliente QR y delivery (:5173)
  web-kitchen/      → React — Kanban cocina (:3002)
  web-admin/        → React — panel admin (:3001)
  mobile-waiter/    → Flutter — app mozo
packages/
  shared-types/     → Tipos TypeScript compartidos
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → Redis + MinIO (MongoDB = Atlas en la nube)
scripts/
  whatsapp-tunnel.ps1 → Túnel ngrok/cloudflared para webhooks Meta
```

**Convenciones (PRD):**

- `tenantId` en todas las queries MongoDB
- Respuestas API: `{ data, error }`
- Eventos Socket: `entity:action`
- JWT + RBAC (`admin`, `waiter`, `kitchen`, `cashier`)
- Tokens de terceros cifrados con `encrypt()` en `apps/api/src/utils/encryption.ts`

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP (auth, menú, pedidos, cocina, mozo, pagos) | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP + Meta staging | ⚠️ **~95%** — falta probar Meta/AFIP con credenciales reales de cliente |
| **Fase 4** | Onboarding + white-label avanzado + OpenAPI | ⚠️ **~25%** — onboarding público hecho; faltan dominios custom, OpenAPI, QA |

---

## Lo implementado en esta sesión (Handoff 3)

### 1. Facturación AFIP (`apps/api/src/modules/billing/`)

- `POST /api/v1/billing/:orderId/invoice` — Factura B/C
- `GET /api/v1/billing/:orderId/invoice/pdf` — HTML imprimible
- `GET /api/v1/billing/orders` — Pedidos facturables
- **Modo demo** si AFIP deshabilitado (CAE simulado + banner)
- **Modo real** con `@afipsdk/afip.js` si tenant tiene CUIT + cert + key
- Admin: `/billing` + sección AFIP en `/settings`
- Campo `billing` en modelo `Order`

### 2. Geocoder para envíos

- `apps/api/src/services/geocoder.service.ts` — Nominatim (OpenStreetMap)
- `DeliveryService.calculateShipping()` ahora es **async**; usa geocoder y fallback local
- Actualizado: `delivery.controller.ts`, `delivery.worker.ts`

### 3. WhatsApp / Meta staging

- **Fix crítico:** descifrado de Access Token antes de Graph API
- Verificación webhook corregida (verify token por tenant o `WHATSAPP_VERIFY_TOKEN`)
- Firma `X-Hub-Signature-256` si `WHATSAPP_APP_SECRET` está configurado
- `API_PUBLIC_URL` para URL pública de webhooks
- `POST /api/v1/delivery/whatsapp/test` — prueba de envío
- Script `npm run tunnel:whatsapp`

### 4. Conectar Meta — WhatsApp + Instagram (`/connect-meta`)

- Pantalla guiada para el **cliente** (cada restaurante trae su Meta Business)
- URLs de webhook WhatsApp e Instagram para copiar
- Verify Token compartido, credenciales por tenant
- Instagram: Page ID + token cifrado, `POST /api/v1/delivery/instagram/test`
- Widget en Dashboard si Meta no conectado (`MetaConnectionWidget.tsx`)

### 5. Onboarding multi-tenant (`/onboarding`)

**API** (`apps/api/src/modules/onboarding/`):

```
GET  /api/v1/onboarding/check-slug?slug=
GET  /api/v1/onboarding/suggest-slug?name=
POST /api/v1/onboarding/register   (rate limit: 10/hora)
```

Crea: tenant (plan `starter`) + admin + menú ejemplo (6 ítems, opcional) + N mesas con QR.

**Admin:**

- Wizard 5 pasos en `http://localhost:3001/onboarding`
- Login multi-tenant: campo **identificador del restaurante** (slug)
- `auth.store` + `api.ts` usan `tenantSlug` dinámico (`setTenantSlug`)

**Env:** `ONBOARDING_ENABLED=true` (poner `false` para cerrar registros en producción).

**Datos starter:** `apps/api/src/data/starter-tenant.data.ts`

---

## web-admin — rutas

| Ruta | Página |
|------|--------|
| `/login` | Login (slug + email + password) |
| `/onboarding` | Alta de nuevo restaurante (público) |
| `/` | Dashboard (+ widget Meta si pendiente) |
| `/menu` | CRUD menú |
| `/tables` | CRUD mesas + QR |
| `/stock` | Stock |
| `/users` | Usuarios |
| `/delivery` | Simulador Delivery IA |
| `/connect-meta` | Guía WhatsApp + Instagram |
| `/billing` | Facturación AFIP |
| `/settings` | General, pagos, AFIP, MercadoPago |

---

## API — mapa de rutas (completo)

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
```

---

## Variables de entorno relevantes (`apps/api/.env`)

| Variable | Uso |
|----------|-----|
| `MONGODB_URI` | **MongoDB Atlas** (obligatorio) — no usar Docker para datos |
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
# 1. MongoDB Atlas: configurar MONGODB_URI en apps/api/.env (ver .env.example)
npm run seed           # Tenant demo bistro-digital (contra Atlas)
npm run docker:up      # Solo Redis + MinIO (Delivery IA + storage opcional)
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

## Credenciales demo (seed)

| Rol | Email | Password | Slug login |
|-----|-------|----------|------------|
| Admin | `admin@bistro-digital.app` | `admin123` | `bistro-digital` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` | `bistro-digital` |
| Cocina | `cocina@bistro-digital.app` | `cocina123` | `bistro-digital` |
| Caja | `caja@bistro-digital.app` | `caja123` | `bistro-digital` |

---

## Flujos clave para probar

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
4. Mensaje al WhatsApp Business → worker procesa en ~2–10 s

### Factura demo

1. Pedido en estado `paid` o `delivered`
2. Admin → Facturación → Factura B/C → Ver PDF

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| WhatsApp/Instagram **probados en producción** | 3 | Infra lista; falta cliente con Meta real |
| AFIP **homologación/producción** | 3 | Modo demo OK; certificados reales del cliente |
| **Refresh token** robusto en todos los clients | Hardening | Endpoint existe; admin/kitchen/Flutter no renuevan automático |
| **Tests** unitarios y E2E | 4 | Sin suite aún |
| **Observabilidad Delivery IA** | 3 | Jobs fallidos, latencia worker, errores OpenAI |
| **web-client multi-tenant** dinámico | 4 | Usa `VITE_TENANT_SLUG` o `?tenant=` en URL; sin selector en UI |
| **Dominio custom** por tenant | 4 | — |
| **OpenAPI / Swagger** | 4 | — |
| **Push FCM** Flutter mozo | PRD | No implementado |
| **RAG / embeddings** menú | PRD IA | No implementado |
| **Super-admin** plataforma | 4 | No hay panel para operador SaaS (listar/suspender tenants) |
| **Onboarding:** invitación por email, pago/plan | 4 | Solo registro self-service básico |

---

## Próximos pasos (priorizados)

### Prioridad alta

1. **Tests automatizados**
   - Unitarios: `onboarding.service`, `billing.service` (demo), `ai.service` (fallback), `geocoder.service`
   - E2E: onboarding → login → menú; simulate delivery → pedido; QR → cocina
   - Herramienta sugerida: Vitest (API) + Playwright (admin/web-client)

2. **Auth hardening — refresh token**
   - Interceptor en `web-admin`, `web-kitchen`, Flutter que renueve access token
   - Manejo de 401 → refresh → retry
   - Archivos: `apps/web-admin/src/lib/api.ts`, `apps/web-kitchen/`, `mobile-waiter/`

3. **web-client multi-tenant**
   - Resolver tenant desde `?tenant=` en URL (ya parcial) sin depender solo de `VITE_TENANT_SLUG`
   - Pantalla landing o detección de slug para nuevos restaurantes post-onboarding

### Prioridad media

4. **Observabilidad Delivery IA**
   - Endpoint admin: jobs fallidos BullMQ, últimos errores, latencia por sesión
   - UI en `/delivery` o nueva `/ops`

5. **Super-admin SaaS** (operador de la plataforma)
   - Listar tenants, activar/suspender, métricas globales
   - Rol `platform_admin` o API separada con clave

6. **Cliente piloto Meta**
   - Documentar checklist PDF desde `/connect-meta`
   - Probar flujo completo con un restaurante real

### Prioridad baja — Fase 4

7. **OpenAPI** — documentar `/api/v1`
8. **Dominio custom** — proxy dinámico, SSL por tenant
9. **Planes y billing SaaS** — Stripe para cobrar al restaurante (distinto de AFIP al consumidor)
10. **Flutter mozo** — FCM, tema dinámico desde `/tenant/config`

---

## Archivos clave añadidos/modificados (Handoff 3)

```
apps/api/src/modules/billing/          # AFIP
apps/api/src/modules/onboarding/       # Alta tenants
apps/api/src/data/starter-tenant.data.ts
apps/api/src/services/geocoder.service.ts
apps/api/src/middlewares/webhook.middleware.ts
apps/web-admin/src/pages/ConnectMetaPage.tsx
apps/web-admin/src/pages/OnboardingPage.tsx
apps/web-admin/src/pages/BillingPage.tsx
apps/web-admin/src/components/MetaConnectionWidget.tsx
apps/web-admin/src/components/CopyField.tsx
scripts/whatsapp-tunnel.ps1
```

---

## Deuda técnica / gotchas

- **Login admin** requiere conocer el `slug` del restaurante (no solo email).
- **web-client** en dev usa `VITE_TENANT_SLUG` por defecto; nuevos tenants necesitan `?tenant=<slug>` en la URL del menú.
- **Onboarding rollback:** si falla a mitad, se borran tenant + users + menú + mesas del intento.
- **Instagram test:** necesita PSID del destinatario (solo disponible tras primer DM entrante).
- **MongoDB** siempre en **Atlas** (`MONGODB_URI` en `apps/api/.env`). Docker ya no incluye Mongo; no uses `localhost:27017` salvo pruebas aisladas.
- **Compass / herramientas:** conectá con la misma URI que `MONGODB_URI`, no al Docker local.
- **Compilar `shared-types` y `validation-schemas`** antes de build API/admin tras cambios de tipos.
- **`app.ts`** importa `captureRawBody` para firma webhooks — no quitar `verify` del `express.json`.

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: Handoff_3.md (reemplaza RESUMEN_2.md)

Estado:
- Fase 1 ✅ Fase 2 ✅
- Fase 3 ~95%: AFIP demo, Meta staging (WA+IG), geocoder, sin prueba real cliente
- Fase 4 ~25%: onboarding multi-tenant en /onboarding

Nuevo en Handoff 3:
- Módulo billing AFIP + página /billing
- /connect-meta (WhatsApp + Instagram guiado)
- /onboarding (alta restaurante + menú/mesas starter)
- Login admin multi-tenant por slug
- Widget Meta en Dashboard

Demo: slug bistro-digital | admin@bistro-digital.app / admin123
Arranque: MONGODB_URI en .env → seed → dev:api + dev:admin (+ docker:up para Redis si usás Delivery IA)

Siguiente tarea sugerida: tests E2E (onboarding + delivery) o refresh token en clients.
```

---

*Última actualización: junio 2025 — incluye onboarding, billing AFIP, Connect Meta y staging WhatsApp/Instagram.*
