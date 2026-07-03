/**
 * Piloto AFIP homologacion: carga certificados, prueba conexion y emite factura B.
 *
 * Requiere en apps/api/.env (o variables de entorno):
 *   AFIP_HOMOLOG_CUIT=20123456789
 *   AFIP_HOMOLOG_CERT_PATH=ruta/al/certificado.crt
 *   AFIP_HOMOLOG_KEY_PATH=ruta/a/clave.key
 *   AFIP_HOMOLOG_POINT_OF_SALE=1   (opcional, default 1)
 *
 * Uso: npm run afip:homologacion
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const API = process.env.API_URL ?? 'http://localhost:3000';
const TENANT = process.env.AFIP_TENANT_SLUG ?? 'bistro-digital';
const ADMIN_EMAIL = process.env.AFIP_ADMIN_EMAIL ?? 'admin@bistro-digital.app';
const ADMIN_PASSWORD = process.env.AFIP_ADMIN_PASSWORD ?? 'admin123';

function fail(msg) {
  console.error(`[afip:homologacion] ${msg}`);
  process.exit(1);
}

function readPem(envKey, pathKey) {
  const inline = process.env[envKey]?.trim();
  if (inline) return inline;
  const filePath = process.env[pathKey]?.trim();
  if (!filePath) return null;
  const abs = resolve(filePath);
  if (!existsSync(abs)) fail(`No existe archivo: ${abs}`);
  return readFileSync(abs, 'utf8');
}

async function api(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('');
  console.log('=== AFIP homologacion — Bistro Digital ===');
  console.log('');

  const cuit = process.env.AFIP_HOMOLOG_CUIT?.trim();
  const certificate = readPem('AFIP_HOMOLOG_CERT', 'AFIP_HOMOLOG_CERT_PATH');
  const privateKey = readPem('AFIP_HOMOLOG_KEY', 'AFIP_HOMOLOG_KEY_PATH');
  const pointOfSale = Number(process.env.AFIP_HOMOLOG_POINT_OF_SALE ?? 1) || 1;

  if (!cuit || !certificate || !privateKey) {
    console.log('Faltan credenciales de homologacion AFIP.');
    console.log('');
    console.log('1. En AFIP (https://www.afip.gob.ar/ws/) con el CUIT del restaurante:');
    console.log('   - Habilitar Web Services de Facturacion Electronica');
    console.log('   - Crear punto de venta electronico');
    console.log('   - Generar certificado de HOMOLOGACION (.crt + .key PEM)');
    console.log('');
    console.log('2. En apps/api/.env agrega:');
    console.log('   AFIP_HOMOLOG_CUIT=20XXXXXXXXX');
    console.log('   AFIP_HOMOLOG_CERT_PATH=C:\\ruta\\certificado_homologacion.crt');
    console.log('   AFIP_HOMOLOG_KEY_PATH=C:\\ruta\\clave_homologacion.key');
    console.log('   AFIP_HOMOLOG_POINT_OF_SALE=1');
    console.log('');
    console.log('   O usa la UI: http://localhost:3001/connect-afip');
    console.log('');
    fail('Configura certificados y vuelve a ejecutar npm run afip:homologacion');
  }

  try {
    const health = await fetch(`${API}/health`);
    if (!health.ok) fail(`API no responde en ${API} — ejecuta npm run dev:api`);
  } catch {
    fail(`API no responde en ${API} — ejecuta npm run dev:api`);
  }

  console.log(`Tenant: ${TENANT}`);
  console.log(`CUIT: ${cuit} · PV: ${pointOfSale}`);
  console.log('');

  const login = await api('POST', '/api/v1/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = login.json?.data?.tokens?.accessToken;
  if (!token) fail(`Login fallo: ${login.json?.error ?? login.status}`);

  console.log('[1/4] Guardando certificados en tenant...');
  const patch = await api(
    'PATCH',
    '/api/v1/tenant/config',
    {
      afip: {
        enabled: true,
        cuit,
        pointOfSale,
        certificate,
        privateKey,
      },
    },
    token
  );
  if (patch.status !== 200 || patch.json?.error) {
    fail(`No se guardo config AFIP: ${patch.json?.error ?? patch.status}`);
  }
  console.log('      OK');

  console.log('[2/4] Probando conexion AFIP homologacion...');
  const test = await api('POST', '/api/v1/billing/afip/test', {}, token);
  if (test.status !== 200 || !test.json?.data?.ok) {
    fail(`Test AFIP fallo: ${test.json?.error ?? JSON.stringify(test.json)}`);
  }
  console.log(`      ${test.json.data.message}`);
  console.log(`      Ultimo comprobante B: ${test.json.data.lastVoucherB}`);

  console.log('[3/4] Buscando pedido entregado/pagado sin facturar...');
  const ordersRes = await api('GET', '/api/v1/billing/orders', null, token);
  const orders = ordersRes.json?.data ?? [];
  const target = orders.find((o) => !o.billing && ['paid', 'delivered'].includes(o.status));

  let orderId = target?.id;
  if (!orderId) {
    console.log('      No hay pedidos listos — creando pedido de prueba...');
    const menu = await api('GET', '/api/v1/menu', null, token);
    const item = menu.json?.data?.categories?.flatMap((c) => c.items)?.[0];
    const tables = await api('GET', '/api/v1/tables', null, token);
    const table = tables.json?.data?.[0];
    if (!item?.id || !table?.id) fail('Datos demo incompletos — ejecuta npm run seed');

    const created = await api(
      'POST',
      '/api/v1/orders',
      {
        type: 'dine-in',
        source: 'manual',
        tableId: table.id,
        paymentMethod: 'cash',
        tip: 0,
        items: [{ menuItemId: item.id, quantity: 1, selectedModifiers: [] }],
      },
      token
    );
    orderId = created.json?.data?.id;
    if (!orderId) fail(`No se creo pedido: ${created.json?.error}`);

    await api('PATCH', `/api/v1/orders/${orderId}/status`, { status: 'delivered' }, token);
    console.log(`      Pedido ${created.json.data.orderNumber} marcado como entregado`);
  } else {
    console.log(`      Usando pedido ${target.orderNumber}`);
  }

  console.log('[4/4] Emitiendo factura B en homologacion...');
  const invoice = await api(
    'POST',
    `/api/v1/billing/${orderId}/invoice`,
    { invoiceType: 'B' },
    token
  );
  if (invoice.status !== 201 || invoice.json?.error) {
    fail(`Emision fallo: ${invoice.json?.error ?? invoice.status}`);
  }

  const inv = invoice.json.data;
  console.log('');
  console.log('=== Homologacion OK ===');
  console.log(`Pedido:     ${inv.orderNumber}`);
  console.log(`Factura:    ${inv.invoiceType} PV ${inv.pointOfSale}-${inv.voucherNumber}`);
  console.log(`CAE:        ${inv.cae}`);
  console.log(`Vence:      ${inv.caeExpiry}`);
  console.log(`Modo:       ${inv.mode}`);
  console.log(`PDF:        ${API}${inv.pdfUrl}`);
  console.log('');
  console.log('Ver en panel: http://localhost:3001/billing');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
