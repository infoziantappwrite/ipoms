import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ICollege extends Document {
  college_name: string;
  college_code: string;
  location?: string;
  college_website?: string;
  logo_url?: string;
  tpo_name?: string;
  tpo_email?: string;
  tpo_contact_mobile?: string;
  tpo_designation?: string;
  tpo_alternate_mobile?: string;
  tpo_alternate_email?: string;
  departments?: string[];
  student_strength?: number;
  nirf_ranking?: string;
  highest_package_lpa?: string;
  average_package_lpa?: string;
  lowest_package_lpa?: string;
  established_year?: string;
  landmarks?: string;
  address?: string;
  map_location?: string;
  accreditations?: string;
  placement_notes?: string;
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
    logo_url: {
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
    tpo_designation: {
      type: String,
      trim: true,
      default: 'Head - Placements & Corporate Relations',
    },
    tpo_alternate_mobile: {
      type: String,
      trim: true,
      default: '',
    },
    tpo_alternate_email: {
      type: String,
      trim: true,
      lowercase: true,
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
      trim: true,
      default: '',
    },
    highest_package_lpa: {
      type: String,
      trim: true,
      default: '',
    },
    average_package_lpa: {
      type: String,
      trim: true,
      default: '',
    },
    lowest_package_lpa: {
      type: String,
      trim: true,
      default: '',
    },
    established_year: {
      type: String,
      trim: true,
      default: '',
    },
    landmarks: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    map_location: {
      type: String,
      trim: true,
      default: '',
    },
    accreditations: {
      type: String,
      trim: true,
      default: '',
    },
    placement_notes: {
      type: String,
      trim: true,
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
