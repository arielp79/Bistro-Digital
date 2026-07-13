# Guía: demo online (Netlify + API remota)

Paso a paso para publicar **Bistró Digital** en internet y mostrárselo a un posible cliente.

**Arquitectura:**

```
Cliente (celular/PC)
   ├── Menú QR     → Netlify  (web-client)
   ├── Admin       → Netlify  (web-admin, opcional)
   └── API + WS    → Render / Railway  (apps/api)
                        └── MongoDB Atlas (ya lo usás)
```

Netlify **solo** sirve el frontend. La API **tiene** que estar en otro servicio.

**Alcance de esta demo:** menú QR, pedidos, admin, tiempo real.  
**Fuera:** Delivery IA (Redis), WhatsApp, AFIP real, app mozo (sigue en Android/LAN).

---

## 0) Requisitos previos

- [ ] Cuenta en [GitHub](https://github.com) con el repo `Bistro-Digital` (rama `master` actualizada)
- [ ] Cuenta en [Netlify](https://www.netlify.com)
- [ ] Cuenta en [Render](https://render.com) (recomendado) o Railway
- [ ] [MongoDB Atlas](https://cloud.mongodb.com) con cluster y `MONGODB_URI`
- [ ] Node 20 en tu PC (para seed / pruebas locales)

---

## 1) Preparar MongoDB Atlas

1. Entrá a Atlas → **Network Access**.
2. Agregá `0.0.0.0/0` (Allow from anywhere) **solo para la demo** (o las IPs de Render si las conocés).
3. Anotá tu connection string:
   `mongodb+srv://USER:PASS@CLUSTER.mongodb.net/restaurant-saas?retryWrites=true&w=majority`

---

## 2) Desplegar la API (Render)

### Opción A — Blueprint (recomendada)

1. Pusheá `render.yaml` en `master` (raíz del repo).
2. Abrí https://dashboard.render.com/blueprints → **New Blueprint Instance**.
3. Conectá el repo `Bistro-Digital` (rama `master`).
4. Render crea el servicio `bistro-api` y te pide las env `sync: false`.
5. Pegá los valores (abajo) → Apply / Deploy.

### Generar secretos en tu PC

```powershell
cd C:\Proyectos\Bistro_Digital
node scripts/generate-render-secrets.mjs
```

Copiá `ENCRYPTION_KEY` (64 hex), `JWT_SECRET`, `JWT_REFRESH_SECRET`.

### Variables a completar a mano

| Key | Valor |
|-----|--------|
| `MONGODB_URI` | Connection string de Atlas |
| `ENCRYPTION_KEY` | Salida del script |
| `CORS_ORIGIN` | Temporal: `http://localhost:5173,http://localhost:3001` (luego URLs Netlify) |
| `CLIENT_BASE_URL` | Temporal: `http://localhost:5173` |
| `WEB_ADMIN_URL` | Temporal: `http://localhost:3001` |
| `API_URL` / `API_PUBLIC_URL` | La URL de Render tras el deploy (`https://….onrender.com`) |

El Blueprint ya fija: `NODE_ENV=production`, `SKIP_DELIVERY_WORKER=true`, etc.  
`JWT_*` pueden auto-generarse en Render o pegá los del script.

### Opción B — Web Service manual

1. https://dashboard.render.com → **New** → **Web Service** → repo `Bistro-Digital`.
2. Config:

| Campo | Valor |
|-------|--------|
| Name | `bistro-api` |
| Branch | `master` |
| Runtime | Node |
| Root Directory | *(vacío)* |
| Build Command | `npm install && npm run build --workspace=@bistro/shared-types && npm run build --workspace=@bistro/validation-schemas && npm run build --workspace=@bistro/api` |
| Start Command | `npm run start --workspace=@bistro/api` |
| Plan | Free |
| Health Check Path | `/health` |

3. Cargá las mismas env + `NODE_ENV=production`, `SKIP_DELIVERY_WORKER=true`, `ONBOARDING_ENABLED=true`, `API_DOCS_ENABLED=false`.

### Health check

1. Esperá el deploy (varios minutos la primera vez).
2. Abrí `https://TU-API.onrender.com/health` → `{ "status": "ok", ... }`.
3. Si falla: **Logs** en Render (`MONGODB_URI`, build, o secrets).

> Plan free: el servicio se duerme; el primer request puede tardar 30–60 s.

### Seed demo (una vez)

```powershell
cd C:\Proyectos\Bistro_Digital
# MONGODB_URI en apps/api/.env = el mismo Atlas de Render
npm run seed
```

- Admin: `admin@bistro-digital.app` / `admin123`
- Slug: `bistro-digital`

---

## 3) Desplegar el menú QR (Netlify)

### 3.1 Nuevo sitio

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Conectá GitHub → repo `Bistro-Digital`.
3. Settings de build (el repo ya tiene `netlify.toml` en la raíz):

| Campo | Valor |
|-------|--------|
| Branch | `master` |
| Build command | *(toma de netlify.toml)* `npm install && npm run build --workspace=@bistro/web-client` |
| Publish directory | `apps/web-client/dist` |

4. **Antes de deploy**, en **Site configuration → Environment variables** agregá:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://TU-API.onrender.com` *(sin barra final)* |
| `NODE_VERSION` | `20` |

5. Deploy.

### 3.2 Anotá la URL del menú

Ejemplo: `https://algo-random.netlify.app`  
Podés renombrarla en **Site settings → Domain management** (ej. `bistro-menu-demo.netlify.app`).

### 3.3 Probar el menú

Abrí:

```
https://TU-MENU.netlify.app/menu?tenant=bistro-digital
```

Deberías ver el menú del tenant demo. Si falla:
- Abrí DevTools → Network: ¿las llamadas van a `TU-API.onrender.com`?
- ¿CORS? → actualizá `CORS_ORIGIN` en Render e incluí exactamente la URL de Netlify (con `https://`, sin barra final) y **redeploy** la API.

---

## 4) Desplegar el admin (Netlify, segundo sitio)

1. Netlify → **Add new site** → mismo repo.
2. Esta vez **no** uses el `netlify.toml` del menú. En UI configurá:

| Campo | Valor |
|-------|--------|
| Branch | `master` |
| Build command | `npm install && npm run build --workspace=@bistro/web-admin` |
| Publish directory | `apps/web-admin/dist` |

3. Environment variables:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://TU-API.onrender.com` |
| `NODE_VERSION` | `20` |

4. Deploy → anotá URL admin (ej. `https://bistro-admin-demo.netlify.app`).

5. Login:
   - `https://TU-ADMIN.netlify.app/login?tenant=bistro-digital`
   - `admin@bistro-digital.app` / `admin123`

---

## 5) Cerrar el circuito (CORS y URLs)

En Render → Environment, actualizá y **redeploy**:

```env
CORS_ORIGIN=https://TU-MENU.netlify.app,https://TU-ADMIN.netlify.app
CLIENT_BASE_URL=https://TU-MENU.netlify.app
WEB_ADMIN_URL=https://TU-ADMIN.netlify.app
API_URL=https://TU-API.onrender.com
API_PUBLIC_URL=https://TU-API.onrender.com
```

Sin esto, el navegador bloqueará las llamadas del front a la API.

---

## 6) Checklist de prueba (10 minutos)

| # | Prueba | OK |
|---|--------|----|
| 1 | `https://API/health` responde | ☐ |
| 2 | Menú carga con `?tenant=bistro-digital` | ☐ |
| 3 | Agregar plato → checkout → crear pedido | ☐ |
| 4 | Admin login → ver pedido en Pedidos | ☐ |
| 5 | Cambiar estado (confirmed → preparing → ready) | ☐ |
| 6 | Socket: pedido nuevo aparece sin refrescar (ícono WiFi) | ☐ |

Link para el cliente (menú):

```
https://TU-MENU.netlify.app/menu?tenant=bistro-digital
```

Link admin (solo vos / demo guiada):

```
https://TU-ADMIN.netlify.app/login?tenant=bistro-digital
```

---

## 7) Qué decirle al cliente

- Puede abrir el **menú desde el celular** (como un QR).
- Vos operás el **admin** en otra pestaña / notebook.
- Es una **demo online**; el piloto en el local puede seguir con notebook + WiFi + app mozo Android.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Menú en blanco / error de red | `VITE_API_URL` mal o sin rebuild | Verificar env en Netlify y **Clear cache and deploy** |
| `CORS bloqueado` en consola | Falta origen en `CORS_ORIGIN` | Agregar URL exacta de Netlify + redeploy API |
| `/health` tarda mucho | Render free dormido | Esperar 30–60 s; “despertar” antes de la demo |
| Login admin falla | Tenant / seed | Correr `npm run seed` contra el Atlas de prod |
| Pedidos no en vivo | Socket / CORS | Misma `VITE_API_URL`; CORS con origen del admin |
| Build Netlify falla en monorepo | Node / workspaces | `NODE_VERSION=20`; build desde raíz del repo |

---

## Orden resumido

1. Atlas Network Access abierto  
2. API en Render + env + `/health` OK  
3. `npm run seed` (datos demo)  
4. Netlify menú + `VITE_API_URL`  
5. Netlify admin + `VITE_API_URL`  
6. Actualizar `CORS_ORIGIN` / URLs en Render  
7. Probar flujo pedido + admin  

---

*Última actualización: 13 julio 2026 — commit `e0bd88d` (VITE_API_URL + cookies cross-origin).*
