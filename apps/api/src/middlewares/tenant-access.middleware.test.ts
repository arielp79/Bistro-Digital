import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireTenantMatch } from './tenant-access.middleware.js';
import { AppError } from '../utils/api-response.js';

function mockReq(partial: Partial<Request>): Request {
  return partial as Request;
}

describe('requireTenantMatch', () => {
  it('pasa si no hay usuario autenticado', () => {
    const next = vi.fn();
    requireTenantMatch(mockReq({ tenant: { _id: { toString: () => 't1' } } } as Request), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('pasa si tenant del JWT coincide con X-Tenant-ID', () => {
    const next = vi.fn();
    requireTenantMatch(
      mockReq({
        user: { tenantId: 'abc123' },
        tenant: { _id: { toString: () => 'abc123' } },
      } as Request),
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rechaza con 403 si el tenant no coincide', () => {
    const next = vi.fn();
    requireTenantMatch(
      mockReq({
        user: { tenantId: 'otro-tenant' },
        tenant: { _id: { toString: () => 'abc123' } },
      } as Request),
      {} as Response,
      next as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });
});
