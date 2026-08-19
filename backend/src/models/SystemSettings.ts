import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISystemSettings extends Document {
  academic_year: string;
  season_name: string;
  daily_calling_target: number;
  working_days: string[];
  org_name: string;
  org_support_email: string;
  org_support_phone: string;
  theme_default: string;
  default_landing_page: string;
  enable_email_notifications: boolean;
  enable_system_notifications: boolean;
  enable_dashboard_popups: boolean;
  system_announcement_banner?: string;
  created_at: Date;
  updated_at: Date;
}

const SystemSettingsSchema: Schema<ISystemSettings> = new Schema(
  {
    academic_year: {
      type: String,
      default: '2025-2026',
      trim: true,
    },
    season_name: {
      type: String,
      default: 'Campus Recruitment Season 2025-26',
      trim: true,
    },
    daily_calling_target: {
      type: Number,
      default: 30,
    },
    working_days: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    org_name: {
      type: String,
      default: 'Infoziant Placement Operations',
      trim: true,
    },
    org_support_email: {
      type: String,
      default: 'support@infoziant.com',
      trim: true,
      lowercase: true,
    },
    org_support_phone: {
      type: String,
      default: '+91 98401 23456',
      trim: true,
    },
    theme_default: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: 'dark',
    },
    default_landing_page: {
      type: String,
      default: '/dashboard',
    },
    enable_email_notifications: {
      type: Boolean,
      default: true,
    },
    enable_system_notifications: {
      type: Boolean,
      default: true,
    },
    enable_dashboard_popups: {
      type: Boolean,
      default: true,
    },
    system_announcement_banner: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'system_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const SystemSettings: Model<ISystemSettings> = mongoose.model<ISystemSettings>(
  'SystemSettings',
  SystemSettingsSchema
);
