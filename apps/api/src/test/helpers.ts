import type { Express } from 'express';
import request from 'supertest';

export const DEMO_TENANT = 'bistro-digital';

export async function loginStaff(
  app: Express,
  email: string,
  password: string,
  tenantSlug = DEMO_TENANT
): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant-ID', tenantSlug)
    .send({ email, password });

  if (res.status !== 200 || res.body.error) {
    throw new Error(res.body.error ?? `Login falló (${res.status})`);
  }

  return res.body.data.tokens.accessToken as string;
}

export async function getDemoContext(app: Express) {
  const token = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

  const [menuRes, tablesRes] = await Promise.all([
    request(app).get('/api/v1/menu').set('X-Tenant-ID', DEMO_TENANT),
    request(app).get('/api/v1/tables').set('X-Tenant-ID', DEMO_TENANT).set('Authorization', `Bearer ${token}`),
  ]);

  const categories = menuRes.body.data?.categories ?? [];
  const menuItem = categories.flatMap((c: { items: unknown[] }) => c.items)[0] as
    | { id: string; name: string }
    | undefined;
  const table = tablesRes.body.data?.[0];

  if (!menuItem?.id || !table?.id) {
    throw new Error('Seed demo incompleto: ejecutá npm run seed');
  }

  return {
    token,
    tableId: table.id as string,
    menuItemId: menuItem.id as string,
    menuItemName: menuItem.name as string,
  };
}
