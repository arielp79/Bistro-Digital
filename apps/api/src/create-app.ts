import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { captureRawBody } from './middlewares/webhook.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import tableRoutes from './modules/tables/table.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import deliveryRoutes from './modules/delivery/delivery.routes.js';
import webhookRoutes from './modules/delivery/webhooks/webhook.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import onboardingRoutes from './modules/onboarding/onboarding.routes.js';
import platformRoutes from './modules/platform/platform.routes.js';
import { setupApiDocs } from './openapi/setup-docs.js';

export function createApp() {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'bistro-api', timestamp: new Date().toISOString() });
  });

  setupApiDocs(app);

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb', verify: captureRawBody }));
  app.use(cookieParser());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/tenant', tenantRoutes);
  app.use('/api/v1/menu', menuRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/tables', tableRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/stock', stockRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/delivery', deliveryRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/onboarding', onboardingRoutes);
  app.use('/api/v1/platform', platformRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);

  app.use(errorHandler);

  return app;
}
