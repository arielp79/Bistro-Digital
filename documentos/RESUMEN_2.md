# Resumen 2 — Bistró Digital

Documento de handoff actualizado (junio 2025). Reemplaza y amplía `RESUMEN_1.md` con todo lo implementado hasta la **pantalla de prueba Delivery IA** en el admin.

**Referencias:** `PRD_SaaS_Restaurantes.md` · `RESUMEN_1.md` (versión anterior)

---

## Qué es el proyecto

SaaS multi-tenant para restaurantes: menú digital por QR, cocina en tiempo real, app de mozo, panel admin y delivery con IA por WhatsApp/Instagram.

| Parámetro | Valor |
|-----------|-------|
| Tenant demo | `bistro-digital` |
| Header obligatorio | `X-Tenant-ID: bistro-digital` |
| API | `http://localhost:3000` |
| web-client | `http://localhost:5173` |
| web-admin | `http://localhost:3001` |
| web-kitchen | `http://localhost:3002` |

---

## Arquitectura del monorepo

```
apps/
  api/              → Express + TS + MongoDB + Socket.IO + BullMQ (puerto 3000)
  web-client/       → React/Vite/Tailwind — cliente QR y delivery web (puerto 5173)
  web-kitchen/      → React — tablero Kanban cocina (puerto 3002)
  web-admin/        → React — panel admin completo (puerto 3001)
  mobile-waiter/    → Flutter — app mozo
packages/
  shared-types/     → Tipos TypeScript compartidos
  validation-schemas/ → Esquemas Zod
infra/
  docker-compose.yml → MongoDB, Redis, MinIO
```

**Convenciones aplicadas (PRD):**

- `tenantId` en todas las queries MongoDB
- Respuestas API: `{ data, error }`
- Eventos Socket: `entity:action` (`order:new`, `order:status_changed`, `stock:low_alert`, etc.)
- JWT + RBAC por roles (`admin`, `mozo`, `cocina`, `caja`)
- Tokens de terceros cifrados en tenant (`encrypt()`)

---

## Estado por fase del PRD

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 1** | Core MVP (auth, menú, pedidos, cocina, mozo, pagos) | ✅ **Completa** |
| **Fase 2** | Stock + analytics + delivery manual | ✅ **Completa** |
| **Fase 3** | Delivery IA + Vision AI + AFIP | ⚠️ **~85%** — falta AFIP y WhatsApp/IG en producción |
| **Fase 4** | White-label avanzado, dominios, OpenAPI | ❌ **No iniciada** |

---

## Lo implementado (detalle)

### Infraestructura y base

- Monorepo npm workspaces (`apps/*`, `packages/*`)
- Docker Compose: MongoDB 7, Redis 7, MinIO
- Script de seed con tenant demo, menú, mesas, usuarios, recetas e ingredientes
- Middleware de tenant (`X-Tenant-ID`), auth JWT, rate limiting en pedidos
- Socket.IO para cocina, mozo y tracking de pedidos
- BullMQ + worker `delivery.worker.ts` (requiere Redis activo)

---

### Fase 1 — Core MVP ✅

#### API

| Módulo | Endpoints principales |
|--------|----------------------|
| **Auth** | `POST /login`, `POST /refresh`, `GET /me` |
| **Tenant** | `GET /config`, `GET /settings` (admin), `PATCH /config` (admin) |
| **Menú** | Menú público + CRUD categorías e ítems (admin) |
| **Pedidos** | Crear, listar, detalle, cambio de estado, cerrar mesa |
| **Mesas** | Listar, detalle público, CRUD admin, cambio de estado |
| **Pagos** | Cash, transferencia, MercadoPago preference + webhook |

#### web-client (`apps/web-client`)

- Home con modo mesa (QR `?table=&tenant=`) y botón **Pedir delivery**
- Menú por categorías, carrito, checkout
- i18n es / en / pt
- Tracking de pedido en tiempo real (Socket.IO)
- Checkout delivery: dirección, cálculo de envío, tipo `delivery`
- Integración MercadoPago (preference + página de resultado)

