import { describe, it, expect } from 'vitest';
import { skipIfNoDb } from '../../test/integration-setup.js';
import { OnboardingService } from './onboarding.service.js';

describe('OnboardingService.isSlugAvailable (integración)', () => {
  it('rechaza slugs reservados', async (ctx) => {
    skipIfNoDb(ctx);
    const result = await OnboardingService.isSlugAvailable('admin');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/reservado/i);
  });

  it('rechaza slugs demasiado cortos', async (ctx) => {
    skipIfNoDb(ctx);
    const result = await OnboardingService.isSlugAvailable('ab');
    expect(result.available).toBe(false);
  });

  it('bistro-digital no está disponible (tenant demo)', async (ctx) => {
    skipIfNoDb(ctx);
    const result = await OnboardingService.isSlugAvailable('bistro-digital');
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/uso/i);
  });
});
