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
exports.WeeklyTracker = exports.PIPELINE_SECTIONS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.PIPELINE_SECTIONS = [
    'pipeline',
    'in_progress',
    'completed',
    'top_companies',
    'rejected_by_hr',
    'rejected_by_college',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const WeeklyTrackerSchema = new mongoose_1.Schema({
    // Context & Ownership
    academic_year: {
        type: Number,
        required: true,
        default: 2026,
        index: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        required: [true, 'College context is required'],
        index: true,
    },
    coordinator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Coordinator reference is required'],
        index: true,
    },
    company_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CompanyMetadata',
        required: [true, 'Company reference is required'],
        index: true,
    },
    daily_tracker_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DailyTracker',
        default: null,
        index: true,
    },
    // Company Details
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        index: true,
    },
    job_role: {
        type: String,
        required: [true, 'Job role is required'],
        trim: true,
        default: 'Graduate Trainee',
    },
    cdc_reference: {
        type: String,
        trim: true,
        default: '',
    },
    company_type: {
        type: String,
        trim: true,
        default: 'Software / IT',
    },
    ctc_lpa: {
        type: String,
        trim: true,
        default: '',
    },
    eligible_batch: {
        type: String,
        trim: true,
        default: '2026 Batch',
    },
    // Pipeline Section & State
    pipeline_section: {
        type: String,
        enum: exports.PIPELINE_SECTIONS,
        default: 'pipeline',
        index: true,
    },
    is_pinned_top: {
        type: Boolean,
        default: false,
        index: true,
    },
    current_status_text: {
        type: String,
        trim: true,
        default: 'Invite email sent, awaiting JD',
    },
    // Dates
    follow_up_date: {
        type: Date,
        default: null,
        index: true,
    },
    drive_date: {
        type: Date,
        default: null,
    },
    // Metrics & Counts
    registered_count: {
        type: Number,
        default: 0,
        min: 0,
    },
    shortlisted_count: {
        type: Number,
        default: 0,
        min: 0,
    },
    selected_count: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Week Reporting
    week_number: {
        type: Number,
        default: () => {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
            return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        },
        index: true,
    },
    week_start_date: {
        type: Date,
        default: null,
    },
    week_end_date: {
        type: Date,
        default: null,
    },
    // Soft delete & timestamps
    is_deleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deleted_at: {
        type: Date,
        default: null,
    },
    last_status_updated_at: {
        type: Date,
        default: Date.now,
    },
}, {
    collection: 'weekly_tracker',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes for High-Speed Lookups ─────────────────────────────────
// Primary view: College pipeline by academic year & section
WeeklyTrackerSchema.index({ college_id: 1, academic_year: 1, pipeline_section: 1, is_deleted: 1 });
// Coordinator view
WeeklyTrackerSchema.index({ coordinator_id: 1, academic_year: 1, is_deleted: 1 });
// Urgent Follow-ups view (Section 1: Follow-up Due Today)
WeeklyTrackerSchema.index({ college_id: 1, follow_up_date: 1, is_deleted: 1 });
// Top Companies index
WeeklyTrackerSchema.index({ college_id: 1, is_pinned_top: 1, is_deleted: 1 });
// Originating daily tracker deduplication index
WeeklyTrackerSchema.index({ daily_tracker_id: 1, is_deleted: 1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.WeeklyTracker = mongoose_1.default.model('WeeklyTracker', WeeklyTrackerSchema);
