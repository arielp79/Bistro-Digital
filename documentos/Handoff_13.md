# Handoff 13 — Bistró Digital

Documento de handoff para continuidad con otro agente (15 julio 2026).  
Reemplaza `Handoff_12.md`. Sesión actual: **piloto en restaurante real (online)** — lab en casa cerrado; deploy Render/Netlify; QR por mesa listo.

**Referencias:**  
`documentos/PRD_SaaS_Restaurantes.md` · `documentos/Handoff_12.md` · `documentos/Piloto_Online_Restaurante.md` · `documentos/Procedimiento_Piloto_Restaurante.md` · `documentos/Guia_Deploy_Online.md` · `documentos/Checklist_Piloto_Restaurante.md`

> Toda la documentación markdown del proyecto vive en `documentos/`.

---

## Qué es el proyecto

**Nombre de producto / marca:** **Bistró Digital**  
**Repo npm / slug demo:** `bistro-digital`  
**GitHub:** `arielp79/Bistro-Digital` (rama `master`)

SaaS multi-tenant white-label para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo Android, panel admin, delivery con IA (WhatsApp/Instagram), facturación AFIP (demo/real), operador SaaS (super-admin), cobro de planes vía Stripe.

| Parámetro | Valor |
|-----------|-------|
| Repo local | `c:\Proyectos\Bistro_Digital` |
| GitHub | `arielp79/Bistro-Digital` → `master` |
| **Último commit en origin** | `3277056` — `feat(admin): QR por mesa con descarga e impresión` |
| Tenant demo (seed) | `bistro-digital` |
| Header API | `X-Tenant-ID: <slug>` |
| Base de datos (piloto / decisión actual) | **MongoDB Atlas** (no usar Docker Mongo para el piloto) |
| Delivery IA en piloto | **Apagado** (`SKIP_DELIVERY_WORKER=true`) |
| AFIP en piloto | **Fuera de alcance** (oculto con `VITE_PILOT_CORE=true` en admin) |

---

## ⚡ En qué estamos AHORA (leer primero)

### Contexto

1. El **checklist lab en casa (días 1–14)** quedó cerrado en lo esencial: flujos base, onboarding, super-admin, Stripe, Delivery IA, AFIP demo, app mozo, ensayo de servicio.
2. Se pasó a **piloto online en restaurante real** (núcleo: menú QR + admin + cocina vía Pedidos + mozo Android). **Sin Delivery IA ni AFIP.**
3. Arquitectura online desplegable / parcialmente desplegada:
   - **API** → Render (`bistro-api`)
   - **Menú QR** → Netlify sitio 1 (`netlify.toml` raíz → `web-client`)
   - **Admin** → Netlify sitio 2 (base directory `apps/web-admin`, `VITE_PILOT_CORE=true`)
   - **DB** → **Atlas** (usuario decidió obviar Docker Mongo)
   - **Mozo** → APK Android apuntando a URL API Render
   - **Cocina** → Admin → Pedidos (sin deploy obligatorio de `web-kitchen`)

### Próximo paso inmediato (agente entrante)

1. Verificar/completar URLs reales de Render + Netlify (menú y admin) y envolver CORS en Render.
2. Confirmar Admin Netlify (sitio 2) con env: `VITE_API_URL`, `VITE_WEB_CLIENT_URL`, `VITE_PILOT_CORE=true`, `NODE_VERSION=20`.
3. Generar/imprimir QRs desde **Mesas → Ver QR** (ya en `master`).
4. Seguir `documentos/Piloto_Online_Restaurante.md` + `Procedimiento_Piloto_Restaurante.md`.
5. **No commitear** cambios locales de `infra/` (Docker) ni `Mongo DB.txt` / `test-results/`.

---

## Progreso checklist lab (casa)

| Día | Tema | Estado |
|-----|------|--------|
| 1–7 | QR, roles, menú, stock, LAN, delivery manual, tests | ✅ |
| 8 | Onboarding tenant ficticio | ✅ |
| 9 | Super-admin (impersonar, soft-delete) | ✅ |
| 10 | Stripe checkout test | ✅ |
| 11 | Delivery IA + Redis | ✅ |
| 12 | AFIP factura B demo + PDF | ✅ |
| 13 | App mozo Flutter/Android | ✅ |
| 14 | Ensayo servicio / piloto restaurante | 🔄 En preparación online |

