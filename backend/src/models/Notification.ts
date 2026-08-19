import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ─── Notification Enums ──────────────────────────────────────────────────────
// Spec: Chapter 05 Database Engineering & API Specifications — Section 5.2.8
export type NotificationType =
  | 'announcement'
  | 'assignment'
  | 'reminder'
  | 'meeting'
  | 'system_alert'
  | 'system_update';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'announcement',
  'assignment',
  'reminder',
  'meeting',
  'system_alert',
  'system_update',
];

export type SenderRole = 'ceo' | 'director' | 'team_leader' | 'system';
export const SENDER_ROLES: SenderRole[] = ['ceo', 'director', 'team_leader', 'system'];

export type AudienceType = 'everyone' | 'individual' | 'role_group' | 'college_group';
export const AUDIENCE_TYPES: AudienceType[] = [
  'everyone',
  'individual',
  'role_group',
  'college_group',
];

export type NotificationPriority = 'high' | 'medium' | 'low';
export const NOTIFICATION_PRIORITIES: NotificationPriority[] = ['high', 'medium', 'low'];

export type NotificationIconType =
  | 'announcement'
  | 'warning'
  | 'success'
  | 'reminder'
  | 'assignment'
  | 'maintenance';

export const NOTIFICATION_ICON_TYPES: NotificationIconType[] = [
  'announcement',
  'warning',
  'success',
  'reminder',
  'assignment',
  'maintenance',
];

export type RecipientStatusEnum = 'sent' | 'delivered' | 'read';
export type RecipientResponseEnum = 'acknowledged' | 'will_attend' | 'cannot_attend';

// ─── Per-User Recipient Tracking Subdocument ─────────────────────────────────
export interface IRecipientStatus {
  user_id: Types.ObjectId;
  status: RecipientStatusEnum;
  read_at?: Date | null;
  response?: RecipientResponseEnum | null;
  responded_at?: Date | null;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface INotification extends Document {
  notification_type: NotificationType;
  sender_id: Types.ObjectId;
  sender_role: SenderRole;

  audience_type: AudienceType;
  target_user_ids: Types.ObjectId[];
  target_college_id?: Types.ObjectId | null;

  title: string;
  message: string;
  icon_type: NotificationIconType;
  priority: NotificationPriority;

  action_url?: string | null;
  attachment_url?: string | null;
  expires_at?: Date | null;
  requires_acknowledgment: boolean;

  recipient_statuses: IRecipientStatus[];

  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const RecipientStatusSchema = new Schema<IRecipientStatus>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    read_at: {
      type: Date,
      default: null,
    },
    response: {
      type: String,
      enum: ['acknowledged', 'will_attend', 'cannot_attend'],
      default: null,
    },
    responded_at: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const NotificationSchema: Schema<INotification> = new Schema(
  {
    notification_type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      default: 'announcement',
      index: true,
    },
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender_role: {
      type: String,
      enum: SENDER_ROLES,
      required: true,
      index: true,
    },

    audience_type: {
      type: String,
      enum: AUDIENCE_TYPES,
      default: 'everyone',
      index: true,
    },
    target_user_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
    target_college_id: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    icon_type: {
      type: String,
      enum: NOTIFICATION_ICON_TYPES,
      default: 'announcement',
    },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: 'medium',
      index: true,
    },

    action_url: {
      type: String,
      trim: true,
      default: null,
    },
    attachment_url: {
      type: String,
      trim: true,
      default: null,
    },
    expires_at: {
      type: Date,
      default: null,
      index: true,
    },
    requires_acknowledgment: {
      type: Boolean,
      default: false,
    },

    recipient_statuses: {
      type: [RecipientStatusSchema],
      default: [],
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
    collection: 'notifications',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// ─── Compound Indexes ────────────────────────────────────────────────────────
NotificationSchema.index({ audience_type: 1, target_college_id: 1, is_deleted: 1, created_at: -1 });
NotificationSchema.index({ sender_id: 1, is_deleted: 1 });
NotificationSchema.index({ 'recipient_statuses.user_id': 1, created_at: -1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
