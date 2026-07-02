import mongoose from 'mongoose';
import type { TablePublic, TableStatus } from '@bistro/shared-types';
import { AppError, tenantQuery } from '../../utils/api-response.js';
import { emitToTenant } from '../../services/socket.service.js';
import { Tenant } from '../tenant/tenant.model.js';
import { Table, type ITable } from './table.model.js';

function buildQrUrl(tenantSlug: string, tableId: string): string {
  return `/menu?table=${tableId}&tenant=${tenantSlug}`;
}

function toPublic(table: ITable, tenantSlug: string): TablePublic {
  const id = table._id.toString();
  return {
    id,
    number: table.number,
    label: table.label,
    zone: table.zone,
    status: table.status,
    capacity: table.capacity,
    currentOrderId: table.currentOrderId?.toString() ?? null,
    qrCodeUrl: table.qrCodeUrl || buildQrUrl(tenantSlug, id),
  };
}

export class TableService {
  private static async getTenantSlug(tenantId: string): Promise<string> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new AppError('Tenant no encontrado', 404);
    return tenant.slug;
  }

  static async listTables(tenantId: string): Promise<TablePublic[]> {
    const slug = await this.getTenantSlug(tenantId);
    const tables = await Table.find(tenantQuery(tenantId)).sort({ number: 1 });
    return tables.map((t) => toPublic(t, slug));
  }

  static async getTable(tenantId: string, tableId: string): Promise<TablePublic | null> {
    const slug = await this.getTenantSlug(tenantId);
    const table = await Table.findOne(tenantQuery(tenantId, { _id: tableId }));
    return table ? toPublic(table, slug) : null;
  }

  static async createTable(
    tenantId: string,
    data: { number: number; label: string; zone?: string; capacity?: number }
  ): Promise<TablePublic> {
    const slug = await this.getTenantSlug(tenantId);
    const exists = await Table.findOne(tenantQuery(tenantId, { number: data.number }));
    if (exists) throw new AppError('Ya existe una mesa con ese número', 400);

    const table = await Table.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      number: data.number,
      label: data.label,
      zone: data.zone ?? 'Salón',
      capacity: data.capacity ?? 4,
      status: 'available',
    });

    table.qrCodeUrl = buildQrUrl(slug, table._id.toString());
    await table.save();

    return toPublic(table, slug);
  }

  static async updateTable(
    tenantId: string,
    tableId: string,
    data: Partial<{ number: number; label: string; zone: string; capacity: number }>
  ): Promise<TablePublic> {
    const slug = await this.getTenantSlug(tenantId);

    if (data.number != null) {
      const conflict = await Table.findOne(
        tenantQuery(tenantId, { number: data.number, _id: { $ne: tableId } })
      );
      if (conflict) throw new AppError('Ya existe una mesa con ese número', 400);
    }

    const table = await Table.findOneAndUpdate(
      tenantQuery(tenantId, { _id: tableId }),
      { $set: data },
      { new: true }
    );
    if (!table) throw new AppError('Mesa no encontrada', 404);

    if (!table.qrCodeUrl) {
      table.qrCodeUrl = buildQrUrl(slug, table._id.toString());
      await table.save();
    }

    return toPublic(table, slug);
  }

  static async deleteTable(tenantId: string, tableId: string): Promise<void> {
    const table = await Table.findOne(tenantQuery(tenantId, { _id: tableId }));
    if (!table) throw new AppError('Mesa no encontrada', 404);
    if (table.status === 'occupied') {
      throw new AppError('No se puede eliminar una mesa ocupada', 400);
    }

    await Table.findByIdAndUpdate(table._id, {
      $set: { deletedAt: new Date(), status: 'available', currentOrderId: null },
    });
  }

  static async updateStatus(
    tenantId: string,
    tableId: string,
    status: TableStatus
  ): Promise<TablePublic> {
    const slug = await this.getTenantSlug(tenantId);
    const table = await Table.findOneAndUpdate(
      tenantQuery(tenantId, { _id: tableId }),
      { $set: { status } },
      { new: true }
    );
    if (!table) throw new AppError('Mesa no encontrada', 404);

    const publicTable = toPublic(table, slug);
    emitToTenant(tenantId, 'table:status_changed', publicTable);
    return publicTable;
  }
}