Tenant de prueba onboarding `parrilla-de-casa`: **soft-deleted** — no usar.

---

## Commits relevantes (ya en `origin/master`)

| Commit | Mensaje |
|--------|---------|
| `3277056` | **feat(admin): QR por mesa con descarga e impresión** ← último |
| `61af9dc` | feat(deploy): admin Netlify piloto sin Delivery/AFIP (`VITE_PILOT_CORE`) |
| `118ce3e` | fix(netlify): build `shared-types` antes de web-client |
| `1c4e903` | fix(api): build TypeScript para Render |
| `8f98676` | chore(deploy): Blueprint Render + guía online |
| `e0bd88d` | feat(deploy): `VITE_API_URL` + cookies cross-origin |
| `c20de31` | feat(mozo): app Android lista para piloto |
| `b59657e` | fix(billing): PDF con tenant actual |
| `929dd84` | fix(lab): Stripe post-checkout + Delivery IA |

---

## Feature QR por mesa (recién pusheado)

En **Admin → Mesas** (`/tables`):

- Botón **Ver QR** por mesa → modal con código QR.
- **Descargar PNG**, **Imprimir**, **Copiar link**.
- URL vía `buildTableQrUrl()` en `apps/web-admin/src/utils/admin.ts` (usa `VITE_WEB_CLIENT_URL`).
- Dependencia: `qrcode.react` en `apps/web-admin`.
- Archivos: `TableQrModal.tsx`, cambios en `TablesPage.tsx`.

**Crítico en Netlify admin:** `VITE_WEB_CLIENT_URL` = URL pública del menú; si falta, los QR apuntan a `localhost:5173`.

**Mesa 1 demo (Atlas / seed histórico):** id `6a368a6f4e13de2ee996fcac`  
Ejemplo menú:  
`/menu?table=6a368a6f4e13de2ee996fcac&tenant=bistro-digital`  
(No usar el literal `ID_DE_LA_MESA` en la URL.)

---

## Arquitectura piloto online

```
Celular cliente  →  Menú Netlify  →  API Render  →  Atlas
Tablet/encargado →  Admin Netlify ─┘
Mozo Android     →  API Render
Cocina           →  Admin → Pedidos
```

### Env clave

**Render (`bistro-api`):**

| Variable | Notas |
|----------|--------|
| `MONGODB_URI` | Atlas |
| `SKIP_DELIVERY_WORKER` | `true` |
| `CORS_ORIGIN` | URLs Netlify menú + admin (coma-separadas) |
| `CLIENT_BASE_URL` | URL menú Netlify |
| `WEB_ADMIN_URL` | URL admin Netlify |

Atlas Network Access: `0.0.0.0/0` (piloto) o IP de Render.

**Netlify menú (sitio 1):** `VITE_API_URL`, `NODE_VERSION=20`  
**Netlify admin (sitio 2):** base dir `apps/web-admin`; `VITE_API_URL`, `VITE_WEB_CLIENT_URL`, `VITE_PILOT_CORE=true`, `NODE_VERSION=20`

Detalle paso a paso: `documentos/Piloto_Online_Restaurante.md`.

---

## App mozo Android

- Tenant + URL de API configurables en login.
- APK: `apps/mobile-waiter/build/app/outputs/flutter-apk/app-release.apk`
- Regenerar: `npm run build:mozo:apk`
- Commit: `c20de31`

---

## Working tree local (al cerrar este handoff)

| Ítem | Acción |
|------|--------|
| `infra/README.md`, `infra/docker-compose.yml` | Modificados localmente — **no commitear** (se usa Atlas, no Docker Mongo) |
| `Mongo DB.txt` | **No commitear** |
| `test-results/` | **No commitear** |
| `documentos/Handoff_12.md`, `Procedimiento_Piloto_Restaurante.md` | Untracked — se pueden commitear docs si el usuario quiere |
| Este archivo `Handoff_13.md` | Nuevo; commitear si el usuario lo pide |

QR ya está en `origin/master` (`3277056`).

---

## Arranque local (si hace falta)

```powershell
cd c:\Proyectos\Bistro_Digital

# .env API: MONGODB_URI = Atlas; SKIP_DELIVERY_WORKER=true
npm run dev:api
npm run dev:admin
npm run dev:web
# opcional cocina demo:
npm run dev:kitchen
```

