# Handoff 11 — Bistró Digital

Documento de handoff para continuidad con otro agente (julio 2026).  
Reemplaza `Handoff_10.md`. Sesión actual: **checklist de pruebas en casa (lab)** — Semana 1 completa, **Semana 2 Día 8 en curso**.

**Referencias:** `documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_10.md`

> Toda la documentación markdown del proyecto vive en `documentos/`.

---

## Qué es el proyecto

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin, delivery con IA por WhatsApp/Instagram, facturación AFIP (demo/real/homologación), operador SaaS (super-admin), **cobro de planes al restaurante vía Stripe**.

| Parámetro | Valor |
|-----------|-------|
| Repo | `c:\Proyectos\Bistro_Digital` |
| GitHub | `arielp79/Bistro-Digital` (rama `master`) |
| Último commit pusheado | `b15cf28` — `feat(platform): soft-delete de tenants desde super-admin` |
| **Cambios locales sin commitear** | Ver sección [Cambios en working tree](#cambios-en-working-tree-sesión-lab) |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` |
| API | `http://localhost:3000` |
| web-admin | `http://localhost:3001` |
| web-client | `http://localhost:5173` (con `host: true` — ver LAN abajo) |
| web-kitchen | `http://localhost:3002` |
| Super-admin | `http://localhost:3001/platform/login` |
| Onboarding | `http://localhost:3001/onboarding` |

---

## ⚡ En qué estamos AHORA (leer primero)

### Contexto

El usuario está ejecutando un **checklist día a día en casa** (sin restaurante real) para validar el producto antes de deploy comercial. No es desarrollo de features nuevas del PRD, sino **QA manual + fixes de fricción** descubiertos al probar.

### Progreso del checklist

| Día | Tema | Estado |
|-----|------|--------|
| 1 | Primer pedido QR → cocina | ✅ OK |
| 2 | Roles, transferencia, dos mesas | ✅ OK (stock bajo bloqueaba avance — explicado) |
| 3 | Menú, mesas, plato nuevo | ✅ OK |
| 4 | Stock baja al preparar | ✅ OK |
| 5 | Celular + QR en LAN | ✅ OK (tras fixes CORS + randomUUID + host) |
| 6 | Delivery manual | ✅ OK (tras fix rate limit dev) |
| 7 | Repaso + tests automáticos | ✅ OK |
| **8** | **Onboarding tenant ficticio** | **🔄 EN CURSO** |
| 9–14 | Super-admin, Stripe, Delivery IA, etc. | Pendiente |

### Día 8 — estado exacto

**Objetivo:** Registrar restaurante vía `/onboarding`, pedir desde su menú, verificar aislamiento vs `bistro-digital`.

| Paso | Estado |
|------|--------|
| Wizard onboarding completado | ✅ Tenant creado |
| Pedido desde menú cliente | ⏳ Pendiente de cerrar |
| Ver pedido en admin del nuevo tenant | ⏳ Pendiente |
| Aislamiento (bistro-digital no ve sus pedidos) | ⏳ Pendiente |

**Tenant creado en onboarding (confirmado vía super-admin):**

| Campo | Valor |
|-------|-------|
| Nombre | **Parrilla de Casa** |
| Slug | **`parrilla-de-casa`** (con “de”, no `parrilla-casa`) |
| Plan | `starter` |

**Problema que tuvo el usuario:** al abrir el menú cliente veía header **“Bistró Digital”** en lugar de “Parrilla de Casa”.

**Causas:**
1. URL sin `&tenant=parrilla-de-casa` → `sessionStorage` del navegador seguía con `bistro-digital`.
2. Slug real es `parrilla-de-casa`, no el sugerido en guía (`parrilla-casa`).
3. Usuario limpió memoria del navegador y **no recuerda email/password** del admin creado.

**Recuperación de acceso (sin contraseña):**
1. Super-admin → `platform@saas-base.com` / `platform123`
2. http://localhost:3001/platform/login
3. Buscar **Parrilla de Casa** → detalle → ver email admin → **Impersonar**

**Password probable** (si usó la guía del Día 8): `admin123`  
**Email probable:** el que ingresó en el wizard (ver en detalle super-admin; puede ser `admin@parrilla-de-casa.app` u otro).

**URL menú cliente correcta:**
```
http://localhost:5173/menu?tenant=parrilla-de-casa
http://192.168.0.187:5173/menu?tenant=parrilla-de-casa   # celular misma WiFi
```
Para mesa con QR: copiar desde **Mesas → Copiar link** (impersonando el tenant) o desde pantalla final onboarding. **Siempre debe incluir `tenant=parrilla-de-casa`.**

**Nota:** `web-kitchen` (`localhost:3002`) está hardcodeada a tenant `bistro-digital` (`VITE_TENANT_SLUG`). Para tenants nuevos usar **admin → Pedidos** (`/orders`), no la app cocina.

### Próximo paso inmediato (agente entrante)

1. Impersonar `parrilla-de-casa` desde super-admin.
2. Copiar link QR de Mesas (o armar URL con `tenant=parrilla-de-casa`).
3. Hacer pedido de prueba → verificar en `/orders`.
4. Login `bistro-digital` → confirmar que el pedido **no** aparece.
5. Marcar Día 8 completo → continuar **Día 9** (super-admin: impersonar, soft-delete tenant de prueba).

---

## Cambios en working tree (sesión lab)

**No commiteados** al cierre de este handoff. Son fixes de UX/dev descubiertos durante pruebas en casa:

| Archivo | Cambio |
|---------|--------|
| `apps/web-client/vite.config.ts` | `host: true` — menú accesible desde celular en LAN |
| `apps/web-client/src/stores/cart.store.ts` | Fallback ID sin `crypto.randomUUID` (HTTP en LAN no es contexto seguro) |
| `apps/web-client/src/stores/tenant.store.ts` | Limpiar config al cambiar slug; no mostrar tenant viejo |
| `apps/web-client/src/components/TenantBootstrap.tsx` | Reaccionar a cambios en query `tenant` |
| `apps/web-client/src/pages/CheckoutPage.tsx` | Parse JSON seguro en cálculo de envío |
| `apps/api/src/config/cors.ts` | Permitir orígenes LAN (`192.168.x.x`) en development |
| `apps/api/src/create-app.ts` | Rate limit alto en dev + respuesta JSON en 429 |
| `apps/api/src/modules/orders/order.routes.ts` | Rate limit pedidos alto en dev + JSON 429 |
| `apps/web-kitchen/src/stores/order.store.ts` | Mostrar error al avanzar pedido (ej. stock insuficiente) |
| `apps/web-kitchen/src/components/KanbanColumn.tsx` | Error por tarjeta en Kanban cocina |
| `apps/web-kitchen/src/components/OrderCard.tsx` | Mensaje rojo de error en tarjeta |
| `apps/web-admin/src/stores/order.store.ts` | `cancelOrder()` — cancelar pedidos activos |
| `apps/web-admin/src/pages/OrdersPage.tsx` | Botón cancelar en Kanban admin |
| `apps/web-admin/src/components/OrderCard.tsx` | UI cancelar pedido |
| `apps/web-admin/src/components/KanbanColumn.tsx` | Wiring cancelar |
| `apps/web-admin/src/utils/admin.ts` | `buildTableQrUrl` usa tenant logueado, no `bistro-digital` fijo |

**Recomendación:** commitear estos cambios antes de seguir con Día 9+.

---

## Arranque local (referencia)

```powershell
cd c:\Proyectos\Bistro_Digital

# Terminales (4 mínimo para lab salón)
npm run dev:api
npm run dev:admin
npm run dev:web      # host: true → Network: http://192.168.0.187:5173/
npm run dev:kitchen

# Opcional
npm run docker:up    # Redis — solo para Delivery IA / Día 11
npm run stripe:listen  # solo Día 10 Stripe
```

**IP LAN del usuario (jul 2026):** `192.168.0.187` (verificar con `ipconfig` si cambió).

---

## Credenciales demo

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| Super-admin | `platform@saas-base.com` | `platform123` | `/platform/login` |
| Admin `bistro-digital` | `admin@bistro-digital.app` | `admin123` | `/login` slug `bistro-digital` |
| Cocina demo | `cocina@bistro-digital.app` | `cocina123` | `localhost:3002` |
| Caja demo | `caja@bistro-digital.app` | `caja123` | `localhost:3002` |

**Tenant onboarding en curso:** `parrilla-de-casa` — recuperar admin vía super-admin (impersonar).

---

## URLs de prueba rápidas

| Flujo | URL |
|-------|-----|
| Menú Mesa 1 demo | `http://localhost:5173/menu?table=6a368a6f4e13de2ee996fcac&tenant=bistro-digital` |
| Delivery manual | `http://localhost:5173/menu?mode=delivery&tenant=bistro-digital` |
| Menú Parrilla de Casa | `http://localhost:5173/menu?tenant=parrilla-de-casa` |
| Celular (reemplazar IP) | `http://192.168.0.187:5173/...` |

---

## Tests automáticos (última corrida sesión lab)

| Comando | Resultado |
|---------|-----------|
| `npm run ci:check` | ✅ 34/34 unit + OpenAPI |
| `npm run test:e2e` | ✅ 3/3 (order-flow, onboarding-flow, platform-flow) |
| `npm run test:integration` | ⚠️ 25/26 — falla `onboarding.register` espera `plan: pro` pero con Stripe configurado queda `starter` hasta checkout |

---

## Gotchas descubiertos en lab (actualizado)

| Tema | Detalle |
|------|---------|
| **Stock** | Avance Confirmado → En preparación descuenta ingredientes. Sin stock → error (ahora visible en cocina). Bebidas/postres sin receta no consumen stock. |
| **Seed no resetea stock** | Re-ejecutar `npm run seed` no repone ingredientes existentes. Reponer vía admin Stock o API `POST /stock/movements`. |
| **Cancelar pedidos** | Admin `/orders` → botón **Cancelar pedido** (no borra de MongoDB, status `cancelled`). |
| **Celular + LAN** | `dev:web` necesita `host: true`. API necesita CORS LAN en dev. |
| **`crypto.randomUUID`** | Falla en HTTP LAN; fix en `cart.store.ts`. |
| **Rate limit** | Muchas pruebas → 429 "Too many requests" (texto plano). Fix: límite alto en dev + JSON. |
| **QR admin Mesas** | Antes siempre `tenant=bistro-digital`; fix usa tenant logueado. |
| **web-kitchen** | Solo tenant `bistro-digital` por defecto. Otros tenants: admin `/orders`. |
| **Slug onboarding** | Auto-sugiere desde nombre (`Parrilla de Casa` → `parrilla-de-casa`). |
| **`Mongo DB.txt`** | Credenciales locales — **no commitear**. |

---

## Checklist restante (Semana 2)

| Día | Tema | Estado |
|-----|------|--------|
| 8 | Onboarding tenant ficticio | 🔄 En curso |
| 9 | Super-admin: listado, impersonar, soft-delete | Pendiente |
| 10 | Stripe SaaS checkout test | Pendiente |
| 11 | Delivery IA simulador (+ Redis) | Pendiente |
| 12 | AFIP demo | Pendiente |
| 13 | App mozo Flutter (opcional) | Pendiente |
| 14 | Ensayo día de servicio completo | Pendiente |

---

## Estado por fase del PRD (sin cambio sustancial)

| Fase | Estado |
|------|--------|
| Fase 1–2 | ✅ Completa |
| Fase 3 | ~98% |
| Fase 4 | ~99% |

---

## Prompt para nuevo agente

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_11.md

CONTEXTO: Usuario hace checklist de pruebas en casa (lab), sin restaurante real.
Semana 1 (Días 1–7) COMPLETA. Semana 2 Día 8 EN CURSO.

DÍA 8 — cerrar onboarding:
- Tenant: parrilla-de-casa (Parrilla de Casa), plan starter
- Usuario no recuerda credenciales → super-admin impersonar
- Menú cliente DEBE llevar ?tenant=parrilla-de-casa
- Verificar pedido en admin /orders (NO web-kitchen para este tenant)
- Verificar aislamiento vs bistro-digital

CAMBIOS LOCALES SIN COMMIT: fixes LAN, CORS, rate limit, cancel pedido,
errores cocina, tenant QR, cart UUID — ver Handoff_11 sección working tree.

PRÓXIMO: terminar Día 8 → Día 9 super-admin.

Demo: platform@saas-base.com / platform123
Demo restaurante: admin@bistro-digital.app / admin123 / slug bistro-digital
IP celular: 192.168.0.187:5173
```

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital — Handoff_11.md
Estamos en checklist lab en casa. Días 1–7 OK. Día 8 en curso:
tenant parrilla-de-casa creado por onboarding; falta pedido + aislamiento.
Recuperar acceso: super-admin impersonar. URL menú: ?tenant=parrilla-de-casa
Hay cambios locales sin commit (LAN, CORS, cancel pedido, etc.) — ver handoff.
```

---

*Última actualización: 6 julio 2026 — checklist lab Semana 1 completa, Día 8 onboarding parrilla-de-casa en curso.*
