import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Status Enum (Strictly 3 options per User Directive) ──────────────────────
export type ActiveLeadStatus = 'Hiring' | 'Invite Email' | 'Follow Up';
export const ACTIVE_LEAD_STATUSES: ActiveLeadStatus[] = ['Hiring', 'Invite Email', 'Follow Up'];

// ─── Followup Months (12 Calendar Months) ────────────────────────────────────
export const FOLLOWUP_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
export type FollowupMonth = (typeof FOLLOWUP_MONTHS)[number] | '';

// ─── Academic Years (2026 to 2035) ───────────────────────────────────────────
export const ACADEMIC_YEARS = [
  '2026',
  '2027',
  '2028',
  '2029',
  '2030',
  '2031',
  '2032',
  '2033',
  '2034',
  '2035',
] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IActiveLead extends Document {
  company_name: string;
  role: string;
  ctc: string;
  status: ActiveLeadStatus;
  followup_month: FollowupMonth;
  academic_year: string;

  // Ownership & References
  coordinator_id?: Types.ObjectId;
  college_id?: Types.ObjectId;
  daily_tracker_id?: Types.ObjectId;

  // Soft Delete & Audit
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ActiveLeadSchema: Schema<IActiveLead> = new Schema(
  {
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'Graduate Trainee',
    },
    ctc: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [...ACTIVE_LEAD_STATUSES, 'Not Hiring'],
      required: true,
      default: 'Hiring',
      index: true,
    },
    followup_month: {
      type: String,
      default: '',
    },
    academic_year: {
      type: String,
      required: true,
      default: '2027',
      index: true,
    },
    coordinator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      index: true,
    },
    daily_tracker_id: {
      type: Schema.Types.ObjectId,
      ref: 'DailyTracker',
      index: true,
    },
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ActiveLeadSchema.index({ company_name: 1, academic_year: 1, is_deleted: 1 });

export const ActiveLead: Model<IActiveLead> =
  mongoose.models.ActiveLead || mongoose.model<IActiveLead>('ActiveLead', ActiveLeadSchema);
