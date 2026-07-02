const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'BistroDigital/1.0 (restaurant-saas-demo)';

export interface GeocodedCoords {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodedCoords | null> {
  const query = address.trim();
  if (query.length < 5) return null;

  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '1',
    countrycodes: 'ar',
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const hit = data[0];
    if (!hit) return null;

    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name,
    };
  } catch {
    return null;
  }
}
