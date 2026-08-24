import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── DB Shared Status Options ────────────────────────────────────────────────
export type DbSharedStatus = 'Shared' | 'Pending' | 'In Progress' | 'Not Shared' | 'Under Review';

export const DB_SHARED_STATUSES: DbSharedStatus[] = [
  'Shared',
  'Pending',
  'In Progress',
  'Not Shared',
  'Under Review',
];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IPendingTask extends Document {
  college_id: Types.ObjectId;               // FK → colleges
  coordinator_id: Types.ObjectId;           // FK → users (assigned coordinator)
  company_name: string;                     // Company name
  company_id?: Types.ObjectId;              // Optional FK → company_metadata
  serial_no: number;                        // Sequential S.No per college

  // Dates & Statuses
  jd_received_date?: Date | null;           // JD Received Date
  db_shared_date?: Date | null;             // DB Shared Date
  db_shared_status: string;                 // DB Shared Status ('Shared', 'Pending', etc.)
  current_status: string;                   // Current operational status
  next_status: string;                      // Next status / follow-up milestone
  action_to_be_taken: string;               // Action required / to be followed
  drive_date?: Date | null;                 // Scheduled campus drive date

  remarks?: string;                         // Additional notes / comments
  is_completed: boolean;                    // Completion status
  is_deleted: boolean;                      // Soft delete flag
  deleted_at?: Date | null;
  updated_by?: Types.ObjectId;              // Last editor FK → users
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const PendingTaskSchema: Schema<IPendingTask> = new Schema(
  {
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
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyMetadata',
      default: null,
      index: true,
    },
    serial_no: {
      type: Number,
      default: 1,
      index: true,
    },
    jd_received_date: {
      type: Date,
      default: null,
    },
    db_shared_date: {
      type: Date,
      default: null,
    },
    db_shared_status: {
      type: String,
      default: 'Pending',
      trim: true,
      index: true,
    },
    current_status: {
      type: String,
      default: 'JD Received',
      trim: true,
    },
    next_status: {
      type: String,
      default: '',
      trim: true,
    },
    action_to_be_taken: {
      type: String,
      required: [true, 'Action to be taken is required'],
      trim: true,
    },
    drive_date: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    is_completed: {
      type: Boolean,
      default: false,
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
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'pending_tasks',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes for High-Speed Operational Lookups ─────────────────────

// Primary view: Filter tasks by college and deletion status
PendingTaskSchema.index({ college_id: 1, is_deleted: 1, serial_no: 1 });

// Filter tasks by coordinator and college
PendingTaskSchema.index({ coordinator_id: 1, college_id: 1, is_deleted: 1 });

// Query by DB shared status and drive date
PendingTaskSchema.index({ college_id: 1, db_shared_status: 1, is_deleted: 1 });
PendingTaskSchema.index({ college_id: 1, drive_date: 1, is_deleted: 1 });

// ─── Model Export ────────────────────────────────────────────────────────────

export const PendingTask: Model<IPendingTask> =
  mongoose.models.PendingTask ||
  mongoose.model<IPendingTask>('PendingTask', PendingTaskSchema);
