import mongoose, { Schema, type Document } from 'mongoose';
import type { UserRole } from '@bistro/shared-types';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  phone: string;
  isActive: boolean;
  lastLogin: Date | null;
  refreshTokens: Array<{ token: string; expiresAt: Date; device: string }>;
  deletedAt: Date | null;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false, default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'waiter', 'kitchen', 'cashier', 'platform_admin'],
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        device: String,
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

userSchema.pre('validate', function validateTenantId(next) {
  if (this.role !== 'platform_admin' && !this.tenantId) {
    next(new Error('tenantId requerido para usuarios de restaurante'));
    return;
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema);
