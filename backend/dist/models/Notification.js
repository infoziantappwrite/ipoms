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
exports.Notification = exports.NOTIFICATION_ICON_TYPES = exports.NOTIFICATION_PRIORITIES = exports.AUDIENCE_TYPES = exports.SENDER_ROLES = exports.NOTIFICATION_TYPES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.NOTIFICATION_TYPES = [
    'announcement',
    'assignment',
    'reminder',
    'meeting',
    'system_alert',
    'system_update',
];
exports.SENDER_ROLES = ['ceo', 'director', 'team_leader', 'system'];
exports.AUDIENCE_TYPES = [
    'everyone',
    'individual',
    'role_group',
    'college_group',
];
exports.NOTIFICATION_PRIORITIES = ['high', 'medium', 'low'];
exports.NOTIFICATION_ICON_TYPES = [
    'announcement',
    'warning',
    'success',
    'reminder',
    'assignment',
    'maintenance',
];
// ─── Schema ──────────────────────────────────────────────────────────────────
const RecipientStatusSchema = new mongoose_1.Schema({
    user_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
    },
    read_at: {
        type: Date,
        default: null,
    },
    response: {
        type: String,
        enum: ['acknowledged', 'will_attend', 'cannot_attend'],
        default: null,
    },
    responded_at: {
        type: Date,
        default: null,
    },
}, { _id: false });
const NotificationSchema = new mongoose_1.Schema({
    notification_type: {
        type: String,
        enum: exports.NOTIFICATION_TYPES,
        required: true,
        default: 'announcement',
        index: true,
    },
    sender_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    sender_role: {
        type: String,
        enum: exports.SENDER_ROLES,
        required: true,
        index: true,
    },
    audience_type: {
        type: String,
        enum: exports.AUDIENCE_TYPES,
        default: 'everyone',
        index: true,
    },
    target_user_ids: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
        index: true,
    },
    target_college_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'College',
        default: null,
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
    },
    icon_type: {
        type: String,
        enum: exports.NOTIFICATION_ICON_TYPES,
        default: 'announcement',
    },
    priority: {
        type: String,
        enum: exports.NOTIFICATION_PRIORITIES,
        default: 'medium',
        index: true,
    },
    action_url: {
        type: String,
        trim: true,
        default: null,
    },
    attachment_url: {
        type: String,
        trim: true,
        default: null,
    },
    expires_at: {
        type: Date,
        default: null,
        index: true,
    },
    requires_acknowledgment: {
        type: Boolean,
        default: false,
    },
    recipient_statuses: {
        type: [RecipientStatusSchema],
        default: [],
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
    collection: 'notifications',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
// ─── Compound Indexes ────────────────────────────────────────────────────────
NotificationSchema.index({ audience_type: 1, target_college_id: 1, is_deleted: 1, created_at: -1 });
NotificationSchema.index({ sender_id: 1, is_deleted: 1 });
NotificationSchema.index({ 'recipient_statuses.user_id': 1, created_at: -1 });
// ─── Model ───────────────────────────────────────────────────────────────────
exports.Notification = mongoose_1.default.model('Notification', NotificationSchema);
