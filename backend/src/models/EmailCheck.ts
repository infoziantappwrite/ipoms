import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * One row per coordinator per (IST) day: "did you send all the emails for your positives?".
 * Deliberately a separate collection - it never touches Daily Tracker / Daily Leads / users.
 */
export interface IEmailCheck extends Document {
  coordinator_id: Types.ObjectId;
  check_date: string;                    // IST day the positives belong to, 'YYYY-MM-DD'
  status: 'pending' | 'yes' | 'no';      // 'no' behaves like "closed" - the reminder comes back
  prompts: number;                       // how many times the reminder has been shown for this day
  last_moment: number;                   // legacy (fixed evening windows) - no longer used
  last_prompt_at?: Date;
  answered_at?: Date;
  answered_kind?: 'evening' | 'due' | 'next_day';
  next_day_prompted_on?: string;         // IST day on which the "yesterday" question was asked

  /** Invite Mail calls the coordinator has confirmed the email was sent for. */
  confirmed_call_ids: Types.ObjectId[];
  /** Calls they closed / said "not yet" to without choosing a time. */
  dismissed_call_ids: Types.ObjectId[];
  dismissed_at?: Date;                   // when the last such dismissal happened
  dismissals: number;                    // capped, so a dismissal is retried once and then left alone
  /** A time the coordinator picked themselves ("remind me at 6:30 PM"). */
  snooze_until?: Date;
  snooze_set_at?: Date;

  created_at: Date;
  updated_at: Date;
}

const EmailCheckSchema = new Schema<IEmailCheck>(
  {
    coordinator_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    check_date: { type: String, required: true },
    status: { type: String, enum: ['pending', 'yes', 'no'], default: 'pending' },
    prompts: { type: Number, default: 0 },
    last_moment: { type: Number, default: -1 },
    last_prompt_at: { type: Date },
    answered_at: { type: Date },
    answered_kind: { type: String, enum: ['evening', 'due', 'next_day'] },
    next_day_prompted_on: { type: String },
    confirmed_call_ids: [{ type: Schema.Types.ObjectId }],
    dismissed_call_ids: [{ type: Schema.Types.ObjectId }],
    dismissed_at: { type: Date },
    dismissals: { type: Number, default: 0 },
    snooze_until: { type: Date },
    snooze_set_at: { type: Date },
  },
  { collection: 'email_checks', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
EmailCheckSchema.index({ coordinator_id: 1, check_date: 1 }, { unique: true });

export const EmailCheck: Model<IEmailCheck> =
  (mongoose.models.EmailCheck as Model<IEmailCheck>) || mongoose.model<IEmailCheck>('EmailCheck', EmailCheckSchema);
