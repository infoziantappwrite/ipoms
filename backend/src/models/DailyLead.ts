import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Lead Type Enum ──────────────────────────────────────────────────────────
// Spec: Module_05_Daily_Leads_Specification_v1.0.md — Section 8 & 9
export type LeadType = 'positive' | 'jd_received';

export const LEAD_TYPES: LeadType[] = ['positive', 'jd_received'];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IDailyLead extends Document {
  // Category & Ownership
  lead_type: LeadType;                      // 'positive' (Tab 1) | 'jd_received' (Tab 2)
  college_id: Types.ObjectId;               // FK → colleges
  coordinator_id: Types.ObjectId;           // FK → users (Created by audit owner)
  company_id?: Types.ObjectId;              // Optional FK → company_metadata
  daily_tracker_id?: Types.ObjectId;        // Optional FK → daily_tracker (Copy shortcut source)

  // Opportunity Details
  company_name: string;
  job_role: string;
  ctc: string;                              // e.g. "5.0 - 8.0 LPA" or "6.5 LPA"
  eligible_batch: string;                   // e.g. "2026 Batch"

  // Date & Time Handling (Maintained separately per Spec Section 10)
  event_time: string;                       // e.g. "10:30 AM" or "02:15 PM"
  lead_date: Date;                          // Calendar date (midnight UTC)

  // Remarks & Status
  remarks: string;                          // Operational notes / opportunity remarks
  is_moved_to_jd: boolean;                  // Set true when 1-click moved to JD Received
  is_finalized: boolean;                    // Coordinator day finalization lock

  // Soft Delete & Audit
  is_deleted: boolean;
  deleted_at?: Date;
  updated_by?: Types.ObjectId;              // Last edited coordinator audit reference
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const DailyLeadSchema: Schema<IDailyLead> = new Schema(
  {
    lead_type: {
      type: String,
      enum: LEAD_TYPES,
      required: true,
      default: 'positive',
      index: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required'],
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
      default: null,
      index: true,
    },
    daily_tracker_id: {
      type: Schema.Types.ObjectId,
      ref: 'DailyTracker',
      default: null,
      index: true,
    },

    // Details
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
    ctc: {
      type: String,
      trim: true,
      default: '',
    },
    eligible_batch: {
      type: String,
      trim: true,
      default: '2026 Batch',
    },

    // Date & Time
    event_time: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    lead_date: {
      type: Date,
      required: [true, 'Lead date is required'],
      index: true,
    },

    // Remarks & Status
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    is_moved_to_jd: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_finalized: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Soft delete & Audit
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'daily_leads',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes for High-Speed Operational Lookups ─────────────────────

// Primary view: Filter by college, date, and tab (positives vs jd_received)
DailyLeadSchema.index({ college_id: 1, lead_date: 1, lead_type: 1, is_deleted: 1 });

// Global date view across all colleges
DailyLeadSchema.index({ lead_date: 1, lead_type: 1, is_deleted: 1 });

// Coordinator audit view
DailyLeadSchema.index({ coordinator_id: 1, lead_date: 1, is_deleted: 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const DailyLead: Model<IDailyLead> = mongoose.model<IDailyLead>(
  'DailyLead',
  DailyLeadSchema
);
