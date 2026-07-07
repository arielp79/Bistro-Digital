import { describe, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import type { IMenuItem } from '../modules/menu/menu-item.model.js';

vi.mock('../config/env.js', () => ({
  env: {
    openaiApiKey: '',
    geminiApiKey: '',
    activeAiProvider: null,
    isAiConfigured: false,
    deliveryAiModel: 'gpt-4o',
    aiProviderPreference: 'auto',
  },
}));

import { AiService, normalizeGeminiHistory } from '../services/ai.service.js';

const menuItems: IMenuItem[] = [
  {
    _id: new Types.ObjectId(),
    tenantId: new Types.ObjectId(),
    categoryId: new Types.ObjectId(),
    sku: 'EMP-001',
    name: { es: 'Empanadas de carne', en: 'Beef empanadas', pt: 'Empanadas' },
    description: { es: '', en: '', pt: '' },
    imageUrl: '',
    basePrice: 5200,
    isAvailable: true,
    tags: [],
    preparationTimeMinutes: 15,
    modifierGroups: [],
    sortOrder: 1,
  } as IMenuItem,
];

describe('AiService fallback (sin proveedor IA)', () => {
  it('reporta sin proveedor cuando no hay keys', () => {
    expect(AiService.getActiveProvider()).toBeNull();
    expect(AiService.isConfigured()).toBe(false);
  });

  it('detecta intención de cancelar', async () => {
    const intent = await AiService.extractDeliveryIntent(
      'quiero cancelar el pedido',
      menuItems,
      [],
      'Bistró Digital',
      'es'
    );
    expect(intent.intent).toBe('cancel');
  });

  it('detecta ítems del menú en el mensaje', async () => {
    const intent = await AiService.extractDeliveryIntent(
      '2 empanadas de carne por favor',
      menuItems,
      [],
      'Bistró Digital',
      'es'
    );
    expect(intent.intent).toBe('new_order');
    expect(intent.items.length).toBeGreaterThan(0);
    expect(intent.items[0]?.menuItemId).toBe(menuItems[0]!._id.toString());
  });

  it('normalizeGeminiHistory elimina mensajes model al inicio', () => {
    const normalized = normalizeGeminiHistory([
      { role: 'assistant', content: 'Hola', timestamp: new Date() },
      { role: 'user', content: 'Quiero pedir', timestamp: new Date() },
      { role: 'assistant', content: '¿Qué?', timestamp: new Date() },
    ]);
    expect(normalized[0]?.role).toBe('user');
    expect(normalized).toHaveLength(2);
  });
});
