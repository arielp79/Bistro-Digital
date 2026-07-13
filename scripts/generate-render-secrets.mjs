// Genera secretos para pegar en Render (no se guardan en disco).
// Uso: node scripts/generate-render-secrets.mjs

import crypto from 'node:crypto';

const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefresh = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log(`
=== Pega esto en Render → Environment ===

ENCRYPTION_KEY=${encryptionKey}
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefresh}

# Mientras no tengas Netlify, temporal:
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
CLIENT_BASE_URL=http://localhost:5173
WEB_ADMIN_URL=http://localhost:3001

# Despues del primer deploy, actualiza con la URL de Render:
# API_URL=https://bistro-api-xxxx.onrender.com
# API_PUBLIC_URL=https://bistro-api-xxxx.onrender.com

# MONGODB_URI = la misma de tu Atlas (apps/api/.env)
`);
