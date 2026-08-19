import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRole extends Document {
  role_code: string;
  role_name: string;
  description: string;
  status: 'active' | 'inactive';
  is_system_role: boolean;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

const RoleSchema: Schema<IRole> = new Schema(
  {
    role_code: {
      type: String,
      required: [true, 'Role code is mandatory'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    role_name: {
      type: String,
      required: [true, 'Role name is mandatory'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    is_system_role: {
      type: Boolean,
      default: false,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    collection: 'roles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Role: Model<IRole> = mongoose.model<IRole>('Role', RoleSchema);
