import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from './email.service.js';

describe('EmailService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('envía en modo console cuando no hay Resend', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await EmailService.sendWelcomeOnboarding({
      to: 'admin@test.com',
      adminName: 'Juan',
      restaurantName: 'Test Resto',
      slug: 'test-resto',
      plan: 'starter',
      adminUrl: 'http://localhost:3001/',
      menuUrl: 'http://localhost:5173/menu?tenant=test-resto',
    });

    expect(result.mode).toBe('console');
    expect(result.sent).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });
});
