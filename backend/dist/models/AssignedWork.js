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
exports.AssignedWork = exports.ASSIGNMENT_STATUSES = exports.ASSIGNMENT_PRIORITIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.ASSIGNMENT_PRIORITIES = ['high', 'medium', 'low'];
exports.ASSIGNMENT_STATUSES = [
    'assigned',
    'received',
    'viewed',
    'loaded_to_metadata',
    'completed',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const AssignedWorkSchema = new mongoose_1.Schema({
    sender_tl_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender Team Leader reference is required'],
        index: true,
    },
    assigned_to_coordinator_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned Coordinator reference is required'],
        index: true,
    },
    college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        required: [true, 'Target College reference is required'],
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
        default: '',
    },
    hr_mobile: {
        type: String,
        trim: true,
        default: '',
    },
    hr_email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    task_description: {
        type: String,
        required: [true, 'Task instructions are mandatory'],
        trim: true,
    },
    priority: {
        type: String,
        enum: exports.ASSIGNMENT_PRIORITIES,
        default: 'high',
        index: true,
    },
    status: {
        type: String,
        enum: exports.ASSIGNMENT_STATUSES,
        default: 'assigned',
        index: true,
    },
    is_loaded_to_metadata: {
        type: Boolean,
        default: false,
    },
    is_completed: {
        type: Boolean,
        default: false,
        index: true,
    },
    completed_at: {
        type: Date,
        default: null,
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
    collection: 'assigned_work',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes ────────────────────────────────────────────────────────
AssignedWorkSchema.index({ assigned_to_coordinator_id: 1, is_completed: 1, priority: 1, created_at: -1 });
AssignedWorkSchema.index({ sender_tl_id: 1, is_completed: 1, created_at: -1 });
AssignedWorkSchema.index({ college_id: 1, is_completed: 1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.AssignedWork = mongoose_1.default.model('AssignedWork', AssignedWorkSchema);
