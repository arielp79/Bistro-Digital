import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI no definida. Configurá apps/api/.env (ver .env.example).');
  process.exit(1);
}

await mongoose.connect(uri);
console.log('Connected to:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

const collections = await mongoose.connection.db.listCollections().toArray();
console.log('Collections:', collections.map((c) => c.name).join(', '));

const orders = await mongoose.connection.db
  .collection('orders')
  .find({})
  .project({ orderNumber: 1, tenantId: 1, status: 1, payment: 1, deletedAt: 1 })
  .toArray();

const tenants = await mongoose.connection.db
  .collection('tenants')
  .find({})
  .project({ slug: 1 })
  .toArray();

const slugById = new Map(tenants.map((t) => [t._id.toString(), t.slug]));

console.log('=== Pedidos en MongoDB ===');
for (const o of orders) {
  const hiddenMp =
    o.payment?.method === 'mercadopago' && o.payment?.status !== 'verified';
  const active = ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status);
  console.log(
    JSON.stringify({
      orderNumber: o.orderNumber,
      tenant: slugById.get(o.tenantId?.toString()) ?? o.tenantId?.toString(),
      status: o.status,
      payment: o.payment,
      deletedAt: o.deletedAt ?? null,
      visibleInKitchen: active && !hiddenMp,
    })
  );
}
console.log('Total:', orders.length);

await mongoose.disconnect();
