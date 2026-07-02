import { describe, it, expect } from 'vitest';
import {
  defaultTenantDomain,
  extractSlugFromHostname,
  isDefaultTenantDomain,
  isValidCustomDomain,
  normalizeDomain,
  normalizeHost,
} from './tenant-host.js';

describe('tenant-host', () => {
  it('normaliza dominios con protocolo y puerto', () => {
    expect(normalizeDomain('HTTPS://Menu.Parrilla.COM:443/path')).toBe('menu.parrilla.com');
    expect(normalizeHost('localhost:5173')).toBe('localhost');
  });

  it('extrae slug desde subdominio de plataforma', () => {
    expect(extractSlugFromHostname('bistro-digital.saas-base.com')).toBe('bistro-digital');
    expect(extractSlugFromHostname('www.saas-base.com')).toBeNull();
    expect(extractSlugFromHostname('localhost')).toBeNull();
  });

  it('extrae slug desde dominio .local en dev', () => {
    expect(extractSlugFromHostname('bistro-digital.local')).toBe('bistro-digital');
  });

  it('valida dominios custom', () => {
    expect(isValidCustomDomain('menu.parrilla.com')).toBe(true);
    expect(isValidCustomDomain('localhost')).toBe(false);
    expect(isValidCustomDomain('192.168.1.1')).toBe(false);
  });

  it('detecta dominio por defecto del tenant', () => {
    expect(isDefaultTenantDomain('bistro-digital.local', 'bistro-digital')).toBe(true);
    expect(isDefaultTenantDomain('menu.parrilla.com', 'bistro-digital')).toBe(false);
    expect(defaultTenantDomain('bistro-digital')).toMatch(/bistro-digital\./);
  });
});
