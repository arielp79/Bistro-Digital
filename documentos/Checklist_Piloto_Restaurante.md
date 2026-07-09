# Checklist piloto en restaurante — Bistró Digital

**Uso:** preparación 1–2 días antes + día del servicio.  
**Alcance recomendado (primera visita):** menú QR + admin + cocina (opcional) + **app mozo Android**.  
**Fuera de alcance inicial:** Delivery IA, WhatsApp, AFIP real, Stripe SaaS.

---

## Estado del repo (jul 2026)

| Ítem | Estado |
|------|--------|
| Lab días 1–12 | ✅ Cerrado (incl. AFIP demo) |
| App mozo Android | ✅ APK generado, tenant/API configurables en login |
| Commit billing PDF | ✅ `b59657e` (local, pendiente push si aplica) |
| Cambios app mozo | Commitear antes del piloto |

**APK actual:** `apps/mobile-waiter/build/app/outputs/flutter-apk/app-release.apk` (~49 MB)

Regenerar APK:
```powershell
cd C:\Proyectos\Bistro_Digital
npm run build:mozo:apk
```

---

## A) Preparar en casa (1–2 días antes)

### 1. Restaurante en el sistema

**Opción A — Tenant nuevo (recomendado):**
1. `http://localhost:3001/onboarding`
2. Completar wizard (nombre, slug, admin, menú inicial).
3. Anotar **slug** (ej. `parrilla-del-norte`).

**Opción B — Usar demo `bistro-digital`:**
- Solo para prueba rápida; no ideal con clientes reales.

### 2. Configuración en admin del tenant

Login: `http://localhost:3001/login?tenant=<slug>`

| Tarea | Dónde |
|-------|--------|
| Menú con precios reales o de prueba | Menú |
| Mesas y zonas | Mesas |
| Usuario **mozo** (rol Mozo) | Usuarios |
| Stock mínimo si aplica | Stock |
| Logo/colores (opcional) | Ajustes |

**Usuario mozo:** crear en **Usuarios** → rol **Mozo**. Anotar email y contraseña.

### 3. APK en los celulares Android

1. Copiar `app-release.apk` a cada teléfono (Drive, USB, WhatsApp).
2. Habilitar **instalar apps desconocidas**.
3. Instalar **Mozo**.
4. *(Opcional)* Abrir app una vez en casa con API local para validar login.

### 4. Notebook lista

- [ ] Node 20+ y `npm install` hecho en el repo
- [ ] `apps/api/.env` con `MONGODB_URI` válido
- [ ] Flutter instalado (solo si vas a recompilar APK)
- [ ] Cargador + cable de red o hotspot de respaldo
- [ ] Anotar IP LAN de casa con `ipconfig` (para prueba previa)

### 5. MongoDB Atlas

En [Network Access](https://cloud.mongodb.com):
- Agregar IP del restaurante **o** temporalmente `0.0.0.0/0` solo para el piloto (menos seguro, más simple).

### 6. Ensayo en casa (30 min — obligatorio)

```powershell
cd C:\Proyectos\Bistro_Digital
npm run dev:api
npm run dev:admin
npm run dev:web
```

1. `ipconfig` → anotar IPv4 (ej. `192.168.0.187`).
2. Celular en **misma WiFi**:
   - Menú QR: `http://<IP>:5173/menu?tenant=<slug>`
   - App mozo: API `http://<IP>:3000`, tenant + usuario mozo.
3. Hacer 1 pedido QR → confirmar en admin → ver en app mozo.
4. Cerrar pedido desde app mozo (Cerrar mesa / Cobrar).
5. Factura demo opcional en `/billing`.

Si esto funciona en casa, el 90% del piloto en restaurante está cubierto.

---

## B) Día del restaurante — antes de abrir

### 1. Llegada e infra

- [ ] Conectar notebook al WiFi del local
- [ ] `ipconfig` → anotar **nueva IP** (cambia por red)
- [ ] Verificar Atlas acepta conexión (o IP del local en whitelist)
- [ ] **Firewall Windows:** permitir Node en puertos **3000**, **3001**, **5173** (red privada)

### 2. Arranque de servicios

Tres terminales en `C:\Proyectos\Bistro_Digital`:

```powershell
npm run dev:api
npm run dev:admin
npm run dev:web
```

Opcional cocina en pantalla:
```powershell
npm run dev:kitchen
```

### 3. Health check (2 min)

| URL | Esperado |
|-----|----------|
| `http://localhost:3000/health` | `{ "status": "ok" }` |
| `http://<IP>:3000/health` | Igual (desde celular navegador) |
| `http://<IP>:5173/menu?tenant=<slug>` | Menú carga |

### 4. Configurar mozos en cada Android

En login de la app:

| Campo | Valor |
|-------|--------|
| Tenant | `<slug>` |
| API Base URL | `http://<IP-notebook>:3000` |
| Email / pass | usuario mozo |

Ícono **WiFi verde** arriba = socket conectado.

### 5. QRs en mesas

URL del menú por mesa (si usás mesa en QR):
`http://<IP>:5173/menu?tenant=<slug>&table=<tableId>`

O QR genérico del tenant y el cliente elige mesa en UI.

---

## C) Durante el servicio — flujo objetivo

```
Cliente escanea QR → pide desde celular
        ↓
Admin/cocina confirma → preparing → ready
        ↓
Mozo ve pedido en app → entrega → Cierra mesa / Cobra
        ↓
(Opcional) Factura B demo en /billing
```

**Roles mínimos:**
- 1 persona con admin (confirmar pedidos)
- 1+ mozo con app Android
- Cocina: pantalla kitchen o pestaña Pedidos en admin

---

## D) Qué NO activar en la primera visita

| Módulo | Por qué esperar |
|--------|-----------------|
| Delivery IA | Requiere Redis + worker + API keys |
| WhatsApp/Meta | Requiere túnel HTTPS + app Meta |
| AFIP real | Requiere certificados del restaurante |
| Stripe plan | No afecta operación de pedidos |

---

## E) Plan B si falla el WiFi del local

1. **Hotspot desde la notebook** → celulares se conectan al hotspot.
2. Nueva IP (suele ser `192.168.137.1` en hotspot Windows) → actualizar URL en QRs y en app mozo.
3. Atlas sigue funcionando (internet vía datos del teléfono/notebook).

---

## F) Credenciales de referencia (solo demo)

| Rol | Email | Password |
|-----|-------|----------|
| Admin demo | `admin@bistro-digital.app` | `admin123` |
| Mozo demo | `mozo@bistro-digital.app` | `mozo123` |
| Super-admin | `platform@saas-base.com` | `platform123` |

En piloto real usar usuarios del tenant creado en onboarding.

---

## G) Checklist de cierre del día

- [ ] Al menos 3 pedidos QR completos (pending → delivered/paid)
- [ ] Mozo cerró al menos 1 mesa desde la app
- [ ] Sin errores críticos de stock/cocina
- [ ] Anotar fricciones (URL, login, lentitud, UX)
- [ ] Apagar servicios y llevar notebook

---

## H) Contacto rápido / soporte

- Super-admin: `http://localhost:3001/platform/login` (impersonar tenant si hace falta)
- API logs en terminal `dev:api`
- Re-seed **no** repone stock — reponer desde admin Stock

---

*Última actualización: 9 julio 2026 — piloto restaurante con app mozo Android.*
