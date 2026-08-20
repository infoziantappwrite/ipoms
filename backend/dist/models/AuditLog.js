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
exports.AuditLog = exports.AUDIT_SEVERITIES = exports.AUDIT_ACTIONS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Immutable security audit trail — Chapter 05 §5.2.9.
 *
 * Three properties the spec calls for are enforced structurally rather than by
 * convention:
 *   - `updatedAt: false` and no update/delete route, so entries cannot be
 *     rewritten after the fact.
 *   - No TTL index, so entries are retained permanently.
 *   - `summary_message` carries status text only; passwords, hashes, and OTP
 *     values are never passed to this model (see writeAudit()).
 */
exports.AUDIT_ACTIONS = [
    'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'OTP_ISSUED',
    'OTP_VERIFIED', 'OTP_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
    'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'IMPORT', 'EXPORT',
    'PERMISSION_CHANGE', 'STATUS_CHANGE', 'VIEW_AUDIT_LOGS',
    'EXPORT_AUDIT_LOGS', 'DOWNLOAD_REPORT', 'PERMISSION_DENIED',
];
exports.AUDIT_SEVERITIES = ['info', 'warning', 'critical'];
const AuditLogSchema = new mongoose_1.Schema({
    action_type: { type: String, enum: exports.AUDIT_ACTIONS, required: true, index: true },
    result: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS', required: true, index: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: mongoose_1.Schema.Types.ObjectId, default: null, index: true },
    // Nullable: a failed login against an unknown email has no actor to name.
    performed_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    performed_by_role: { type: String, default: 'system' },
    performed_by_email: { type: String, default: '' },
    session_id: { type: String, default: null, index: true },
    module_name: { type: String, required: true, index: true },
    severity: { type: String, enum: exports.AUDIT_SEVERITIES, default: 'info', index: true },
    summary_message: { type: String, required: true },
    changes_snapshot: { type: mongoose_1.Schema.Types.Mixed, default: null },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    device_info: { type: String, default: null },
}, {
    collection: 'audit_logs',
    // Immutability: creation stamp only, and no updatedAt to imply revisability.
    timestamps: { createdAt: 'created_at', updatedAt: false },
});
AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ action_type: 1, created_at: -1 });
AuditLogSchema.index({ severity: 1, created_at: -1 });
exports.AuditLog = mongoose_1.default.model('AuditLog', AuditLogSchema);
