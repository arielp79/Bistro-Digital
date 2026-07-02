import mongoose, { Schema, type Document } from 'mongoose';

export interface IImpersonationAuditLog extends Document {
  platformAdminId: mongoose.Types.ObjectId;
  platformAdminEmail: string;
  tenantId: mongoose.Types.ObjectId;
  tenantSlug: string;
  tenantName: string;
  targetAdminId: mongoose.Types.ObjectId;
  targetAdminEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

const impersonationAuditSchema = new Schema<IImpersonationAuditLog>(
  {
    platformAdminId: { type: Schema.Types.ObjectId, required: true, index: true },
    platformAdminEmail: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    tenantSlug: { type: String, required: true, index: true },
    tenantName: { type: String, required: true },
    targetAdminId: { type: Schema.Types.ObjectId, required: true },
    targetAdminEmail: { type: String, required: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: false }
);

impersonationAuditSchema.index({ startedAt: -1 });
impersonationAuditSchema.index({ platformAdminId: 1, endedAt: 1 });

export const ImpersonationAuditLog = mongoose.model<IImpersonationAuditLog>(
  'ImpersonationAuditLog',
  impersonationAuditSchema
);
