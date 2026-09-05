import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISystemSettings extends Document {
  academic_year: string;
  season_name: string;
  daily_calling_target: number;
  working_days: string[];
  org_name: string;
  org_support_email: string;
  org_support_phone: string;
  maintenance_mode_enabled: boolean;
  maintenance_affected_roles: string[];
  maintenance_reason: string;
  maintenance_start_time?: Date | null;
  maintenance_end_time?: Date | null;
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
    // ── Maintenance Mode (Module 10 §8) ──────────────────────────────────
    // Administrator only stayed excluded on purpose: it must always be
    // possible to log in as Administrator and switch this back off, even if
    // every other role is currently locked out.
    maintenance_mode_enabled: {
      type: Boolean,
      default: false,
    },
    maintenance_affected_roles: {
      type: [String],
      default: ['TEAM_LEADER', 'PLACEMENT_COORDINATOR'],
    },
    maintenance_reason: {
      type: String,
      default: '',
      trim: true,
    },
    maintenance_start_time: {
      type: Date,
      default: null,
    },
    maintenance_end_time: {
      type: Date,
      default: null,
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
