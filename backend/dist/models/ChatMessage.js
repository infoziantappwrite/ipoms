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
exports.ChatMessage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ChatMessageSchema = new mongoose_1.Schema({
    conversation_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ChatConversation',
        required: true,
        index: true,
    },
    sender_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    sender_name: {
        type: String,
        required: true,
        trim: true,
    },
    sender_role: {
        type: String,
        default: 'Placement Coordinator',
    },
    sender_photo_url: {
        type: String,
        default: '',
    },
    message_text: {
        type: String,
        required: true,
        trim: true,
    },
    message_type: {
        type: String,
        enum: ['text', 'doubt', 'announcement', 'lead_tag', 'system'],
        default: 'text',
    },
    reply_to: {
        message_id: { type: String },
        sender_name: { type: String },
        message_text: { type: String },
    },
    reactions: [
        {
            emoji: { type: String, required: true },
            user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            user_name: { type: String },
        },
    ],
    metadata: {
        college_code: { type: String, trim: true },
        college_name: { type: String, trim: true },
        lead_id: { type: String, trim: true },
        tag: { type: String, trim: true },
        urgency: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    },
    read_by: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    deleted_for_users: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    is_pinned: {
        type: Boolean,
        default: false,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
ChatMessageSchema.index({ conversation_id: 1, created_at: -1 });
exports.ChatMessage = mongoose_1.default.models.ChatMessage ||
    mongoose_1.default.model('ChatMessage', ChatMessageSchema);
