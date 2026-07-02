import dotenv from 'dotenv';

dotenv.config();

export type AiProviderName = 'openai' | 'gemini';
export type AiProviderPreference = 'auto' | AiProviderName;

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
}

function resolveActiveAiProvider(): AiProviderName | null {
  const preference = (process.env.AI_PROVIDER ?? 'auto').toLowerCase() as AiProviderPreference;
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasGemini = Boolean(
    (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY)?.trim()
  );

  if (preference === 'gemini') return hasGemini ? 'gemini' : null;
  if (preference === 'openai') return hasOpenAi ? 'openai' : null;
  if (hasGemini) return 'gemini';
  if (hasOpenAi) return 'openai';
  return null;
}

function resolveDeliveryAiModel(provider: AiProviderName | null): string {
  const explicit = process.env.DELIVERY_AI_MODEL?.trim();
  if (explicit) return explicit;
  if (provider === 'gemini') {
    return process.env.DELIVERY_AI_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  }
  return process.env.DELIVERY_AI_OPENAI_MODEL?.trim() || 'gpt-4o';
}

const activeAiProvider = resolveActiveAiProvider();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: requireEnv('MONGODB_URI'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: requireEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production-32chars'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  encryptionKey: requireEnv(
    'ENCRYPTION_KEY',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '',
  aiProviderPreference: (process.env.AI_PROVIDER ?? 'auto') as AiProviderPreference,
  activeAiProvider,
  isAiConfigured: activeAiProvider !== null,
  deliveryAiModel: resolveDeliveryAiModel(activeAiProvider),
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'bistro-dev-verify',
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? '',
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  apiPublicUrl: process.env.API_PUBLIC_URL ?? process.env.API_URL ?? 'http://localhost:3000',
  mercadopagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '',
  mercadopagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
  onboardingEnabled: process.env.ONBOARDING_ENABLED !== 'false',
  onboardingWelcomeEmail: process.env.ONBOARDING_WELCOME_EMAIL !== 'false',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'onboarding@bistro-digital.app',
  skipDeliveryWorker:
    process.env.SKIP_DELIVERY_WORKER === '1' || process.env.SKIP_DELIVERY_WORKER === 'true',
  apiDocsEnabled: process.env.API_DOCS_ENABLED !== 'false',
  platformBaseDomain: process.env.PLATFORM_BASE_DOMAIN ?? 'saas-base.com',
  clientBaseUrl: process.env.CLIENT_BASE_URL ?? 'http://localhost:5173',
  platformCnameTarget: process.env.PLATFORM_CNAME_TARGET ?? 'proxy.saas-base.com',
};
