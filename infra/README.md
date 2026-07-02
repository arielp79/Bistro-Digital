# Infraestructura local (Docker)

MongoDB **no** corre en Docker. Los datos persisten en **MongoDB Atlas** (`MONGODB_URI` en `apps/api/.env`).

Este compose levanta solo servicios auxiliares:

| Servicio | Puerto | Uso |
|----------|--------|-----|
| **Redis** | 6379 | Delivery IA (BullMQ) — recomendado si probás el módulo IA |
| **MinIO** | 9000 / 9001 | Storage S3-compatible (imágenes) — opcional en dev |

```powershell
npm run docker:up    # Redis + MinIO
npm run docker:down
```
