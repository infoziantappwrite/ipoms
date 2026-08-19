import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ICollege extends Document {
  college_name: string;
  college_code: string;
  location?: string;
  college_website?: string;
  tpo_name?: string;
  tpo_email?: string;
  tpo_contact_mobile?: string;
  departments?: string[];
  student_strength?: number;
  nirf_ranking?: string;
  status: 'active' | 'inactive' | 'on_hold';
  assigned_coordinator_ids: Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const CollegeSchema: Schema<ICollege> = new Schema(
  {
    college_name: {
      type: String,
      required: [true, 'College name is mandatory'],
      unique: true,
      trim: true,
      index: true,
    },
    college_code: {
      type: String,
      required: [true, 'College short form / code is mandatory'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Tamil Nadu, India',
    },
    college_website: {
      type: String,
      trim: true,
      default: '',
    },
    tpo_name: {
      type: String,
      trim: true,
      default: '',
    },
    tpo_email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    tpo_contact_mobile: {
      type: String,
      trim: true,
      default: '',
    },
    departments: {
      type: [String],
      default: ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH'],
    },
    student_strength: {
      type: Number,
      default: 0,
    },
    nirf_ranking: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_hold'],
      default: 'active',
      index: true,
    },
    assigned_coordinator_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
  },
  {
    collection: 'colleges',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

CollegeSchema.index({ status: 1, college_code: 1 });

export const College: Model<ICollege> = mongoose.model<ICollege>('College', CollegeSchema);
