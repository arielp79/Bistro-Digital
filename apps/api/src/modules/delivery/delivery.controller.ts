import type { Request, Response, NextFunction } from 'express';
import { simulateDeliverySchema, testWhatsAppSchema, testInstagramSchema } from '@bistro/validation-schemas';
import type { DeliverySessionPublic, WhatsAppTestResult, InstagramTestResult } from '@bistro/shared-types';import { apiSuccess, AppError } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { getDeliveryQueue } from '../../services/queue.service.js';
import { DeliveryOpsService } from './delivery-ops.service.js';
import { DeliverySession, type IDeliverySession } from './delivery-session.model.js';
import { DeliveryService } from './delivery.service.js';
import { WhatsAppService, InstagramService } from './messaging/whatsapp.service.js';
import type { ITenant } from '../tenant/tenant.model.js';
function toSessionPublic(session: IDeliverySession): DeliverySessionPublic {
  return {
    id: session._id.toString(),
    platform: session.platform,
    customerPhone: session.customerPhone,
    state: session.state,
    conversationHistory: session.conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    })),
    currentOrderDraft: session.currentOrderDraft,
    orderId: session.orderId?.toString() ?? null,
    updatedAt: (session as IDeliverySession & { updatedAt?: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export const simulateDeliveryMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = simulateDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const { phone, message } = parsed.data;
    const queue = getDeliveryQueue();

    const job = await queue.add('process_message', {
      platform: 'simulate',
      tenantId: req.tenant._id.toString(),
      messageId: `sim-${Date.now()}`,
      from: phone,
      type: 'text',
      text: message,
      imageId: null,
      timestamp: new Date().toISOString(),
    });

    res.json(
      apiSuccess({
        jobId: job.id,
        message: 'Mensaje encolado. La respuesta aparecerá en el historial en unos segundos.',
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getDeliveryOps = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const snapshot = await DeliveryOpsService.getSnapshot(req.tenant._id.toString());
    res.json(apiSuccess(snapshot));
  } catch (error) {
    next(error);
  }
};

export const listDeliverySessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const sessions = await DeliverySession.find({
      tenantId: req.tenant._id,
    })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(apiSuccess(sessions.map(toSessionPublic)));
  } catch (error) {
    next(error);
  }
};

export const getDeliverySession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const session = await DeliverySession.findOne({
      _id: getParam(req, 'sessionId'),
      tenantId: req.tenant._id,
    });

    if (!session) throw new AppError('Sesión no encontrada', 404);
    res.json(apiSuccess(toSessionPublic(session)));
  } catch (error) {
    next(error);
  }
};

export const calculateShippingPreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const address = req.query.address;
    if (typeof address !== 'string' || !address.trim()) {
      throw new AppError('Parámetro address requerido', 400);
    }

    const result = await DeliveryService.calculateShipping(req.tenant as ITenant, address.trim());
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const testInstagramMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = testInstagramSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const { recipientId, message } = parsed.data;
    const result = await InstagramService.sendText(req.tenant, recipientId, message);

    const payload: InstagramTestResult = {
      ok: result.ok,
      mode: result.mode,
      error: result.error,
    };

    if (!result.ok) {
      throw new AppError(result.error ?? 'Error al enviar mensaje de prueba', 502);
    }

    res.json(apiSuccess(payload));
  } catch (error) {
    next(error);
  }
};

export const testWhatsAppMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = testWhatsAppSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const { phone, message } = parsed.data;
    const result = await WhatsAppService.sendText(req.tenant, phone, message);

    const payload: WhatsAppTestResult = {
      ok: result.ok,
      mode: result.mode,
      messageId: result.messageId,
      error: result.error,
    };

    if (!result.ok) {
      throw new AppError(result.error ?? 'Error al enviar mensaje de prueba', 502);
    }

    res.json(apiSuccess(payload));
  } catch (error) {
    next(error);
  }
};