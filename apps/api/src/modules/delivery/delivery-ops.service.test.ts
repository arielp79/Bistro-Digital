import { describe, it, expect } from 'vitest';
import { computeLatencyStats, jobDurationMs } from './delivery-ops.service.js';

describe('DeliveryOpsService helpers', () => {
  it('calcula duración de job BullMQ', () => {
    expect(jobDurationMs({ processedOn: 1000, finishedOn: 2500 })).toBe(1500);
    expect(jobDurationMs({ processedOn: undefined, finishedOn: 2500 })).toBeNull();
  });

  it('calcula promedio y p95 de latencia', () => {
    const stats = computeLatencyStats([100, 200, 300, 400, 5000]);
    expect(stats.sampleSize).toBe(5);
    expect(stats.avg).toBe(1200);
    expect(stats.p95).toBe(5000);
  });

  it('devuelve null sin muestras', () => {
    const stats = computeLatencyStats([]);
    expect(stats.avg).toBeNull();
    expect(stats.p95).toBeNull();
    expect(stats.sampleSize).toBe(0);
  });
});