#### web-kitchen (`apps/web-kitchen`)

- Login staff
- Kanban 4 columnas: pendiente → preparando → listo → entregado
- Actualización en tiempo real vía Socket.IO

#### mobile-waiter (Flutter)

- Login, lista de mesas, gestión de pedidos
- Socket.IO y caché offline básico

---

### Fase 2 — Stock + Delivery manual ✅

#### Stock (`apps/api/src/modules/stock`)

- CRUD ingredientes con stock mínimo y unidades (`g`, `ml`, `unit`)
- Movimientos de stock (`POST /api/v1/stock/movements`)
- **Descuento automático** al pasar pedido a estado `preparing` (según recetas del ítem)
- Alertas de stock bajo → evento `stock:low_alert` por socket
- Recetas en seed (`DEMO_RECIPES`) vinculadas a ítems del menú

#### Analytics (`apps/api/src/modules/analytics`)

- Ventas por período (`GET /analytics/sales`)
- Top ítems (`GET /analytics/items/top`)
- Dashboard admin con Recharts

#### Delivery manual

- `DeliveryService.calculateShipping()` — distancia Haversine + tarifa configurable
- `GET /api/v1/delivery/shipping?address=...`
- Flujo completo en web-client (dirección, fee, tracking)

#### web-admin — páginas Fase 2

| Página | Ruta | Funcionalidad |
|--------|------|---------------|
| Dashboard | `/` | Ventas, gráficos, KPIs |
| Stock | `/stock` | Ingredientes, alertas, movimientos |

---

### Fase 3 — Delivery IA + Admin CRUD ✅ (parcial)

#### Backend Delivery IA

| Componente | Archivo / ruta | Descripción |
|------------|----------------|-------------|
| Cola BullMQ | `queue.service.ts` | Jobs `process_message` |
| Worker | `workers/delivery.worker.ts` | Procesa mensajes WA/IG/simulate |
| Sesiones | `delivery-session.model.ts` | TTL 2h, estados conversacionales |
| IA | `ai.service.ts` | Extracción de intenciones (OpenAI o fallback local) |
| Vision | `ai.service.ts` | Validación de comprobantes de transferencia |
| WhatsApp | `webhooks/whatsapp.controller.ts` | Verificación + recepción |
| Instagram | `webhooks/instagram.controller.ts` | Webhook unificado al mismo worker |
| MercadoPago webhook | `webhooks/mercadopago.controller.ts` | Confirmación de pagos delivery |
| Simulador | `POST /api/v1/delivery/simulate` | Encola mensaje como cliente (admin) |
| Sesiones admin | `GET /delivery/sessions`, `GET /delivery/sessions/:id` | Historial completo de chat |

**Estados de sesión:** `greeting` → `collecting_items` → `collecting_address` → `confirming` → `awaiting_payment` → `completed` / `cancelled`

**Sin tokens WhatsApp configurados:** respuestas en logs `[WhatsApp:DEV]`; el worker igual procesa y persiste en MongoDB.

#### web-admin — CRUD completo (sesión reciente)

| Página | Ruta | Funcionalidad |
|--------|------|---------------|
| **Menú** | `/menu` | CRUD categorías e ítems, recetas/ingredientes por ítem |
| **Mesas** | `/tables` | CRUD mesas, copiar link QR |
| **Usuarios** | `/users` | Listar, crear, editar rol/activo/contraseña |
| **Configuración** | `/settings` | Branding, idioma, métodos de pago, tokens MP/WhatsApp (cifrados) |
| **Delivery IA** | `/delivery` | Simulador de chat, sesiones, polling de respuestas IA |

#### DeliveryPage — pantalla de prueba IA

