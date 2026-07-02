import mongoose from 'mongoose';
import type { UserPublic } from '@bistro/shared-types';
import { AppError, tenantQuery } from '../../utils/api-response.js';
import { AuthService } from '../auth/auth.service.js';
import { User, type IUser } from '../auth/user.model.js';

function toPublic(user: IUser): UserPublic {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    lastLogin: user.lastLogin?.toISOString() ?? null,
  };
}

export class UsersService {
  static async list(tenantId: string): Promise<UserPublic[]> {
    const users = await User.find(tenantQuery(tenantId)).sort({ name: 1 });
    return users.map(toPublic);
  }

  static async create(
    tenantId: string,
    data: { email: string; password: string; name: string; role: IUser['role']; phone?: string }
  ): Promise<UserPublic> {
    const exists = await User.findOne({ tenantId, email: data.email.toLowerCase(), deletedAt: null });
    if (exists) throw new AppError('El email ya está registrado', 400);

    const passwordHash = await AuthService.hashPassword(data.password);
    const user = await User.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone ?? '',
      isActive: true,
    });
    return toPublic(user);
  }

  static async update(
    tenantId: string,
    userId: string,
    data: Partial<{
      name: string;
      role: IUser['role'];
      phone: string;
      isActive: boolean;
      password: string;
    }>
  ): Promise<UserPublic> {
    const user = await User.findOne(tenantQuery(tenantId, { _id: userId }));
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (data.name) user.name = data.name;
    if (data.role) user.role = data.role;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.password) {
      user.passwordHash = await AuthService.hashPassword(data.password);
    }

    await user.save();
    return toPublic(user);
  }
}
