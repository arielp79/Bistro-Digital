import Afip from '@afipsdk/afip.js';
import type { AfipTestResult, InvoicePublic, InvoiceType, OrderBillingPublic } from '@bistro/shared-types';
import { AppError, tenantQuery } from '../../utils/api-response.js';
import { decrypt } from '../../utils/encryption.js';
import { env } from '../../config/env.js';
import { Order, type IOrder } from '../orders/order.model.js';
import { Tenant, type ITenant } from '../tenant/tenant.model.js';
import { renderInvoiceHtml } from './invoice-html.template.js';

const CBTE_TIPO: Record<InvoiceType, number> = { B: 6, C: 11 };

function formatAfipDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function parseAfipCaeExpiry(raw: string): Date {
  if (raw.length === 8) {
    const y = parseInt(raw.slice(0, 4), 10);
    const m = parseInt(raw.slice(4, 6), 10) - 1;
    const d = parseInt(raw.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  return new Date(raw);
}

function generateDemoCae(): string {
  return String(Math.floor(70000000000000 + Math.random() * 9999999999));
}

function toBillingPublic(order: IOrder): OrderBillingPublic | null {
  if (!order.billing?.cae) return null;
  return {
    invoiceType: order.billing.invoiceType!,
    cae: order.billing.cae,
    caeExpiry: order.billing.caeExpiry!.toISOString(),
    voucherNumber: order.billing.voucherNumber!,
    pointOfSale: order.billing.pointOfSale!,
    pdfUrl: order.billing.pdfUrl!,
    mode: order.billing.mode ?? 'demo',
    issuedAt: order.billing.issuedAt!.toISOString(),
  };
}

export class BillingService {
  static async testAfipConnection(tenantId: string): Promise<AfipTestResult> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new AppError('Tenant no encontrado', 404);

    const afipConfig = tenant.config.afip;
    if (!afipConfig?.cuit?.trim() || !afipConfig.certificate || !afipConfig.privateKey) {
      throw new AppError('Faltan CUIT, certificado o clave privada en configuración AFIP', 400);
    }

    const pointOfSale = afipConfig.pointOfSale || 1;
    const useProduction = env.nodeEnv === 'production' && afipConfig.enabled;
    const cert = decrypt(afipConfig.certificate);
    const key = decrypt(afipConfig.privateKey);
    const cuit = afipConfig.cuit.replace(/\D/g, '');

    const afip = new Afip({
      CUIT: parseInt(cuit, 10),
      cert,
      key,
      production: useProduction,
    });

    try {
      const lastVoucherB = await afip.ElectronicBilling.getLastVoucher(pointOfSale, CBTE_TIPO.B);
      const environment = useProduction ? 'produccion' : 'homologacion';
      return {
        ok: true,
        environment,
        cuit: afipConfig.cuit,
        pointOfSale,
        lastVoucherB,
        message:
          environment === 'produccion'
            ? 'Conexión AFIP producción OK'
            : 'Conexión AFIP homologación OK — listo para emitir comprobantes de prueba',
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new AppError(
        `AFIP rechazó la conexión (${useProduction ? 'producción' : 'homologación'}): ${detail}`,
        400
      );
    }
  }

  static async listBillableOrders(tenantId: string): Promise<
    Array<{
      id: string;
      orderNumber: string;
      total: number;
      status: string;
      paidAt: string | null;
      billing: OrderBillingPublic | null;
    }>
  > {
    const orders = await Order.find(
      tenantQuery(tenantId, { status: { $in: ['paid', 'delivered'] } })
    )
      .sort({ 'timestamps.paidAt': -1, 'timestamps.createdAt': -1 })
      .limit(50);

    return orders.map((order) => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      paidAt: order.timestamps.paidAt?.toISOString() ?? null,
      billing: toBillingPublic(order),
    }));
  }

  static async createInvoice(
    tenantId: string,
    orderId: string,
    invoiceType: InvoiceType
  ): Promise<InvoicePublic> {
    const [order, tenant] = await Promise.all([
      Order.findOne(tenantQuery(tenantId, { _id: orderId })),
      Tenant.findById(tenantId),
    ]);

    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (!tenant) throw new AppError('Tenant no encontrado', 404);

    if (!['paid', 'delivered'].includes(order.status)) {
      throw new AppError('Solo se puede facturar un pedido pagado o entregado', 400);
    }

    if (order.billing?.cae) {
      throw new AppError('Este pedido ya tiene factura emitida', 400);
    }

    const pointOfSale = tenant.config.afip.pointOfSale || 1;
    const useProduction = env.nodeEnv === 'production' && tenant.config.afip.enabled;

    let cae: string;
    let caeExpiry: Date;
    let voucherNumber: number;
    let mode: 'production' | 'homologacion' | 'demo';

    if (tenant.config.afip.enabled && tenant.config.afip.cuit && tenant.config.afip.certificate && tenant.config.afip.privateKey) {
      const result = await BillingService.emitAfipVoucher(tenant, order, invoiceType, pointOfSale, useProduction);
      cae = result.cae;
      caeExpiry = result.caeExpiry;
      voucherNumber = result.voucherNumber;
      mode = useProduction ? 'production' : 'homologacion';
    } else if (tenant.config.afip.enabled) {
      throw new AppError(
        'AFIP habilitado pero faltan CUIT, certificado o clave privada en configuración',
        400
      );
    } else {
      voucherNumber = Math.floor(100000 + Math.random() * 899999);
      cae = generateDemoCae();
      caeExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      mode = 'demo';
    }

    const pdfUrl = `/api/v1/billing/${orderId}/invoice/pdf`;

    order.billing = {
      invoiceType,
      cae,
      caeExpiry,
      pdfUrl,
      voucherNumber,
      pointOfSale,
      mode,
      issuedAt: new Date(),
    };
    await order.save();

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      invoiceType,
      cae,
      caeExpiry: caeExpiry.toISOString(),
      voucherNumber,
      pointOfSale,
      mode,
      pdfUrl,
    };
  }

  private static async emitAfipVoucher(
    tenant: ITenant,
    order: IOrder,
    invoiceType: InvoiceType,
    pointOfSale: number,
    production: boolean
  ): Promise<{ cae: string; caeExpiry: Date; voucherNumber: number }> {
    const cert = decrypt(tenant.config.afip.certificate);
    const key = decrypt(tenant.config.afip.privateKey);
    const cuit = tenant.config.afip.cuit.replace(/\D/g, '');

    const afip = new Afip({
      CUIT: parseInt(cuit, 10),
      cert,
      key,
      production,
    });

    const cbteTipo = CBTE_TIPO[invoiceType];
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(pointOfSale, cbteTipo);
    const voucherNumber = lastVoucher + 1;
    const netAmount = Math.round((order.total / 1.21) * 100) / 100;
    const ivaAmount = Math.round((order.total - netAmount) * 100) / 100;
    const today = formatAfipDate(new Date());

    const voucherData: Record<string, unknown> = {
      CantReg: 1,
      PtoVta: pointOfSale,
      CbteTipo: cbteTipo,
      Concepto: 1,
      DocTipo: 99,
      DocNro: 0,
      CbteDesde: voucherNumber,
      CbteHasta: voucherNumber,
      CbteFch: today,
      ImpTotal: order.total,
      ImpTotConc: 0,
      ImpNeto: invoiceType === 'B' ? netAmount : order.total,
      ImpOpEx: 0,
      ImpIVA: invoiceType === 'B' ? ivaAmount : 0,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    if (invoiceType === 'B') {
      voucherData.Iva = [{ Id: 5, BaseImp: netAmount, Importe: ivaAmount }];
    }

    const result = await afip.ElectronicBilling.createVoucher(voucherData);

    return {
      cae: String(result.CAE),
      caeExpiry: parseAfipCaeExpiry(String(result.CAEFchVto)),
      voucherNumber,
    };
  }

  static async renderInvoicePdf(tenantId: string, orderId: string): Promise<string> {
    const [order, tenant] = await Promise.all([
      Order.findOne(tenantQuery(tenantId, { _id: orderId })),
      Tenant.findById(tenantId),
    ]);

    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (!tenant) throw new AppError('Tenant no encontrado', 404);
    if (!order.billing?.cae || !order.billing.invoiceType) {
      throw new AppError('Este pedido no tiene factura emitida', 404);
    }

    return renderInvoiceHtml({
      tenant,
      order,
      invoiceType: order.billing.invoiceType,
      cae: order.billing.cae,
      caeExpiry: order.billing.caeExpiry!,
      voucherNumber: order.billing.voucherNumber!,
      pointOfSale: order.billing.pointOfSale!,
      mode: order.billing.mode ?? 'demo',
    });
  }
}
