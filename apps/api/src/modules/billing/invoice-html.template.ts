import type { IOrder } from '../orders/order.model.js';
import type { ITenant } from '../tenant/tenant.model.js';

export interface InvoiceTemplateData {
  tenant: ITenant;
  order: IOrder;
  invoiceType: 'B' | 'C';
  cae: string;
  caeExpiry: Date;
  voucherNumber: number;
  pointOfSale: number;
  mode: 'production' | 'homologacion' | 'demo';
}

function invoiceModeBanner(mode: InvoiceTemplateData['mode']): string {
  if (mode === 'demo') {
    return `<div style="background:#E8C468;color:#1A1A2E;text-align:center;padding:8px;font-weight:bold;">
           DEMO — Comprobante sin validez fiscal (AFIP deshabilitado)
         </div>`;
  }
  if (mode === 'homologacion') {
    return `<div style="background:#93c5fd;color:#1e3a5f;text-align:center;padding:8px;font-weight:bold;">
           HOMOLOGACION AFIP — Comprobante de prueba (sin validez fiscal en produccion)
         </div>`;
  }
  return '';
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR');
}

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const { tenant, order, invoiceType, cae, caeExpiry, voucherNumber, pointOfSale, mode } = data;
  const netAmount = order.total / 1.21;
  const ivaAmount = order.total - netAmount;
  const typeLabel = invoiceType === 'B' ? 'Factura B' : 'Factura C';
  const demoBanner = invoiceModeBanner(mode);

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">$${formatMoney(item.unitPrice)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">$${formatMoney(item.unitPrice * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${typeLabel} ${String(pointOfSale).padStart(4, '0')}-${String(voucherNumber).padStart(8, '0')}</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; color: #1A1A2E; margin: 0; padding: 24px; background: #FAFAFA; }
    .page { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #ddd; }
    .header { display: flex; justify-content: space-between; padding: 24px; border-bottom: 2px solid #1A1A2E; }
    .brand h1 { margin: 0 0 4px; font-size: 22px; }
    .brand p { margin: 0; color: #666; font-size: 13px; }
    .voucher-box { text-align: right; }
    .voucher-box h2 { margin: 0 0 8px; font-size: 20px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 24px; }
    .meta section h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 0 24px 24px; width: calc(100% - 48px); }
    th { text-align: left; padding: 8px; background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
    .totals { margin: 0 24px 24px; display: flex; justify-content: flex-end; }
    .totals table { width: 280px; margin: 0; }
    .cae { margin: 0 24px 24px; padding: 16px; background: #f9f9f9; border: 1px dashed #ccc; }
    @media print { body { background: #fff; padding: 0; } .page { border: none; } }
  </style>
</head>
<body>
  <div class="page">
    ${demoBanner}
    <div class="header">
      <div class="brand">
        <h1>${tenant.name}</h1>
        <p>CUIT: ${tenant.config.afip.cuit || '—'}</p>
        <p>Pedido: ${order.orderNumber}</p>
      </div>
      <div class="voucher-box">
        <h2>${typeLabel}</h2>
        <p>Pto. Vta: ${String(pointOfSale).padStart(4, '0')}</p>
        <p>Comp. Nro: ${String(voucherNumber).padStart(8, '0')}</p>
        <p>Fecha: ${formatDate(order.timestamps.paidAt ?? order.timestamps.createdAt)}</p>
      </div>
    </div>
    <div class="meta">
      <section>
        <h3>Cliente</h3>
        <p>${order.customer.name || 'Consumidor Final'}</p>
        <p>${order.customer.phone || ''}</p>
        ${order.customer.address ? `<p>${order.customer.address}</p>` : ''}
      </section>
      <section>
        <h3>Detalle del pedido</h3>
        <p>Tipo: ${order.type}</p>
        <p>Medio de pago: ${order.payment.method ?? '—'}</p>
      </section>
    </div>
    <table>
      <thead>
        <tr>
          <th>Cant.</th>
          <th>Descripción</th>
          <th style="text-align:right;">P. Unit.</th>
          <th style="text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    ${
      order.deliveryFee > 0
        ? `<p style="margin:0 24px 8px;text-align:right;color:#666;">Envío: $${formatMoney(order.deliveryFee)}</p>`
        : ''
    }
    ${
      order.tip > 0
        ? `<p style="margin:0 24px 8px;text-align:right;color:#666;">Propina: $${formatMoney(order.tip)}</p>`
        : ''
    }
    <div class="totals">
      <table>
        ${
          invoiceType === 'B'
            ? `
        <tr><td>Neto gravado</td><td style="text-align:right;">$${formatMoney(netAmount)}</td></tr>
        <tr><td>IVA 21%</td><td style="text-align:right;">$${formatMoney(ivaAmount)}</td></tr>`
            : ''
        }
        <tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>$${formatMoney(order.total)}</strong></td></tr>
      </table>
    </div>
    <div class="cae">
      <p><strong>CAE:</strong> ${cae}</p>
      <p><strong>Vto. CAE:</strong> ${formatDate(caeExpiry)}</p>
    </div>
  </div>
</body>
</html>`;
}
