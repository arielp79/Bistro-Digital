import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocodeAddress } from '../services/geocoder.service.js';

describe('geocoder.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve null para direcciones muy cortas', async () => {
    await expect(geocodeAddress('abc')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('parsea respuesta de Nominatim', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: '-34.6037', lon: '-58.3816', display_name: 'Buenos Aires, Argentina' },
      ],
    } as Response);

    const result = await geocodeAddress('Av. Corrientes 1234, CABA');
    expect(result).toEqual({
      lat: -34.6037,
      lng: -58.3816,
      displayName: 'Buenos Aires, Argentina',
    });
  });

  it('devuelve null si Nominatim no encuentra resultados', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await expect(geocodeAddress('Calle inexistente 99999')).resolves.toBeNull();
  });
});
