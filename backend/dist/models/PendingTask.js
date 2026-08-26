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
exports.PendingTask = exports.DB_SHARED_STATUSES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.DB_SHARED_STATUSES = [
    'Shared',
    'Pending',
    'In Progress',
    'Not Shared',
    'Under Review',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const PendingTaskSchema = new mongoose_1.Schema({
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
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        index: true,
    },
    company_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CompanyMetadata',
        default: null,
        index: true,
    },
    serial_no: {
        type: Number,
        default: 1,
        index: true,
    },
    jd_received_date: {
        type: Date,
        default: null,
    },
    db_shared_date: {
        type: Date,
        default: null,
    },
    db_shared_status: {
        type: String,
        default: 'Pending',
        trim: true,
        index: true,
    },
    current_status: {
        type: String,
        default: 'JD Received',
        trim: true,
    },
    next_status: {
        type: String,
        default: '',
        trim: true,
    },
    action_to_be_taken: {
        type: String,
        required: [true, 'Action to be taken is required'],
        trim: true,
    },
    drive_date: {
        type: Date,
        default: null,
    },
    remarks: {
        type: String,
        default: '',
        trim: true,
    },
    is_completed: {
        type: Boolean,
        default: false,
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
    updated_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    collection: 'pending_tasks',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes for High-Speed Operational Lookups ─────────────────────
// Primary view: Filter tasks by college and deletion status
PendingTaskSchema.index({ college_id: 1, is_deleted: 1, serial_no: 1 });
// Filter tasks by coordinator and college
PendingTaskSchema.index({ coordinator_id: 1, college_id: 1, is_deleted: 1 });
// Query by DB shared status and drive date
PendingTaskSchema.index({ college_id: 1, db_shared_status: 1, is_deleted: 1 });
PendingTaskSchema.index({ college_id: 1, drive_date: 1, is_deleted: 1 });
// ─── Model Export ────────────────────────────────────────────────────────────
exports.PendingTask = mongoose_1.default.models.PendingTask ||
    mongoose_1.default.model('PendingTask', PendingTaskSchema);
