import { describe, it, expect } from 'vitest';
import { OnboardingService } from './onboarding.service.js';

describe('OnboardingService.normalizeSlug', () => {
  it('convierte nombre a slug kebab-case', () => {
    expect(OnboardingService.normalizeSlug('Parrilla Del Sur')).toBe('parrilla-del-sur');
    expect(OnboardingService.normalizeSlug('  Sushi   Norte  ')).toBe('sushi-norte');
  });

  it('elimina caracteres especiales', () => {
    expect(OnboardingService.normalizeSlug('Café & Bar!')).toBe('cafe-bar');
  });
});
