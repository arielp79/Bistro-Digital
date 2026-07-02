import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
const TIMEOUT_MS = 8_000;

if (!uri?.trim()) {
  console.error('[preflight] MONGODB_URI no definida en apps/api/.env');
  process.exit(1);
}

const cluster = uri.match(/@([^/]+)/)?.[1] ?? 'cluster remoto';

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: TIMEOUT_MS });
  await mongoose.connection.db.admin().ping();
  console.log(`[preflight] MongoDB Atlas OK — ${cluster}`);
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[preflight] No se pudo conectar a MongoDB Atlas.');
  console.error(`  Cluster: ${cluster}`);
  console.error(`  Error: ${message}`);

  if (message.includes('whitelist') || message.includes('ServerSelection')) {
    console.error('');
    console.error('  → Agregá tu IP en Atlas: Network Access → Add IP Address');
    console.error('    https://www.mongodb.com/docs/atlas/security-whitelist/');
    console.error('  → O usá "Allow Access from Anywhere" (0.0.0.0/0) solo en desarrollo.');
  }

  process.exit(1);
}
