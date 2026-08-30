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
exports.SystemSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SystemSettingsSchema = new mongoose_1.Schema({
    academic_year: {
        type: String,
        default: '2025-2026',
        trim: true,
    },
    season_name: {
        type: String,
        default: 'Campus Recruitment Season 2025-26',
        trim: true,
    },
    daily_calling_target: {
        type: Number,
        default: 30,
    },
    working_days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    org_name: {
        type: String,
        default: 'Infoziant Placement Operations',
        trim: true,
    },
    org_support_email: {
        type: String,
        default: 'support@infoziant.com',
        trim: true,
        lowercase: true,
    },
    org_support_phone: {
        type: String,
        default: '+91 98401 23456',
        trim: true,
    },
    theme_default: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
    },
    default_landing_page: {
        type: String,
        default: '/dashboard',
    },
    enable_email_notifications: {
        type: Boolean,
        default: true,
    },
    enable_system_notifications: {
        type: Boolean,
        default: true,
    },
    enable_dashboard_popups: {
        type: Boolean,
        default: true,
    },
    // ── Maintenance Mode (Module 10 §8) ──────────────────────────────────
    // Administrator only stayed excluded on purpose: it must always be
    // possible to log in as Administrator and switch this back off, even if
    // every other role is currently locked out.
    maintenance_mode_enabled: {
        type: Boolean,
        default: false,
    },
    maintenance_affected_roles: {
        type: [String],
        default: ['TEAM_LEADER', 'PLACEMENT_COORDINATOR'],
    },
    maintenance_reason: {
        type: String,
        default: '',
        trim: true,
    },
    maintenance_start_time: {
        type: Date,
        default: null,
    },
    maintenance_end_time: {
        type: Date,
        default: null,
    },
}, {
    collection: 'system_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
exports.SystemSettings = mongoose_1.default.model('SystemSettings', SystemSettingsSchema);