- Formulario teléfono + mensaje → `POST /delivery/simulate`
- Chips de mensajes demo (pedido, dirección, confirmar, cancelar)
- Lista de sesiones activas con estado
- Chat con burbujas usuario/asistente
- Vista de borrador de pedido (ítems, dirección, envío)
- Polling cada 2 s tras enviar hasta recibir respuesta (~30 s máx.)
- Refresh automático de sesiones cada 5 s

#### API admin añadida en esta etapa

```
POST   /api/v1/tables
PATCH  /api/v1/tables/:tableId
DELETE /api/v1/tables/:tableId
PATCH  /api/v1/users/:id
GET    /api/v1/tenant/settings
GET    /api/v1/delivery/sessions/:sessionId
POST   /api/v1/stock/movements
```

#### Tipos compartidos nuevos (`@bistro/shared-types`)

- `TenantAdminSettings`
- `DeliverySessionPublic`, `DeliverySessionMessage`
- `StockLowAlert`, tipos de stock/movimientos ampliados

---

### MercadoPago ✅

- `mercadopago.service.ts` — creación de preference
- Webhook en `/api/v1/webhooks/mercadopago`
- Token configurable en admin (cifrado)
- Checkout web-client con redirección y `PaymentResultPage`

---

## Lo que NO está hecho

| Ítem | Fase | Notas |
|------|------|-------|
| **AFIP** — factura B/C, CAE, PDF | Fase 3 | Modelo tenant tiene campo `afip`; sin módulo `billing/` |
| WhatsApp/Instagram **en producción** | Fase 3 | Webhooks listos; falta configurar tokens reales y exponer URL pública |
| Geocoder real para envíos | Fase 3 | Hoy Haversine con coordenadas fijas del restaurante |
| Refresh token robusto / rotación | Hardening | Endpoint existe; falta pulir en clients |
| Onboarding multi-tenant | Fase 4 | — |
| Dominio custom por tenant | Fase 4 | — |
| OpenAPI / Swagger | Fase 4 | — |
| Tests E2E / load testing | Fase 4 | — |
| Push notifications (FCM) en Flutter | PRD | No implementado |
| RAG / embeddings en menú | PRD IA | No implementado |

---

## API — mapa completo de rutas

```
/api/v1/auth          → login, refresh, me
/api/v1/tenant        → config, settings, patch config
/api/v1/menu          → público + categories/items CRUD
/api/v1/orders        → crear, listar, estado, cerrar
/api/v1/tables        → CRUD + estado
/api/v1/analytics     → sales, items/top
/api/v1/stock         → ingredients, alerts, movements
/api/v1/users         → list, create, patch
/api/v1/delivery      → simulate, sessions, sessions/:id, shipping
/api/v1/payments      → mercadopago/preference
/api/v1/webhooks      → whatsapp, instagram, mercadopago
```

**Servicios internos:** `socket.service`, `queue.service`, `ai.service`, `delivery.worker`, `mercadopago.service`, `whatsapp.service`

---

## Credenciales demo (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@bistro-digital.app` | `admin123` |
| Mozo | `mozo@bistro-digital.app` | `mozo123` |
| Cocina | `cocina@bistro-digital.app` | `cocina123` |
| Caja | `caja@bistro-digital.app` | `caja123` |

---

## Cómo arrancar el entorno

```powershell
npm run docker:up      # MongoDB + Redis + MinIO
npm run seed
npm run dev:api        # :3000 (+ worker delivery si Redis activo)
npm run dev:web        # :5173
npm run dev:admin      # :3001
npm run dev:kitchen    # :3002
npm run dev:mozo       # Flutter (opcional)
```

### Variables relevantes (`apps/api/.env`)

| Variable | Uso |
|----------|-----|
| `MONGODB_URI` | Base de datos |
| `REDIS_URL` | BullMQ + caché (obligatorio para Delivery IA) |
| `JWT_SECRET` | Auth |
| `OPENAI_API_KEY` | IA real (opcional; hay fallback local) |
| `DELIVERY_AI_MODEL` | Modelo OpenAI (default gpt-4o-mini) |
| `WHATSAPP_VERIFY_TOKEN` | Verificación webhook Meta |
| `ENCRYPTION_KEY` | Cifrado tokens tenant |

