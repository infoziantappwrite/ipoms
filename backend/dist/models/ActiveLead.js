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
exports.ActiveLead = exports.ACADEMIC_YEARS = exports.FOLLOWUP_MONTHS = exports.ACTIVE_LEAD_STATUSES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.ACTIVE_LEAD_STATUSES = ['Hiring', 'Invite Email', 'Follow Up'];
// ─── Followup Months (12 Calendar Months) ────────────────────────────────────
exports.FOLLOWUP_MONTHS = [
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
];
// ─── Academic Years (2026 to 2035) ───────────────────────────────────────────
exports.ACADEMIC_YEARS = [
    '2026',
    '2027',
    '2028',
    '2029',
    '2030',
    '2031',
    '2032',
    '2033',
    '2034',
    '2035',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const ActiveLeadSchema = new mongoose_1.Schema({
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        index: true,
    },
    role: {
        type: String,
        trim: true,
        default: 'Graduate Trainee',
    },
    ctc: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: [...exports.ACTIVE_LEAD_STATUSES, 'Not Hiring'],
        required: true,
        default: 'Hiring',
        index: true,
    },
    followup_month: {
        type: String,
        default: '',
    },
    academic_year: {
        type: String,
        enum: exports.ACADEMIC_YEARS,
        required: true,
        default: '2026',
        index: true,
    },
    coordinator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        index: true,
    },
    daily_tracker_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DailyTracker',
        index: true,
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
ActiveLeadSchema.index({ company_name: 1, academic_year: 1, is_deleted: 1 });
exports.ActiveLead = mongoose_1.default.models.ActiveLead || mongoose_1.default.model('ActiveLead', ActiveLeadSchema);
