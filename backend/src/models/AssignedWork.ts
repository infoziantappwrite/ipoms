import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Priority Enums ──────────────────────────────────────────────────────────
export type AssignmentPriority = 'high' | 'medium' | 'low';
export const ASSIGNMENT_PRIORITIES: AssignmentPriority[] = ['high', 'medium', 'low'];

// ─── Lifecycle Status Enums ──────────────────────────────────────────────────
// Spec: Module_07_Role_Based_Dashboard_Specification_v1.0.md — Section 10
export type AssignmentStatus =
  | 'assigned'
  | 'received'
  | 'viewed'
  | 'loaded_to_metadata'
  | 'completed';

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'assigned',
  'received',
  'viewed',
  'loaded_to_metadata',
  'completed',
];

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IAssignedWork extends Document {
  sender_tl_id: Types.ObjectId;             // Team Leader who assigned the task
  assigned_to_coordinator_id: Types.ObjectId;// Coordinator receiving the task
  college_id: Types.ObjectId;               // Target College

  company_name: string;
  hr_name?: string;
  hr_mobile?: string;
  hr_email?: string;
  task_description: string;

  priority: AssignmentPriority;
  status: AssignmentStatus;

  is_loaded_to_metadata: boolean;
  is_completed: boolean;
  completed_at?: Date | null;

  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const AssignedWorkSchema: Schema<IAssignedWork> = new Schema(
  {
    sender_tl_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender Team Leader reference is required'],
      index: true,
    },
    assigned_to_coordinator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned Coordinator reference is required'],
      index: true,
    },
    college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'Target College reference is required'],
      index: true,
    },

    company_name: {
      type: String,
      required: [true, 'Company name is mandatory'],
      trim: true,
      index: true,
    },
    hr_name: {
      type: String,
      trim: true,
      default: '',
    },
    hr_mobile: {
      type: String,
      trim: true,
      default: '',
    },
    hr_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    task_description: {
      type: String,
      required: [true, 'Task instructions are mandatory'],
      trim: true,
    },

    priority: {
      type: String,
      enum: ASSIGNMENT_PRIORITIES,
      default: 'high',
      index: true,
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'assigned',
      index: true,
    },

    is_loaded_to_metadata: {
      type: Boolean,
      default: false,
    },
    is_completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completed_at: {
      type: Date,
      default: null,
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
    collection: 'assigned_work',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes ────────────────────────────────────────────────────────
AssignedWorkSchema.index({ assigned_to_coordinator_id: 1, is_completed: 1, priority: 1, created_at: -1 });
AssignedWorkSchema.index({ sender_tl_id: 1, is_completed: 1, created_at: -1 });
AssignedWorkSchema.index({ college_id: 1, is_completed: 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const AssignedWork: Model<IAssignedWork> = mongoose.model<IAssignedWork>(
  'AssignedWork',
  AssignedWorkSchema
);