### Probar Delivery IA en admin

1. Asegurar Redis (`docker:up`) y API (`dev:api`)
2. Login admin en `http://localhost:3001`
3. Ir a **Delivery IA** (`/delivery`)
4. Enviar mensaje (ej. "Quiero 2 empanadas de carne")
5. Esperar respuesta en el chat (worker procesa en ~2–10 s)

---

## Próximos pasos (priorizados)

### Prioridad alta — cerrar Fase 3

1. **AFIP — facturación electrónica**
   - Módulo `apps/api/src/modules/billing/`
   - Endpoints `POST /billing/:orderId/invoice`, descarga PDF
   - UI en admin: configuración CUIT/certificados (ya hay placeholder en tenant model)
   - Librería sugerida en PRD: `@afipsdk/afip.js`

2. **WhatsApp real en staging**
   - Configurar `whatsappPhoneNumberId` + `whatsappAccessToken` en Settings
   - Exponer webhook (`/api/v1/webhooks/whatsapp`) con ngrok/Cloudflare Tunnel
   - Probar flujo completo: mensaje → IA → pedido → cocina → pago

3. **Geocoder para envíos**
   - Integrar Nominatim/Google Geocoding para convertir dirección → coordenadas
   - Reemplazar o complementar Haversine con distancia real

### Prioridad media — calidad y operación

4. **Hardening auth**
   - Refresh token en todos los clients (web-admin, kitchen, Flutter)
   - Expiración y revocación de sesiones

5. **Tests**
   - Unitarios: `delivery.service`, `ai.service` (fallback), stock movements
   - E2E: flujo QR → pedido → cocina; simulate delivery → pedido creado

6. **Observabilidad Delivery IA**
   - Panel en admin: jobs fallidos, latencia worker, últimos errores OpenAI
   - Logs estructurados por `sessionId`

### Prioridad baja — Fase 4

7. **Onboarding tenant** — registro self-service, wizard logo/colores/menú
8. **Dominio custom** — proxy dinámico, SSL por tenant
9. **OpenAPI** — documentar `/api/v1` para integradores
10. **White-label mobile** — tema dinámico Flutter desde `/tenant/config`

---

## Cambios respecto a RESUMEN_1

| Tema | RESUMEN_1 | RESUMEN_2 (ahora) |
|------|-----------|-------------------|
| Admin CRUD menú/mesas/users/settings | Pendiente | ✅ Completo |
| Pantalla Delivery IA admin | ❌ | ✅ `/delivery` |
| `GET /delivery/sessions/:id` | No existía | ✅ Con historial |
| Stock automático + movimientos | Parcial | ✅ Completo |
| Siguiente tarea sugerida | Admin CRUD o Delivery UI | **AFIP** o WhatsApp producción |

---

## Texto para pegar en un nuevo chat

```
Proyecto: Bistró Digital (monorepo en c:\Proyectos\Bistro_Digital).
PRD: PRD_SaaS_Restaurantes.md
Handoff: RESUMEN_2.md

Estado:
- Fase 1 ✅ completa (MercadoPago incluido)
- Fase 2 ✅ completa (stock auto, analytics, delivery web-client)
- Fase 3 ~85%: Delivery IA backend + simulador admin (/delivery); falta AFIP y WA/IG producción
- Fase 4 ❌ no iniciada

Tenant: bistro-digital | Header: X-Tenant-ID: bistro-digital
Admin: admin@bistro-digital.app / admin123

Arranque: docker:up → seed → dev:api + dev:admin (+ Redis para Delivery IA)

Siguiente tarea sugerida: módulo AFIP (factura B/C) o conectar WhatsApp real.
```

---

*Última actualización: junio 2025 — incluye DeliveryPage, admin CRUD completo y endpoints de sesiones delivery.*
