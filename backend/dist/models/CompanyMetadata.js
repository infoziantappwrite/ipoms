"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyMetadata = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CompanyMetadataSchema = new mongoose_1.Schema({
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
}, {
    collection: 'company_metadata',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// High-speed compound search indexes
CompanyMetadataSchema.index({ company_name: 'text', hr_name: 'text' });
CompanyMetadataSchema.index({ company_name: 1, primary_mobile: 1 });
CompanyMetadataSchema.index({ company_name: 1, primary_email: 1 });
CompanyMetadataSchema.index({ is_deleted: 1, company_name: 1 });
exports.CompanyMetadata = mongoose_1.default.model('CompanyMetadata', CompanyMetadataSchema);
