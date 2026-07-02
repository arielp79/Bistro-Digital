const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
export const DEMO_TENANT = 'bistro-digital';

export async function getDemoContext() {
  const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': DEMO_TENANT,
    },
    body: JSON.stringify({
      email: 'admin@bistro-digital.app',
      password: 'admin123',
    }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok || loginJson.error) {
    throw new Error(loginJson.error ?? 'Login admin falló — ¿corrió npm run seed?');
  }

  const token = loginJson.data.tokens.accessToken as string;

  const [menuRes, tablesRes] = await Promise.all([
    fetch(`${API_URL}/api/v1/menu`, { headers: { 'X-Tenant-ID': DEMO_TENANT } }),
    fetch(`${API_URL}/api/v1/tables`, {
      headers: { 'X-Tenant-ID': DEMO_TENANT, Authorization: `Bearer ${token}` },
    }),
  ]);

  const menuJson = await menuRes.json();
  const tablesJson = await tablesRes.json();

  const categories = menuJson.data?.categories ?? [];
  const menuItem = categories.flatMap((c: { items: Array<{ id: string; name: string }> }) => c.items)[0];
  const table = tablesJson.data?.[0];

  if (!menuItem?.id || !table?.id) {
    throw new Error('Datos demo incompletos — ejecutá npm run seed');
  }

  return { tableId: table.id as string, menuItemName: menuItem.name as string };
}
