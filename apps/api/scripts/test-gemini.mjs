import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
const modelName =
  process.env.DELIVERY_AI_GEMINI_MODEL?.trim() ||
  process.env.DELIVERY_AI_MODEL?.trim() ||
  'gemini-2.5-flash';

if (!apiKey.trim()) {
  console.error('[gemini:test] GEMINI_API_KEY no definida en apps/api/.env');
  process.exit(1);
}

const { GoogleGenerativeAI } = await import('@google/generative-ai');
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

try {
  const result = await model.generateContent('Respondé solo con JSON: {"ok":true}');
  const text = result.response.text();
  if (!text.includes('ok')) {
    console.warn('[gemini:test] Respuesta inesperada:', text.slice(0, 120));
  }
  console.log(`[gemini:test] Conexión OK — modelo ${modelName}`);
  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[gemini:test] Error al conectar con Gemini:');
  console.error(`  ${message}`);
  process.exit(1);
}