**Nota histórica:** hubo fallos `querySrv ECONNREFUSED` por DNS local (`127.0.0.1`) hacia Atlas; workaround fue Mongo Docker. **Decisión actual del usuario: Atlas.** Si vuelve el error DNS, revisar DNS del sistema / VPN / hosts — no volver a Docker salvo que lo pida.

Puertos locales: API `:3000`, admin `:3001`, kitchen `:3002`, menú `:5173`.

---

## Credenciales demo (`bistro-digital`)

| Rol | Email | Password |
|-----|-------|----------|
| Super-admin | `platform@saas-base.com` | `platform123` |
| Admin | `admin@bistro-digital.app` | `admin123` |
| Cocina | `cocina@bistro-digital.app` | `cocina123` |
| Caja | `caja@bistro-digital.app` | `caja123` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` |

Login admin: `…/login?tenant=bistro-digital`  
Platform: `…/platform/login`

---

## Gotchas importantes

| Tema | Detalle |
|------|---------|
| **DB piloto** | Atlas. Obviar Docker Mongo. |
| **QR online** | Requiere `VITE_WEB_CLIENT_URL` correcto en admin Netlify. |
| **CORS** | Render debe listar ambas URLs Netlify. |
| **Piloto core** | `VITE_PILOT_CORE=true` oculta Delivery IA / AFIP / cliente piloto del menú admin. |
| **web-kitchen** | Hardcode tenant `bistro-digital`; en piloto usar Admin → Pedidos. |
| **Stock** | Confirmed → preparing descuenta; seed no repone stock. |
| **Stripe** | Webhook necesita `stripe:listen` en local; hay sync/confirm en Settings. |
| **Literal mesa** | Nunca `ID_DE_LA_MESA` en la URL; usar el ObjectId real. |
| **DNS Atlas** | Si Node no resuelve SRV, fallo de conexión (no es “API rota”). |

---

## Estado por fase del PRD

| Fase | Estado |
|------|--------|
| Fase 1–2 | ✅ Completa |
| Fase 3 | ~98% (AFIP demo OK; homologación real pendiente de certificados) |
| Fase 4 | ~99% |
| Deploy comercial / piloto | 🔄 En curso (Render + Netlify + Atlas) |

---

## Documentos a usar como runbook

| Doc | Para qué |
|-----|----------|
| `Piloto_Online_Restaurante.md` | Deploy online mínimo |
| `Guia_Deploy_Online.md` | Detalle deploy |
| `Procedimiento_Piloto_Restaurante.md` | Operativa del día (roles, cobro, servicio) |
| `Checklist_Piloto_Restaurante.md` | Checklist pre-visita / día |

---

## Prompt para nuevo agente

```
Proyecto: Bistró Digital (c:\Proyectos\Bistro_Digital)
Marca: Bistró Digital | repo: arielp79/Bistro-Digital | branch master
PRD: documentos/PRD_SaaS_Restaurantes.md
Handoff: documentos/Handoff_13.md

CONTEXTO: Lab casa (días 1–13) cerrado. Ahora: piloto online en restaurante
sin Delivery IA ni AFIP. DB: MongoDB Atlas (NO Docker).

Último commit origin: 3277056 feat(admin): QR por mesa con descarga e impresión

ARQUITECTURA:
- API → Render (SKIP_DELIVERY_WORKER=true, MONGODB_URI Atlas)
- Menú → Netlify (web-client, VITE_API_URL)
- Admin → Netlify apps/web-admin (VITE_API_URL, VITE_WEB_CLIENT_URL, VITE_PILOT_CORE=true)
- Mozo → APK Android → URL Render
- Cocina → Admin → Pedidos

PENDIENTE: cerrar URLs reales, CORS, QRs impresos, ensayo en local.

NO COMMITEAR: infra docker local, Mongo DB.txt, test-results/

Demo: platform@saas-base.com / platform123
Admin: admin@bistro-digital.app / admin123 / slug bistro-digital
Mesa 1 id histórico: 6a368a6f4e13de2ee996fcac
```

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital — Handoff_13.md
Lab cerrado. Piloto online: API Render + menú/admin Netlify + Atlas (sin Docker).
QR por mesa ya en master (3277056). Siguiente: terminar URLs/CORS/deploy admin
y ensayo en restaurante según Piloto_Online_Restaurante.md.
```

---

*Última actualización: 15 julio 2026 — QR pusheado; DB Atlas; piloto online en curso; handoff para cambio de agente.*
