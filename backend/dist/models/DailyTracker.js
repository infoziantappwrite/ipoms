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
exports.DailyTracker = exports.POSITIVE_OUTCOMES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Outcomes that auto-promote to Weekly Tracker after finalization
exports.POSITIVE_OUTCOMES = [
    'jd_received',
    'hiring',
    'invite_mail',
    'drive_completed',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const DailyTrackerSchema = new mongoose_1.Schema({
    // ── Ownership
    coordinator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Coordinator is required'],
        index: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        required: [true, 'College context is required'],
        index: true,
    },
    // ── Company fields (denormalized at load time)
    company_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CompanyMetadata',
        required: [true, 'Source company is required'],
        index: true,
    },
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    hr_name: {
        type: String,
        required: [true, 'HR name is required'],
        trim: true,
    },
    mobile_number: {
        type: String,
        required: [true, 'Mobile number is mandatory per spec'],
        trim: true,
    },
    email_id: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    // ── Date dimensions (integer for fast aggregation)
    year: {
        type: Number,
        required: true,
        index: true,
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
        index: true,
    },
    day: {
        type: Number,
        required: true,
        min: 1,
        max: 31,
    },
    session_date: {
        type: Date,
        required: true,
        index: true,
    },
    // ── Time tracking (Spec Section 10)
    call_start_time: {
        type: Date,
        default: null,
    },
    call_end_time: {
        type: Date,
        default: null,
    },
    duration_seconds: {
        type: Number,
        default: null,
        min: 0,
    },
    // ── Outcome (Spec Section 12 — 12 Standard Outcomes)
    outcome_status: {
        type: String,
        enum: [
            'jd_received',
            'hiring_freezed',
            'hiring_completed',
            'call_back',
            'hiring',
            'invite_mail',
            'not_hiring',
            'no_response',
            'follow_up',
            'in_connect',
            'invalid',
            'drive_completed',
        ],
        default: null,
        index: true,
    },
    follow_up_month: {
        type: String,
        enum: [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
            null,
        ],
        default: null,
        trim: true,
    },
    follow_up_date: {
        type: Date,
        default: null,
    },
    // ── Notes
    comments: {
        type: String,
        trim: true,
        default: '',
    },
    // ── State flags
    is_skipped: {
        type: Boolean,
        default: false,
        index: true,
    },
    is_promoted_to_weekly: {
        type: Boolean,
        default: false,
        index: true,
    },
    is_finalized: {
        type: Boolean,
        default: false,
        index: true,
    },
    // ── Save tracking
    save_count: {
        type: Number,
        default: 0,
        min: 0,
    },
    last_saved_at: {
        type: Date,
        default: null,
    },
    // ── Duplicate guard
    duplicate_acknowledged: {
        type: Boolean,
        default: false,
    },
}, {
    collection: 'daily_tracker',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes (Spec: Section 6.1 of Implementation Plan) ─────────────
// PRIMARY: Fast load of a coordinator's entries for a specific month
DailyTrackerSchema.index({ coordinator_id: 1, year: 1, month: 1 });
// SECONDARY: College-level monthly reporting
DailyTrackerSchema.index({ college_id: 1, year: 1, month: 1 });
// TERTIARY: Load today's tracker entries quickly
DailyTrackerSchema.index({ coordinator_id: 1, session_date: 1 });
// QUATERNARY: Find positive-outcome rows pending promotion to Weekly Tracker
DailyTrackerSchema.index({ outcome_status: 1, is_promoted_to_weekly: 1 });
// QUINARY: Finalization sweep — find all unfinalized rows for midnight job
DailyTrackerSchema.index({ is_finalized: 1, session_date: 1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.DailyTracker = mongoose_1.default.model('DailyTracker', DailyTrackerSchema);
