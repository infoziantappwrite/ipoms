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
exports.DailyLead = exports.LEAD_TYPES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.LEAD_TYPES = ['positive', 'jd_received'];
// ─── Schema ──────────────────────────────────────────────────────────────────
const DailyLeadSchema = new mongoose_1.Schema({
    lead_type: {
        type: String,
        enum: exports.LEAD_TYPES,
        required: true,
        default: 'positive',
        index: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        required: [true, 'College reference is required'],
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
        default: null,
        index: true,
    },
    daily_tracker_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DailyTracker',
        default: null,
        index: true,
    },
    // Details
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
    ctc: {
        type: String,
        trim: true,
        default: '',
    },
    eligible_batch: {
        type: String,
        trim: true,
        default: '2026 Batch',
    },
    // Date & Time
    event_time: {
        type: String,
        required: [true, 'Event time is required'],
        trim: true,
        default: () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    },
    lead_date: {
        type: Date,
        required: [true, 'Lead date is required'],
        index: true,
    },
    // Remarks & Status
    remarks: {
        type: String,
        trim: true,
        default: '',
    },
    is_moved_to_jd: {
        type: Boolean,
        default: false,
        index: true,
    },
    is_finalized: {
        type: Boolean,
        default: false,
        index: true,
    },
    // Soft delete & Audit
    is_deleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deleted_at: {
        type: Date,
        default: null,
    },
    updated_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    collection: 'daily_leads',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes for High-Speed Operational Lookups ─────────────────────
// Primary view: Filter by college, date, and tab (positives vs jd_received)
DailyLeadSchema.index({ college_id: 1, lead_date: 1, lead_type: 1, is_deleted: 1 });
// Global date view across all colleges
DailyLeadSchema.index({ lead_date: 1, lead_type: 1, is_deleted: 1 });
// Coordinator audit view
DailyLeadSchema.index({ coordinator_id: 1, lead_date: 1, is_deleted: 1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.DailyLead = mongoose_1.default.model('DailyLead', DailyLeadSchema);
