import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DeliveryIntent, SupportedLang, VoucherValidationResult } from '@bistro/shared-types';
import { env, type AiProviderName } from '../config/env.js';
import type { IMenuItem } from '../modules/menu/menu-item.model.js';
import { localize } from '../utils/locale.js';
import type { ConversationMessage } from '../modules/delivery/delivery-session.model.js';

let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!env.openaiApiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openaiClient;
}

function getGemini(): GoogleGenerativeAI | null {
  if (!env.geminiApiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.geminiApiKey);
  }
  return geminiClient;
}

function resolveProvider(): AiProviderName | null {
  return env.activeAiProvider;
}

async function completeJsonWithOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: ConversationMessage[]
): Promise<string | null> {
  const client = getOpenAI();
  if (!client) return null;

  const response = await client.chat.completions.create({
    model: env.deliveryAiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? null;
}

/** Gemini exige que el historial empiece con un mensaje user, no model. */
export function normalizeGeminiHistory(history: ConversationMessage[]): ConversationMessage[] {
  let trimmed = history.slice(-12);
  while (trimmed.length > 0 && trimmed[0]?.role === 'assistant') {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

async function completeJsonWithGemini(
  systemPrompt: string,
  userMessage: string,
  history: ConversationMessage[]
): Promise<string | null> {
  const client = getGemini();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: env.deliveryAiModel,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const chat = model.startChat({
    history: normalizeGeminiHistory(history).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text() || null;
}

async function completeVisionJsonWithOpenAI(
  imageUrl: string,
  textPrompt: string
): Promise<string | null> {
  const client = getOpenAI();
  if (!client) return null;

  const response = await client.chat.completions.create({
    model: env.deliveryAiModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: textPrompt },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content ?? null;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status})`);
  }
  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  return { data: buffer.toString('base64'), mimeType };
}

async function completeVisionJsonWithGemini(
  imageUrl: string,
  textPrompt: string
): Promise<string | null> {
  const client = getGemini();
  if (!client) return null;

  const { data, mimeType } = await fetchImageAsBase64(imageUrl);
  const model = client.getGenerativeModel({
    model: env.deliveryAiModel,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 500,
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType, data } },
    { text: textPrompt },
  ]);

  return result.response.text() || null;
}

function fallbackIntent(
  message: string,
  menuItems: IMenuItem[],
  lang: SupportedLang,
  tenantName: string
): DeliveryIntent {
  const lower = message.toLowerCase();
  const items: DeliveryIntent['items'] = [];

  for (const item of menuItems) {
    const name = localize(item.name, lang).toLowerCase();
    if (lower.includes(name)) {
      const qtyMatch = lower.match(new RegExp(`(\\d+)\\s*${name.split(' ')[0]}`));
      items.push({
        menuItemId: item._id.toString(),
        quantity: qtyMatch ? parseInt(qtyMatch[1], 10) : 1,
        modifiers: [],
        notes: '',
      });
    }
  }

  const addressMatch = message.match(
    /(?:direcci[oó]n|vivo en|env[ií]o a|entregar en)\s*[:\-]?\s*(.+)/i
  );
  const address = addressMatch?.[1]?.trim() ?? null;

  if (lower.includes('cancel')) {
    return {
      intent: 'cancel',
      items: [],
      customerInfo: { name: null, address: null, phone: null },
      clarificationNeeded: false,
      clarificationQuestion: null,
      responseToCustomer: 'Entendido, cancelamos tu pedido. ¡Hasta pronto!',
    };
  }

  if (lower.includes('estado') || lower.includes('pedido')) {
    return {
      intent: 'check_status',
      items: [],
      customerInfo: { name: null, address: null, phone: null },
      clarificationNeeded: false,
      clarificationQuestion: null,
      responseToCustomer: 'Te cuento el estado de tu pedido en un momento.',
    };
  }

  if (lower.includes('confirm') || lower.includes('sí') || lower.includes('si ')) {
    return {
      intent: 'new_order',
      items,
      customerInfo: { name: null, address, phone: null },
      clarificationNeeded: false,
      clarificationQuestion: null,
      responseToCustomer: '¡Perfecto! Confirmamos tu pedido.',
    };
  }

  if (items.length > 0) {
    return {
      intent: 'new_order',
      items,
      customerInfo: { name: null, address, phone: null },
      clarificationNeeded: !address,
      clarificationQuestion: address
        ? null
        : '¿A qué dirección enviamos tu pedido?',
      responseToCustomer: address
        ? `Anoté tu pedido en ${tenantName}. ¿Confirmás?`
        : `Anoté: ${items.map((i) => `${i.quantity}x ítem`).join(', ')}. ¿Cuál es tu dirección?`,
    };
  }

  return {
    intent: 'other',
    items: [],
    customerInfo: { name: null, address, phone: null },
    clarificationNeeded: true,
    clarificationQuestion: '¿Qué te gustaría pedir del menú?',
    responseToCustomer: `¡Hola! Soy el asistente de ${tenantName}. Decime qué querés pedir y tu dirección de entrega.`,
  };
}

const DELIVERY_INTENT_PROMPT = (tenantName: string, menuSummary: string) => `
Eres un asistente de pedidos para el restaurante "${tenantName}".
Extrae la intención del cliente en formato JSON estricto.
Menú: ${menuSummary}

Responde SOLO con JSON válido:
{
  "intent": "new_order" | "add_item" | "remove_item" | "modify_order" | "check_status" | "cancel" | "confirm_payment" | "other",
  "items": [{ "menuItemId": string, "quantity": number, "modifiers": string[], "notes": string }],
  "customerInfo": { "name": string | null, "address": string | null, "phone": string | null },
  "clarificationNeeded": boolean,
  "clarificationQuestion": string | null,
  "responseToCustomer": string
}
`.trim();

const VOUCHER_PROMPT = (expectedAmount: number, tenantCbu: string) => `
Analiza este comprobante de transferencia bancaria.
Verifica:
1. Monto ~$${expectedAmount} (±5%)
2. CBU/CVU/alias destino: ${tenantCbu || 'no configurado'}
3. Fecha hoy o ayer
4. Autenticidad

JSON:
{
  "isValid": boolean,
  "detectedAmount": number | null,
  "amountMatches": boolean,
  "destinationMatches": boolean,
  "dateIsRecent": boolean,
  "suspectedFraud": boolean,
  "confidence": "high" | "medium" | "low",
  "notes": string
}
`.trim();

export class AiService {
  static getActiveProvider(): AiProviderName | null {
    return resolveProvider();
  }

  static isConfigured(): boolean {
    return env.isAiConfigured;
  }

  static async extractDeliveryIntent(
    message: string,
    menuItems: IMenuItem[],
    conversationHistory: ConversationMessage[],
    tenantName: string,
    lang: SupportedLang = 'es'
  ): Promise<DeliveryIntent> {
    const provider = resolveProvider();
    if (!provider) {
      return fallbackIntent(message, menuItems, lang, tenantName);
    }

    const menuSummary = JSON.stringify(
      menuItems.map((i) => ({
        id: i._id.toString(),
        name: localize(i.name, lang),
        price: i.basePrice,
      }))
    );

    const systemPrompt = DELIVERY_INTENT_PROMPT(tenantName, menuSummary);

    const content =
      provider === 'gemini'
        ? await completeJsonWithGemini(systemPrompt, message, conversationHistory)
        : await completeJsonWithOpenAI(systemPrompt, message, conversationHistory);

    if (!content) {
      return fallbackIntent(message, menuItems, lang, tenantName);
    }

    try {
      return JSON.parse(content) as DeliveryIntent;
    } catch {
      return fallbackIntent(message, menuItems, lang, tenantName);
    }
  }

  static async validateTransferVoucher(
    imageUrl: string,
    expectedAmount: number,
    tenantCbu: string
  ): Promise<VoucherValidationResult> {
    const provider = resolveProvider();
    if (!provider) {
      return {
        isValid: false,
        detectedAmount: null,
        amountMatches: false,
        destinationMatches: false,
        dateIsRecent: false,
        suspectedFraud: false,
        confidence: 'low',
        notes: 'Validación automática no disponible (sin GEMINI_API_KEY ni OPENAI_API_KEY). Revisión manual requerida.',
      };
    }

    const textPrompt = VOUCHER_PROMPT(expectedAmount, tenantCbu);

    let content: string | null;
    try {
      content =
        provider === 'gemini'
          ? await completeVisionJsonWithGemini(imageUrl, textPrompt)
          : await completeVisionJsonWithOpenAI(imageUrl, textPrompt);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return {
        isValid: false,
        detectedAmount: null,
        amountMatches: false,
        destinationMatches: false,
        dateIsRecent: false,
        suspectedFraud: true,
        confidence: 'low',
        notes: `Error al analizar imagen: ${detail}`,
      };
    }

    if (!content) {
      return {
        isValid: false,
        detectedAmount: null,
        amountMatches: false,
        destinationMatches: false,
        dateIsRecent: false,
        suspectedFraud: true,
        confidence: 'low',
        notes: 'No se pudo analizar la imagen',
      };
    }

    const result = JSON.parse(content) as VoucherValidationResult;
    if (result.confidence === 'high' && result.isValid && !result.suspectedFraud) {
      result.autoApproved = true;
    }
    return result;
  }
}
