import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Call Outcome Enum ──────────────────────────────────────────────────────
// Spec: Module_03_Daily_Tracker_Specification_v1.0.md — Section 12
// ONLY Response 1 (Call Outcome) is recorded here.
// Response 2 / secondary lifecycle belongs EXCLUSIVELY to Weekly Tracker (Module 04).

export type CallOutcome =
  | 'no_response'
  | 'invalid'
  | 'not_hiring'
  | 'already_connected'
  | 'follow_up'
  | 'invite_mail'
  | 'drive_scheduled'
  | 'drive_in_progress'
  | 'drive_completed';

// Outcomes that auto-promote to Weekly Tracker after finalization
export const POSITIVE_OUTCOMES: CallOutcome[] = [
  'invite_mail',
  'drive_scheduled',
  'drive_in_progress',
  'drive_completed',
];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IDailyTracker extends Document {
  // Ownership
  coordinator_id: Types.ObjectId;           // FK → users
  college_id: Types.ObjectId;               // FK → colleges (context for the day's session)

  // Denormalized company fields (pre-filled from company_metadata at load time)
  // Denormalized for ultra-fast grid rendering without join on every row read
  company_id: Types.ObjectId;               // FK → company_metadata (source of truth)
  company_name: string;
  hr_name: string;
  mobile_number: string;                    // mandatory per spec
  email_id?: string;                        // optional — missing email never blocks saving

  // Date dimensions — stored as integers for O(1) indexed monthly reporting
  year: number;                             // e.g. 2026
  month: number;                            // 1–12
  day: number;                              // 1–31
  session_date: Date;                       // Full date of this call log entry (midnight UTC)

  // Time tracking (Spec Section 10)
  call_start_time?: Date;                   // Manual entry — stays editable always
  call_end_time?: Date;                     // Auto-locked when outcome selected
  duration_seconds?: number;                // Computed: end - start (in seconds)

  // Outcome (Spec Section 12) — only Response 1, no Response 2
  outcome_status?: CallOutcome;
  follow_up_date?: Date;                    // Only relevant when outcome = follow_up

  // Notes
  comments?: string;                        // Always optional

  // State flags
  is_skipped: boolean;                      // Skip = remove from today's view only, never deletes source
  is_promoted_to_weekly: boolean;           // True once positive outcome pushed to weekly_tracker
  is_finalized: boolean;                    // True after midnight auto-finalization (11:59:59 PM)

  // Save tracking (Spec Section 14)
  save_count: number;                       // Number of times Save Progress clicked
  last_saved_at?: Date;

  // Duplicate guard — tracks if a warning was already acknowledged for this row
  duplicate_acknowledged: boolean;

  // System timestamps
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const DailyTrackerSchema: Schema<IDailyTracker> = new Schema(
  {
    // ── Ownership
    coordinator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Coordinator is required'],
      index: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College context is required'],
      index: true,
    },

    // ── Company fields (denormalized at load time)
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyMetadata',
      required: [true, 'Source company is required'],
      index: true,
    },
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    hr_name: {
      type: String,
      required: [true, 'HR name is required'],
      trim: true,
    },
    mobile_number: {
      type: String,
      required: [true, 'Mobile number is mandatory per spec'],
      trim: true,
    },
    email_id: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // ── Date dimensions (integer for fast aggregation)
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    session_date: {
      type: Date,
      required: true,
      index: true,
    },

    // ── Time tracking (Spec Section 10)
    call_start_time: {
      type: Date,
      default: null,
    },
    call_end_time: {
      type: Date,
      default: null,
    },
    duration_seconds: {
      type: Number,
      default: null,
      min: 0,
    },

    // ── Outcome (Spec Section 12 — ONLY Response 1)
    outcome_status: {
      type: String,
      enum: [
        'no_response',
        'invalid',
        'not_hiring',
        'already_connected',
        'follow_up',
        'invite_mail',
        'drive_scheduled',
        'drive_in_progress',
        'drive_completed',
      ],
      default: null,
      index: true,
    },
    follow_up_date: {
      type: Date,
      default: null,
    },

    // ── Notes
    comments: {
      type: String,
      trim: true,
      default: '',
    },

    // ── State flags
    is_skipped: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_promoted_to_weekly: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_finalized: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ── Save tracking
    save_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_saved_at: {
      type: Date,
      default: null,
    },

    // ── Duplicate guard
    duplicate_acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'daily_tracker',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes (Spec: Section 6.1 of Implementation Plan) ─────────────

// PRIMARY: Fast load of a coordinator's entries for a specific month
DailyTrackerSchema.index({ coordinator_id: 1, year: 1, month: 1 });

// SECONDARY: College-level monthly reporting
DailyTrackerSchema.index({ college_id: 1, year: 1, month: 1 });

// TERTIARY: Load today's tracker entries quickly
DailyTrackerSchema.index({ coordinator_id: 1, session_date: 1 });

// QUATERNARY: Find positive-outcome rows pending promotion to Weekly Tracker
DailyTrackerSchema.index({ outcome_status: 1, is_promoted_to_weekly: 1 });

// QUINARY: Finalization sweep — find all unfinalized rows for midnight job
DailyTrackerSchema.index({ is_finalized: 1, session_date: 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const DailyTracker: Model<IDailyTracker> = mongoose.model<IDailyTracker>(
  'DailyTracker',
  DailyTrackerSchema
);
