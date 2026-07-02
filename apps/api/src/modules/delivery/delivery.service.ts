import type { ShippingCalculation } from '@bistro/shared-types';
import { geocodeAddress } from '../../services/geocoder.service.js';
import type { ITenant } from '../tenant/tenant.model.js';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estima coords a partir de dirección (demo sin geocoder externo). */
export function estimateCoordsFromAddress(address: string, base: { lat: number; lng: number }): {
  lat: number;
  lng: number;
} {
  const hash = address
    .toLowerCase()
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const offsetKm = (hash % 50) / 10;
  const angle = (hash % 360) * (Math.PI / 180);
  const latOffset = (offsetKm / 111) * Math.cos(angle);
  const lngOffset = (offsetKm / (111 * Math.cos(toRad(base.lat)))) * Math.sin(angle);
  return { lat: base.lat + latOffset, lng: base.lng + lngOffset };
}

export class DeliveryService {
  static async calculateShipping(
    tenant: ITenant,
    customerAddress: string,
    customerCoords?: { lat: number; lng: number } | null
  ): Promise<ShippingCalculation> {
    const restaurant = tenant.config.location ?? { lat: -34.6037, lng: -58.3816, address: '' };

    let coords = customerCoords ?? null;
    let calculationMethod: ShippingCalculation['calculationMethod'] = 'haversine';

    if (!coords) {
      const geocoded = await geocodeAddress(customerAddress);
      if (geocoded) {
        coords = { lat: geocoded.lat, lng: geocoded.lng };
        calculationMethod = 'google_maps';
      } else {
        coords = estimateCoordsFromAddress(customerAddress, restaurant);
      }
    }

    const distanceKm = haversineKm(restaurant, coords);

    const zones = [...(tenant.config.deliveryZones ?? [])].sort(
      (a, b) => a.maxKm - b.maxKm
    );
    const zone = zones.find((z) => distanceKm <= z.maxKm);
    const outOfZoneFee = tenant.config.deliveryFeeOutOfZone;
    const fee = zone?.fee ?? (outOfZoneFee != null ? outOfZoneFee : null);

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      fee,
      estimatedMinutes: Math.round(15 + distanceKm * 4),
      isDeliverable: fee !== null,
      calculationMethod,
    };
  }

  static formatOrderSummary(
    items: Array<{ name: string; quantity: number; unitPrice: number }>,
    subtotal: number,
    deliveryFee: number,
    currency: string
  ): string {
    const lines = items.map(
      (i) => `• ${i.quantity}x ${i.name} — $${(i.unitPrice * i.quantity).toLocaleString('es-AR')}`
    );
    const total = subtotal + deliveryFee;
    return [
      ...lines,
      '',
      `Subtotal: $${subtotal.toLocaleString('es-AR')} ${currency}`,
      `Envío: $${deliveryFee.toLocaleString('es-AR')} ${currency}`,
      `*Total: $${total.toLocaleString('es-AR')} ${currency}*`,
    ].join('\n');
  }
}
