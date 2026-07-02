import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

export function captureRawBody(
  req: Request,
  _res: Response,
  buf: Buffer
): void {
  if (req.originalUrl?.startsWith('/api/v1/webhooks')) {
    (req as RequestWithRawBody).rawBody = buf;
  }
}

export function verifyMetaWebhookSignature(
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): void {
  if (!env.whatsappAppSecret) {
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string' || !req.rawBody) {
    console.warn('[Webhook] Firma Meta ausente o body raw no capturado');
    res.sendStatus(401);
    return;
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', env.whatsappAppSecret).update(req.rawBody).digest('hex');

  try {
    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      console.warn('[Webhook] Firma Meta inválida');
      res.sendStatus(401);
      return;
    }
  } catch {
    res.sendStatus(401);
    return;
  }

  next();
}
