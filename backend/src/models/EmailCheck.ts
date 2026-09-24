import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * One row per coordinator per (IST) day: "did you send all the emails for your positives?".
 * Deliberately a separate collection - it never touches Daily Tracker / Daily Leads / users.
 */
export interface IEmailCheck extends Document {
  coordinator_id: Types.ObjectId;
  check_date: string;                    // IST day the positives belong to, 'YYYY-MM-DD'
  status: 'pending' | 'yes' | 'no';      // 'no' behaves like "closed" - the reminder keeps coming
  prompts: number;                       // evening prompts already shown for this day (max 2)
  last_moment: number;                   // index of the last scheduled evening moment used (-1 = none)
  last_prompt_at?: Date;
  answered_at?: Date;
  answered_kind?: 'evening' | 'next_day';
  next_day_prompted_on?: string;         // IST day on which the "yesterday" question was asked
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
    answered_kind: { type: String, enum: ['evening', 'next_day'] },
    next_day_prompted_on: { type: String },
  },
  { collection: 'email_checks', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
EmailCheckSchema.index({ coordinator_id: 1, check_date: 1 }, { unique: true });

export const EmailCheck: Model<IEmailCheck> =
  (mongoose.models.EmailCheck as Model<IEmailCheck>) || mongoose.model<IEmailCheck>('EmailCheck', EmailCheckSchema);
