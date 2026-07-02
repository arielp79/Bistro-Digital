import { createServer } from 'http';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { createApp } from './create-app.js';
import { setupSocket } from './services/socket.service.js';
import { startDeliveryWorker } from './workers/delivery.worker.js';

const app = createApp();
const server = createServer(app);

async function bootstrap(): Promise<void> {
  await connectDatabase();
  setupSocket(server);
  if (env.skipDeliveryWorker) {
    console.log('[API] Delivery worker omitido (SKIP_DELIVERY_WORKER)');
  } else {
    startDeliveryWorker();
  }

  server.listen(env.port, () => {
    console.log(`[API] Servidor en http://localhost:${env.port}`);
    console.log(`[API] Health: http://localhost:${env.port}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('[API] Error al iniciar:', err);
  process.exit(1);
});

export default app;
export { createApp };
