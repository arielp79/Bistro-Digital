import mongoose, { Schema, type Document } from 'mongoose';
import type { TenantPlan } from '@bistro/shared-types';

export interface ITenant extends Document {
  slug: string;
  name: string;
  domain: string;
  isActive: boolean;
  plan: TenantPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionStatus: string;
  config: {
    branding: {
      logoUrl: string;
      primaryColor: string;
      accentColor: string;
      fontFamily: string;
      theme: 'light' | 'dark';
    };
    languages: string[];
    defaultLanguage: string;
    currency: 'ARS' | 'USD' | 'BRL';
    timezone: string;
    paymentMethods: {
      cash: boolean;
      transfer: boolean;
      mercadopago: boolean;
      stripe: boolean;
    };
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
    deliveryZones?: Array<{ maxKm: number; fee: number }>;
    deliveryFeeOutOfZone?: number;
    afip: {
      enabled: boolean;
      cuit: string;
      pointOfSale: number;
      certificate: string;
      privateKey: string;
    };
    whatsapp: {
      webhookToken: string;
      phoneNumberId: string;
      accessToken: string;
    };
    instagram: {
      pageId: string;
      accessToken: string;
    };
    mercadopago: {
      accessToken: string;
    };
  };
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    domain: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    stripeSubscriptionStatus: { type: String, default: '' },
    config: {
      branding: {
        logoUrl: { type: String, default: '' },
        primaryColor: { type: String, default: '#1A1A2E' },
        accentColor: { type: String, default: '#E8C468' },
        fontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      },
      languages: { type: [String], default: ['es'] },
      defaultLanguage: { type: String, default: 'es' },
      currency: { type: String, enum: ['ARS', 'USD', 'BRL'], default: 'ARS' },
      timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
      paymentMethods: {
        cash: { type: Boolean, default: true },
        transfer: { type: Boolean, default: true },
        mercadopago: { type: Boolean, default: false },
        stripe: { type: Boolean, default: false },
      },
      location: {
        lat: Number,
        lng: Number,
        address: String,
      },
      deliveryZones: [{ maxKm: Number, fee: Number }],
      deliveryFeeOutOfZone: Number,
      afip: {
        enabled: { type: Boolean, default: false },
        cuit: { type: String, default: '' },
        pointOfSale: { type: Number, default: 1 },
        certificate: { type: String, default: '' },
        privateKey: { type: String, default: '' },
      },
      whatsapp: {
        webhookToken: { type: String, default: '' },
        phoneNumberId: { type: String, default: '' },
        accessToken: { type: String, default: '' },
      },
      instagram: {
        pageId: { type: String, default: '' },
        accessToken: { type: String, default: '' },
      },
      mercadopago: {
        accessToken: { type: String, default: '' },
      },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantSchema.index({ domain: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
