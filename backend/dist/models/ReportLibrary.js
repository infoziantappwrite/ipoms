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
exports.ReportLibrary = exports.REPORT_THEMES = exports.REPORT_TEMPLATE_TYPES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.REPORT_TEMPLATE_TYPES = [
    'weekly_placement',
    'monthly_placement',
    'college_performance',
    'coordinator_performance',
];
exports.REPORT_THEMES = ['blue', 'green', 'purple', 'college_branded'];
// ─── Schema ──────────────────────────────────────────────────────────────────
const ReportLibrarySchema = new mongoose_1.Schema({
    template_type: {
        type: String,
        enum: exports.REPORT_TEMPLATE_TYPES,
        required: true,
        index: true,
    },
    preset_name: {
        type: String,
        required: [true, 'Preset name is required'],
        trim: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        default: null,
        index: true,
    },
    coordinator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Coordinator reference is required'],
        index: true,
    },
    academic_year: {
        type: String,
        required: true,
        default: '2026',
        index: true,
    },
    // Filter configuration
    filters: {
        academic_year: { type: String, default: '2026' },
        college_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'College', default: null },
        coordinator_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
        date_from: { type: Date, default: null },
        date_to: { type: Date, default: null },
        week_number: { type: Number, default: null },
        month: { type: String, default: null },
    },
    // Section inclusion toggles
    included_sections: {
        kpi_summary: { type: Boolean, default: true },
        completed_companies: { type: Boolean, default: true },
        in_progress: { type: Boolean, default: true },
        pipeline: { type: Boolean, default: true },
        charts: { type: Boolean, default: true },
        insights: { type: Boolean, default: true },
        remarks: { type: Boolean, default: true },
    },
    custom_remarks: {
        type: String,
        trim: true,
        default: '',
    },
    theme: {
        type: String,
        enum: exports.REPORT_THEMES,
        default: 'blue',
    },
    // Soft delete
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
    collection: 'report_library',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes ────────────────────────────────────────────────────────
ReportLibrarySchema.index({ template_type: 1, college_id: 1, is_deleted: 1 });
ReportLibrarySchema.index({ coordinator_id: 1, is_deleted: 1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.ReportLibrary = mongoose_1.default.model('ReportLibrary', ReportLibrarySchema);
