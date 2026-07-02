import { getDemoContext } from './helpers/api';

async function assertApiHealth() {
  const healthRes = await fetch('http://localhost:3000/health').catch(() => null);
  if (!healthRes?.ok) {
    throw new Error(
      [
        'La API no respondió en :3000.',
        'Verificá MONGODB_URI en apps/api/.env y la whitelist de IP en MongoDB Atlas.',
        'Diagnóstico: npm run test:preflight',
      ].join('\n')
    );
  }
}

export default async function globalSetup() {
  await assertApiHealth();

  try {
    await getDemoContext();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        'Datos demo no disponibles para E2E.',
        'Ejecutá: npm run test:preflight && npm run seed',
        detail,
      ].join('\n')
    );
  }
}
