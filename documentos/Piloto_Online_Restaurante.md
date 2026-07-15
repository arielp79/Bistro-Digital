# Piloto online en restaurante (sin Delivery IA ni AFIP)

Arquitectura mínima:

```
Celular cliente  →  Menú Netlify  →  API Render  →  Atlas
Tablet/encargado →  Admin Netlify ─┘
Mozo Android     →  API Render (IP o URL pública)
Cocina           →  Admin → Pedidos (misma tablet o notebook)
```

---

## 1) API (Render) — ya la tenés

En **Environment** del servicio `bistro-api`:

| Variable | Valor |
|----------|--------|
| `SKIP_DELIVERY_WORKER` | `true` |
| `CORS_ORIGIN` | `https://TU-MENU.netlify.app,https://TU-ADMIN.netlify.app` |
| `CLIENT_BASE_URL` | `https://TU-MENU.netlify.app` |
| `WEB_ADMIN_URL` | `https://TU-ADMIN.netlify.app` |
| `API_URL` / `API_PUBLIC_URL` | `https://TU-API.onrender.com` |
| `MONGODB_URI` | Atlas |

Guardá y **Manual Deploy** si cambiaste env.

Atlas → Network Access: `0.0.0.0/0` (piloto) o IP del Render.

---

## 2) Menú QR (Netlify) — sitio 1

Si ya existe, verificá:

| Env | Valor |
|-----|--------|
| `VITE_API_URL` | `https://TU-API.onrender.com` |
| `NODE_VERSION` | `20` |

Usa el `netlify.toml` de la raíz (web-client).  
**Clear cache and deploy** si agregaste/cambiaste `VITE_API_URL`.

Probar: `https://TU-MENU.netlify.app/menu?tenant=bistro-digital&table=ID`

---

## 3) Admin / gestión (Netlify) — sitio 2 (nuevo)

1. Netlify → **Add new site** → mismo repo `Bistro-Digital`, branch `master`.
2. Build settings:
   - **Base directory:** `apps/web-admin`  
     (así usa `apps/web-admin/netlify.toml` y **no** el del menú)
   - Publish: `dist` (ya viene en el toml)
3. Environment variables:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://TU-API.onrender.com` |
| `VITE_WEB_CLIENT_URL` | `https://TU-MENU.netlify.app` |
| `VITE_PILOT_CORE` | `true` |
| `NODE_VERSION` | `20` |

4. Deploy. Login:
   `https://TU-ADMIN.netlify.app/login?tenant=bistro-digital`  
   (o el slug del restaurante)

Con `VITE_PILOT_CORE=true` el menú lateral **no muestra** Delivery IA, Cliente piloto ni Facturación AFIP.

---

## 4) Cocina en el restaurante

Sin deploy de kitchen: usá **Admin → Pedidos** en una tablet (estados confirmed / preparing / ready).

Opcional más adelante: tercer sitio Netlify con `web-kitchen` + `VITE_API_URL`.

---

## 5) Mozo Android

En el login de la app:

- Tenant: slug del local  
- API Base URL: `https://TU-API.onrender.com` *(misma API pública; no hace falta LAN)*  
- Usuario mozo del tenant  

> Render free puede “dormir”: abrí `/health` 1 minuto antes del servicio.

---

## 6) Checklist de prueba en el local (30–45 min)

- [ ] `/health` de la API OK  
- [ ] Menú Netlify carga con `?tenant=&table=`  
- [ ] Admin login + Pedidos + Mesas (copiar QR usa `VITE_WEB_CLIENT_URL`)  
- [ ] Pedido QR → aparece en Admin Pedidos  
- [ ] Cambiar estados en Pedidos (cocina)  
- [ ] Mozo ve pedido / cierra mesa  
- [ ] No usar Delivery ni AFIP  

---

## 7) Orden de variables (copiar/pegar conceptual)

**Render `CORS_ORIGIN`:**
```
https://menu-xxx.netlify.app,https://admin-xxx.netlify.app
```

**Menú Netlify:** solo `VITE_API_URL`  
**Admin Netlify:** `VITE_API_URL` + `VITE_WEB_CLIENT_URL` + `VITE_PILOT_CORE=true`

---

*Actualizado: 15 julio 2026.*
