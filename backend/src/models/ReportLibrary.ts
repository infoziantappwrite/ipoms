import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── 4 Standardized Report Template Types ─────────────────────────────────────
// Spec: Module_06_Reports_Analytics_Specification_v1.0.md — Section 8.3
export type ReportTemplateType =
  | 'weekly_placement'
  | 'monthly_placement'
  | 'college_performance'
  | 'coordinator_performance';

export const REPORT_TEMPLATE_TYPES: ReportTemplateType[] = [
  'weekly_placement',
  'monthly_placement',
  'college_performance',
  'coordinator_performance',
];

// ─── Color Themes ────────────────────────────────────────────────────────────
export type ReportTheme = 'blue' | 'green' | 'purple' | 'college_branded';
export const REPORT_THEMES: ReportTheme[] = ['blue', 'green', 'purple', 'college_branded'];

// ─── Included Section Toggles ────────────────────────────────────────────────
export interface IIncludedSections {
  kpi_summary: boolean;
  completed_companies: boolean;
  in_progress: boolean;
  pipeline: boolean;
  charts: boolean;
  insights: boolean;
  remarks: boolean;
}

// ─── Filter Presets ──────────────────────────────────────────────────────────
export interface IReportFilters {
  academic_year?: string;
  college_id?: Types.ObjectId | null;
  coordinator_id?: Types.ObjectId | null;
  date_from?: Date | null;
  date_to?: Date | null;
  week_number?: number | null;
  month?: string | null;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IReportLibrary extends Document {
  template_type: ReportTemplateType;
  preset_name: string;
  college_id?: Types.ObjectId | null;
  coordinator_id: Types.ObjectId;           // Creator of the saved preset
  academic_year: string;

  filters: IReportFilters;
  included_sections: IIncludedSections;
  custom_remarks?: string;
  theme: ReportTheme;

  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ReportLibrarySchema: Schema<IReportLibrary> = new Schema(
  {
    template_type: {
      type: String,
      enum: REPORT_TEMPLATE_TYPES,
      required: true,
      index: true,
    },
    preset_name: {
      type: String,
      required: [true, 'Preset name is required'],
      trim: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      default: null,
      index: true,
    },
    coordinator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Coordinator reference is required'],
      index: true,
    },
    academic_year: {
      type: String,
      required: true,
      default: '2026',
      index: true,
    },

    // Filter configuration
    filters: {
      academic_year: { type: String, default: '2026' },
      college_id: { type: Schema.Types.ObjectId, ref: 'College', default: null },
      coordinator_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      date_from: { type: Date, default: null },
      date_to: { type: Date, default: null },
      week_number: { type: Number, default: null },
      month: { type: String, default: null },
    },

    // Section inclusion toggles
    included_sections: {
      kpi_summary: { type: Boolean, default: true },
      completed_companies: { type: Boolean, default: true },
      in_progress: { type: Boolean, default: true },
      pipeline: { type: Boolean, default: true },
      charts: { type: Boolean, default: true },
      insights: { type: Boolean, default: true },
      remarks: { type: Boolean, default: true },
    },

    custom_remarks: {
      type: String,
      trim: true,
      default: '',
    },

    theme: {
      type: String,
      enum: REPORT_THEMES,
      default: 'blue',
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'report_library',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes ────────────────────────────────────────────────────────
ReportLibrarySchema.index({ template_type: 1, college_id: 1, is_deleted: 1 });
ReportLibrarySchema.index({ coordinator_id: 1, is_deleted: 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const ReportLibrary: Model<IReportLibrary> = mongoose.model<IReportLibrary>(
  'ReportLibrary',
  ReportLibrarySchema
);
