import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Pipeline Section Enum ──────────────────────────────────────────────────
// Spec: Module_04_Weekly_Tracker_Specification_v1.0.md — Section 7 & 8
export type PipelineSection =
  | 'completed'
  | 'in_drive'
  | 'companies_in_drive'
  | 'in_progress'
  | 'pipeline'
  | 'top_companies'
  | 'rejected_companies'
  | 'on_hold_by_college'
  | 'on_hold_by_hr'
  | 'rejected_by_hr'
  | 'rejected_by_college';

export const PIPELINE_SECTIONS: PipelineSection[] = [
  'completed',
  'in_drive',
  'companies_in_drive',
  'in_progress',
  'pipeline',
  'top_companies',
  'rejected_companies',
  'on_hold_by_college',
  'on_hold_by_hr',
  'rejected_by_hr',
  'rejected_by_college',
];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IWeeklyTracker extends Document {
  // Context & Ownership
  academic_year: number;                    // e.g. 2026 (Continuous academic year tracking)
  college_id: Types.ObjectId;               // FK → colleges
  coordinator_id: Types.ObjectId;           // FK → users
  company_id: Types.ObjectId;               // FK → company_metadata
  daily_tracker_id?: Types.ObjectId;        // Optional FK → daily_tracker (originating call)

  // Company Information
  company_name: string;
  job_role: string;                         // Comma-separated roles (e.g. "Software Engineer, AI Engineer")
  cdc_reference?: string;                   // Campus placement coordinator reference
  company_type?: string;                    // e.g. Software, Core, Banking, Healthcare, etc.
  ctc_lpa?: string;                         // e.g. "6.5 LPA" or "4.0 - 6.0 LPA"
  eligible_batch?: string;                  // e.g. "2026 Batch"

  // Pipeline Placement & Status
  pipeline_section: PipelineSection;        // 6 core pipeline sections
  is_pinned_top: boolean;                   // Pin to Top Companies section
  current_status_text: string;              // Rich natural free-text status notes

  // Key Dates
  follow_up_date?: Date;                    // Next scheduled follow-up
  drive_date?: Date;                        // Scheduled placement drive date

  // Student Counts & Offers
  registered_count: number;                 // Total registered students
  shortlisted_count: number;                // Total shortlisted after tests/tech rounds
  selected_count: number;                   // Final offers released (editable in completed)

  // Reporting Week Dimensions
  week_number: number;                      // ISO week number (1-53)
  week_start_date?: Date;                   // Friday cycle start date
  week_end_date?: Date;                     // Friday cycle end date

  // Soft Delete & Audit
  is_deleted: boolean;
  deleted_at?: Date;
  last_status_updated_at: Date;
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const WeeklyTrackerSchema: Schema<IWeeklyTracker> = new Schema(
  {
    // Context & Ownership
    academic_year: {
      type: Number,
      required: true,
      default: 2026,
      index: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College context is required'],
      index: true,
    },
    coordinator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Coordinator reference is required'],
      index: true,
    },
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyMetadata',
      required: [true, 'Company reference is required'],
      index: true,
    },
    daily_tracker_id: {
      type: Schema.Types.ObjectId,
      ref: 'DailyTracker',
      default: null,
      index: true,
    },

    // Company Details
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    job_role: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      default: 'Graduate Trainee',
    },
    cdc_reference: {
      type: String,
      trim: true,
      default: '',
    },
    company_type: {
      type: String,
      trim: true,
      default: 'Software / IT',
    },
    ctc_lpa: {
      type: String,
      trim: true,
      default: '',
    },
    eligible_batch: {
      type: String,
      trim: true,
      default: '2026 Batch',
    },

    // Pipeline Section & State
    pipeline_section: {
      type: String,
      enum: PIPELINE_SECTIONS,
      default: 'pipeline',
      index: true,
    },
    is_pinned_top: {
      type: Boolean,
      default: false,
      index: true,
    },
    current_status_text: {
      type: String,
      trim: true,
      default: 'Invite email sent, awaiting JD',
    },

    // Dates
    follow_up_date: {
      type: Date,
      default: null,
      index: true,
    },
    drive_date: {
      type: Date,
      default: null,
    },

    // Metrics & Counts
    registered_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    shortlisted_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    selected_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Week Reporting
    week_number: {
      type: Number,
      default: () => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      },
      index: true,
    },
    week_start_date: {
      type: Date,
      default: null,
    },
    week_end_date: {
      type: Date,
      default: null,
    },

    // Soft delete & timestamps
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    last_status_updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'weekly_tracker',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes for High-Speed Lookups ─────────────────────────────────

// Primary view: College pipeline by academic year & section
WeeklyTrackerSchema.index({ college_id: 1, academic_year: 1, pipeline_section: 1, is_deleted: 1 });

// Coordinator view
WeeklyTrackerSchema.index({ coordinator_id: 1, academic_year: 1, is_deleted: 1 });

// Urgent Follow-ups view (Section 1: Follow-up Due Today)
WeeklyTrackerSchema.index({ college_id: 1, follow_up_date: 1, is_deleted: 1 });

// Top Companies index
WeeklyTrackerSchema.index({ college_id: 1, is_pinned_top: 1, is_deleted: 1 });

// Originating daily tracker deduplication index
WeeklyTrackerSchema.index({ daily_tracker_id: 1, is_deleted: 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const WeeklyTracker: Model<IWeeklyTracker> = mongoose.model<IWeeklyTracker>(
  'WeeklyTracker',
  WeeklyTrackerSchema
);
