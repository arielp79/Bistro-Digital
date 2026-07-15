/**
 * Vacía la base y crea solo el super-admin (platform_admin).
 * No crea tenant demo, menú, mesas ni staff.
 *
 * Uso (desde la raíz del monorepo o apps/api):
 *   CONFIRM=WIPE npm run seed:platform
 *
 * Credenciales por defecto (sobreescribibles con env):
 *   PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import mongoose from 'mongoose';
import { AuthService } from '../modules/auth/auth.service.js';
import { User } from '../modules/auth/user.model.js';

const PLATFORM_ADMIN = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@saas-base.com',
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? 'platform123',
  name: 'Super Admin Plataforma',
};

async function wipeDatabase(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Sin conexión a MongoDB');
  }

  const collections = await db.listCollections().toArray();
  console.log(`[Seed platform] Colecciones a vaciar: ${collections.length}`);

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const result = await db.collection(name).deleteMany({});
    console.log(`  - ${name}: ${result.deletedCount} docs eliminados`);
  }
}

async function seedPlatformAdmin(): Promise<void> {
  const passwordHash = await AuthService.hashPassword(PLATFORM_ADMIN.password);
  await User.create({
    tenantId: null,
    email: PLATFORM_ADMIN.email,
    passwordHash,
    role: 'platform_admin',
    name: PLATFORM_ADMIN.name,
    phone: '',
    isActive: true,
  });
  console.log(`[Seed platform] Super-admin creado: ${PLATFORM_ADMIN.email}`);
}

async function main(): Promise<void> {
  if (process.env.CONFIRM !== 'WIPE') {
    console.error(
      '[Seed platform] Abortado: esto BORRA todos los datos de la DB.\n' +
        '  PowerShell: $env:CONFIRM=\"WIPE\"; npm run seed:platform\n' +
        '  Bash:       CONFIRM=WIPE npm run seed:platform'
    );
    process.exit(1);
  }

  await connectDatabase();
  console.log('[Seed platform] Vaciar base…');
  await wipeDatabase();
  await seedPlatformAdmin();

  console.log('\n[Seed platform] Listo. Base en cero + platform_admin.');
  console.log(`  Login: ${PLATFORM_ADMIN.email} / ${PLATFORM_ADMIN.password}`);
  console.log('  Ruta:  /platform/login');
  console.log('  Siguiente: onboarding por UI (sin tenant demo).\n');

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('[Seed platform] Error:', err);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
