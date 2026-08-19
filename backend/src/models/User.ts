import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IUser extends Document {
  full_name: string;
  username: string;
  official_email: string;
  personal_email?: string;
  employee_id?: string;
  password_hash: string;
  primary_mobile?: string;
  secondary_mobile?: string;
  profile_photo_url?: string;
  account_status: 'active' | 'inactive' | 'blocked' | 'deactivated';
  presence_status: 'available' | 'busy' | 'be_right_back' | 'away' | 'appear_offline' | 'out_of_office';
  role_ids: Types.ObjectId[];
  role_codes: string[];
  assigned_college_ids: Types.ObjectId[];
  is_email_verified: boolean;
  must_change_password: boolean;
  last_login_at?: Date | null;
  last_password_changed_at?: Date | null;
  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    full_name: {
      type: String,
      required: [true, 'Display name is mandatory'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is mandatory'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    official_email: {
      type: String,
      required: [true, 'Official email is mandatory'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    personal_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    employee_id: {
      type: String,
      trim: true,
      default: '',
    },
    password_hash: {
      type: String,
      required: [true, 'Password hash is mandatory'],
    },
    primary_mobile: {
      type: String,
      trim: true,
      default: '',
    },
    secondary_mobile: {
      type: String,
      trim: true,
      default: '',
    },
    profile_photo_url: {
      type: String,
      default: '',
    },
    account_status: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'deactivated'],
      default: 'active',
      index: true,
    },
    presence_status: {
      type: String,
      enum: ['available', 'busy', 'be_right_back', 'away', 'appear_offline', 'out_of_office'],
      default: 'available',
      index: true,
    },
    role_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        index: true,
      },
    ],
    role_codes: {
      type: [String],
      default: [],
      index: true,
    },
    assigned_college_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: 'College',
        index: true,
      },
    ],
    is_email_verified: {
      type: Boolean,
      default: true,
    },
    must_change_password: {
      type: Boolean,
      default: false,
    },
    last_login_at: {
      type: Date,
      default: null,
    },
    last_password_changed_at: {
      type: Date,
      default: null,
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
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSchema.index({ official_email: 1, account_status: 1 });
UserSchema.index({ role_codes: 1, account_status: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
