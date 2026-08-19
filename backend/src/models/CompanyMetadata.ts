import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICompanyMetadata extends Document {
  serial_number?: number;
  company_name: string;
  hr_name?: string;
  hr_designation?: string;
  primary_mobile?: string;
  mobile_numbers: string[];
  primary_email?: string;
  email_ids: string[];
  company_type?: string;
  cin_or_gstin?: string;
  industry_sector?: string;
  website_url?: string;
  headquarters_location?: string;
  notes?: string;
  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const CompanyMetadataSchema: Schema<ICompanyMetadata> = new Schema(
  {
    serial_number: {
      type: Number,
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
      index: true,
      default: '',
    },
    hr_designation: {
      type: String,
      trim: true,
      default: '',
    },
    primary_mobile: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    mobile_numbers: {
      type: [String],
      default: [],
      index: true,
    },
    primary_email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    email_ids: {
      type: [String],
      default: [],
      lowercase: true,
      index: true,
    },
    company_type: {
      type: String,
      enum: [
        'software',
        'it_services',
        'product',
        'bpo',
        'banking',
        'finance',
        'ai',
        'edtech',
        'pharma',
        'medical',
        'core_engineering',
        'construction',
        'consulting',
        'other',
      ],
      default: 'other',
      index: true,
    },
    cin_or_gstin: {
      type: String,
      trim: true,
      default: '',
    },
    industry_sector: {
      type: String,
      trim: true,
      default: '',
    },
    website_url: {
      type: String,
      trim: true,
      default: '',
    },
    headquarters_location: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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
    collection: 'company_metadata',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// High-speed compound search indexes
CompanyMetadataSchema.index({ company_name: 'text', hr_name: 'text' });
CompanyMetadataSchema.index({ company_name: 1, primary_mobile: 1 });
CompanyMetadataSchema.index({ company_name: 1, primary_email: 1 });
CompanyMetadataSchema.index({ is_deleted: 1, company_name: 1 });

export const CompanyMetadata: Model<ICompanyMetadata> = mongoose.model<ICompanyMetadata>(
  'CompanyMetadata',
  CompanyMetadataSchema
);
