import mongoose, { Document, Schema, Model, Types } from 'mongoose';

/**
 * Immutable security audit trail — Chapter 05 §5.2.9.
 *
 * Three properties the spec calls for are enforced structurally rather than by
 * convention:
 *   - `updatedAt: false` and no update/delete route, so entries cannot be
 *     rewritten after the fact.
 *   - No TTL index, so entries are retained permanently.
 *   - `summary_message` carries status text only; passwords, hashes, and OTP
 *     values are never passed to this model (see writeAudit()).
 */

export const AUDIT_ACTIONS = [
  'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'OTP_ISSUED',
  'OTP_VERIFIED', 'OTP_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
  'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'IMPORT', 'EXPORT',
  'PERMISSION_CHANGE', 'STATUS_CHANGE', 'VIEW_AUDIT_LOGS',
  'EXPORT_AUDIT_LOGS', 'DOWNLOAD_REPORT', 'PERMISSION_DENIED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export interface IAuditLog extends Document {
  action_type: AuditAction;
  result: 'SUCCESS' | 'FAILED';
  entity_type: string;
  entity_id?: Types.ObjectId | null;
  performed_by?: Types.ObjectId | null;
  performed_by_role: string;
  performed_by_email?: string;
  session_id?: string | null;
  module_name: string;
  severity: AuditSeverity;
  summary_message: string;
  changes_snapshot?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: string | null;
  created_at: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    action_type: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    result: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS', required: true, index: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: Schema.Types.ObjectId, default: null, index: true },

    // Nullable: a failed login against an unknown email has no actor to name.
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    performed_by_role: { type: String, default: 'system' },
    performed_by_email: { type: String, default: '' },

    session_id: { type: String, default: null, index: true },
    module_name: { type: String, required: true, index: true },
    severity: { type: String, enum: AUDIT_SEVERITIES, default: 'info', index: true },
    summary_message: { type: String, required: true },
    changes_snapshot: { type: Schema.Types.Mixed, default: null },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    device_info: { type: String, default: null },
  },
  {
    collection: 'audit_logs',
    // Immutability: creation stamp only, and no updatedAt to imply revisability.
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ action_type: 1, created_at: -1 });
AuditLogSchema.index({ severity: 1, created_at: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
