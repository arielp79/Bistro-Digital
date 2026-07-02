import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/api-response.js';

import { TenantService, extractTenantIdentifier } from '../modules/tenant/tenant.service.js';



async function attachTenant(req: Request, next: NextFunction, required: boolean): Promise<void> {

  try {

    const identifier = extractTenantIdentifier(req);

    if (!identifier) {

      if (required) {

        next(new AppError('Tenant no especificado', 400));

      } else {

        next();

      }

      return;

    }



    const tenant = await TenantService.resolveByIdentifier(identifier);

    if (!tenant) {

      if (required) {

        next(new AppError('Tenant inválido', 403));

      } else {

        next();

      }

      return;

    }



    req.tenant = tenant;

    next();

  } catch (error) {

    next(error);

  }

}



export const tenantMiddleware = async (

  req: Request,

  res: Response,

  next: NextFunction

): Promise<void> => {

  await attachTenant(req, next, true);

};



export const optionalTenantMiddleware = async (

  req: Request,

  res: Response,

  next: NextFunction

): Promise<void> => {

  await attachTenant(req, next, false);

};


